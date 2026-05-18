const pool = require('../db/queries');

// Formato esperado: 'HH:MM' (ex '08:00', '23:30'). NULL/vazio = sem turno =
// usuario elegivel a qualquer hora (retrocompat).

const parseHHMM = (s) => {
  if (!s || typeof s !== 'string') return null;
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  return h * 60 + mi;
};

const minutesNow = (d = new Date()) => d.getHours() * 60 + d.getMinutes();

// Resolve se o usuario esta dentro do turno NESTE momento. Suporta turno
// overnight (ex: 18:00 -> 01:00).
const isUserInShift = (user, now = new Date()) => {
  if (!user) return false;
  const start = parseHHMM(user.shift_start);
  const end = parseHHMM(user.shift_end);
  if (start === null || end === null) return true; // sem turno = sempre
  if (start === end) return true; // 0-0 ou igual = 24h
  const cur = minutesNow(now);
  if (start < end) return cur >= start && cur < end; // 08:00-18:00
  return cur >= start || cur < end; // 18:00-01:00 (overnight)
};

// Idempotente, barato. Chame antes de ler/escrever shift_*.
const ensureShiftColumns = async (schema) => {
  await pool.query(`ALTER TABLE ${schema}.users ADD COLUMN IF NOT EXISTS shift_start TEXT`);
  await pool.query(`ALTER TABLE ${schema}.users ADD COLUMN IF NOT EXISTS shift_end TEXT`);
};

// Filtra um array de objetos { id, shift_start, shift_end } pelos que estao
// dentro do turno agora.
const filterUsersInShift = (users, now = new Date()) => {
  if (!Array.isArray(users)) return [];
  return users.filter((u) => isUserInShift(u, now));
};

// Dado uma fila, devolve os user_ids que (a) sao membros da fila e (b)
// estao dentro do turno agora. Retorna ALL os user_ids da fila como
// fallback se NENHUM estiver em turno — assim leads nao ficam sem dono.
const getInShiftUserIdsForQueue = async (queueId, schema, now = new Date()) => {
  await ensureShiftColumns(schema);
  const q = await pool.query(
    `SELECT u.id, u.shift_start, u.shift_end
       FROM ${schema}.queue_users qu
       JOIN ${schema}.users u ON u.id = qu.user_id
      WHERE qu.queue_id = $1`,
    [queueId]
  );
  const all = q.rows;
  const inShift = filterUsersInShift(all, now);
  if (inShift.length > 0) return { userIds: inShift.map((u) => u.id), fallback: false };
  return { userIds: all.map((u) => u.id), fallback: true };
};

module.exports = {
  parseHHMM,
  isUserInShift,
  filterUsersInShift,
  ensureShiftColumns,
  getInShiftUserIdsForQueue,
};
