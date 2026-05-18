const pool = require('../db/queries');
const { isUserInShift, ensureShiftColumns } = require('./ShiftService');

// Reatribui automaticamente chats abertos cujo atendente esta FORA do turno
// para um atendente da mesma fila que esteja DENTRO do turno. Roda a cada
// 5min. Se o atendente atual esta em turno, nao mexe. Se ninguem esta em
// turno na fila, nao mexe (deixa pra hora que tiver alguem). Round-robin
// na escolha do proximo via tabela last_assigned_user (mesma logica de
// distribuicao do setUserChat).

const INTERVAL_MS = 5 * 60 * 1000;
let timer = null;

const scanSchema = async (schema, now = new Date()) => {
  try {
    await ensureShiftColumns(schema);

    // garante a tabela last_assigned_user (usada para round-robin)
    await pool.query(`CREATE TABLE IF NOT EXISTS ${schema}.last_assigned_user (
      queue_id UUID PRIMARY KEY,
      user_id TEXT
    )`);

    // chats abertos com algum atendente
    const chats = await pool.query(
      `SELECT c.id, c.queue_id, c.assigned_user, c.contact_phone,
              u.shift_start, u.shift_end
         FROM ${schema}.chats c
         LEFT JOIN ${schema}.users u ON u.id = c.assigned_user
        WHERE c.status <> 'closed'
          AND c.assigned_user IS NOT NULL
          AND c.queue_id IS NOT NULL`
    );
    if (chats.rowCount === 0) return;

    // agrupa por queue para nao consultar varias vezes
    const queueCache = new Map();
    const getQueueUsers = async (queueId) => {
      if (queueCache.has(queueId)) return queueCache.get(queueId);
      const r = await pool.query(
        `SELECT u.id, u.shift_start, u.shift_end
           FROM ${schema}.queue_users qu
           JOIN ${schema}.users u ON u.id = qu.user_id
          WHERE qu.queue_id = $1`,
        [queueId]
      );
      queueCache.set(queueId, r.rows);
      return r.rows;
    };

    for (const chat of chats.rows) {
      const assignee = { shift_start: chat.shift_start, shift_end: chat.shift_end };
      if (isUserInShift(assignee, now)) continue; // ainda esta no turno, ok
      const candidates = (await getQueueUsers(chat.queue_id)).filter(
        (u) => u.id !== chat.assigned_user && isUserInShift(u, now)
      );
      if (candidates.length === 0) continue;

      // round-robin: pega proximo apos o last_assigned (se houver)
      const last = await pool.query(
        `SELECT user_id FROM ${schema}.last_assigned_user WHERE queue_id = $1`,
        [chat.queue_id]
      );
      const lastUserId = last.rows[0]?.user_id;
      const idx = lastUserId ? candidates.findIndex((u) => u.id === lastUserId) : -1;
      const next = candidates[(idx + 1) % candidates.length];

      await pool.query(
        `UPDATE ${schema}.chats SET assigned_user = $1 WHERE id = $2`,
        [next.id, chat.id]
      );

      // atualiza round-robin pointer
      await pool.query(
        `INSERT INTO ${schema}.last_assigned_user(queue_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (queue_id) DO UPDATE SET user_id = EXCLUDED.user_id`,
        [chat.queue_id, next.id]
      );

      // notifica via socket: o user antigo perde, o novo recebe
      if (global.socketIoServer) {
        try {
          const updated = await pool.query(`SELECT * FROM ${schema}.chats WHERE id = $1`, [chat.id]);
          const updatedChat = updated.rows[0];
          global.socketIoServer.to(`user_${chat.assigned_user}`).emit('chatTransferred', {
            chatId: chat.id, oldUserId: chat.assigned_user, newUserId: next.id,
          });
          global.socketIoServer.to(`user_${next.id}`).emit('chats_updated', updatedChat);
        } catch (e) { /* ignore */ }
      }
    }
  } catch (err) {
    console.error(`ShiftHandoff schema ${schema} falhou:`, err.message);
  }
};

const tick = async () => {
  const now = new Date();
  try {
    const schemas = await pool.query(
      `SELECT schema_name FROM information_schema.schemata
        WHERE schema_name NOT IN ('pg_catalog','information_schema','pg_toast','public')`
    );
    for (const { schema_name } of schemas.rows) {
      await scanSchema(schema_name, now);
    }
  } catch (err) {
    console.error('ShiftHandoff tick falhou:', err.message);
  }
};

const startShiftHandoffWorker = () => {
  if (timer) return;
  timer = setInterval(tick, INTERVAL_MS);
  setTimeout(tick, 30 * 1000); // primeiro tick logo apos startup
};

module.exports = { startShiftHandoffWorker, scanSchema };
