const pool = require('../db/queries');

// Garante que a tabela existe no schema (schemas antigos podem nao ter sido
// re-provisionados). Idempotente e barato.
const ensureLeadSummariesTable = async (schema) => {
  await pool.query(`CREATE TABLE IF NOT EXISTS ${schema}.lead_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID,
    contact_phone TEXT,
    contact_name TEXT,
    summary TEXT,
    next_step TEXT,
    generated_at BIGINT,
    read_at BIGINT
  )`);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS lead_summaries_chat_idx ON ${schema}.lead_summaries(chat_id)`
  );
};

const upsertLeadSummary = async (schema, { chat_id, contact_phone, contact_name, summary, next_step }) => {
  await ensureLeadSummariesTable(schema);
  // Mantem 1 resumo por chat — substitui se ja existe.
  const existing = await pool.query(
    `SELECT id FROM ${schema}.lead_summaries WHERE chat_id = $1 LIMIT 1`,
    [chat_id]
  );
  const now = Date.now();
  if (existing.rowCount > 0) {
    const r = await pool.query(
      `UPDATE ${schema}.lead_summaries
       SET summary=$1, next_step=$2, contact_phone=$3, contact_name=$4, generated_at=$5, read_at=NULL
       WHERE chat_id=$6 RETURNING *`,
      [summary, next_step, contact_phone, contact_name, now, chat_id]
    );
    return r.rows[0];
  }
  const r = await pool.query(
    `INSERT INTO ${schema}.lead_summaries (chat_id, contact_phone, contact_name, summary, next_step, generated_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [chat_id, contact_phone, contact_name, summary, next_step, now]
  );
  return r.rows[0];
};

const getLeadSummaries = async (schema, { unreadOnly = false, limit = 50 } = {}) => {
  await ensureLeadSummariesTable(schema);
  const where = unreadOnly ? 'WHERE read_at IS NULL' : '';
  const r = await pool.query(
    `SELECT * FROM ${schema}.lead_summaries ${where} ORDER BY generated_at DESC LIMIT $1`,
    [limit]
  );
  return r.rows;
};

const markSummaryRead = async (schema, summary_id) => {
  await ensureLeadSummariesTable(schema);
  const r = await pool.query(
    `UPDATE ${schema}.lead_summaries SET read_at=$1 WHERE id=$2 RETURNING *`,
    [Date.now(), summary_id]
  );
  return r.rows[0];
};

module.exports = {
  ensureLeadSummariesTable,
  upsertLeadSummary,
  getLeadSummaries,
  markSummaryRead,
};
