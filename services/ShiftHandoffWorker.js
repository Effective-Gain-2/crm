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
    // Guard: só roda em schemas que têm a estrutura completa esperada.
    // Banco compartilha vários schemas (multi-tenant + n8n + drizzle etc) e
    // muitos não têm chats/users. Antes esses falhavam ruidosamente toda
    // execução; agora passam silenciosamente.
    const exists = await pool.query(
      `SELECT
         to_regclass($1) IS NOT NULL AS has_chats,
         to_regclass($2) IS NOT NULL AS has_users,
         to_regclass($3) IS NOT NULL AS has_queue_users`,
      [`${schema}.chats`, `${schema}.users`, `${schema}.queue_users`]
    );
    const row = exists.rows[0] || {};
    if (!row.has_chats || !row.has_users || !row.has_queue_users) return;

    await ensureShiftColumns(schema);

    // garante a tabela last_assigned_user (usada para round-robin)
    await pool.query(`CREATE TABLE IF NOT EXISTS ${schema}.last_assigned_user (
      queue_id UUID PRIMARY KEY,
      user_id TEXT
    )`);

    // chats abertos com algum atendente.
    // assigned_user é TEXT nesse schema; users.id é UUID — castamos pra text
    // pra não quebrar com "operator does not exist: uuid = text".
    const chats = await pool.query(
      `SELECT c.id, c.queue_id, c.assigned_user, c.contact_phone,
              u.shift_start, u.shift_end
         FROM ${schema}.chats c
         LEFT JOIN ${schema}.users u ON u.id::text = c.assigned_user::text
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
           JOIN ${schema}.users u ON u.id::text = qu.user_id::text
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
        (u) => String(u.id) !== String(chat.assigned_user) && isUserInShift(u, now)
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
