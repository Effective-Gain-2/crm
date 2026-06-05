const pool = require('../db/queries');
const { v4: uuidv4 } = require('uuid');
const { generateUniqueNumericId } = require('../utils/numericId');

// Garante a coluna numeric_id (id público de 11 dígitos) e faz backfill das
// linhas antigas. Padrão defensivo do projeto — migrations não rodam sozinhas.
const ensureTagColumns = async (schema) => {
  await pool.query(`ALTER TABLE ${schema}.tag ADD COLUMN IF NOT EXISTS numeric_id bigint`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS tag_numeric_id_idx ON ${schema}.tag(numeric_id)`);
  const missing = await pool.query(`SELECT id FROM ${schema}.tag WHERE numeric_id IS NULL`);
  for (const row of missing.rows) {
    const id = await generateUniqueNumericId(async (candidate) => {
      const r = await pool.query(`SELECT 1 FROM ${schema}.tag WHERE numeric_id = $1`, [candidate]);
      return r.rowCount > 0;
    });
    await pool.query(`UPDATE ${schema}.tag SET numeric_id = $1 WHERE id = $2`, [id, row.id]);
  }
};

const createTag = async (name, color, schema) => {
  await ensureTagColumns(schema);
  const numericId = await generateUniqueNumericId(async (candidate) => {
    const r = await pool.query(`SELECT 1 FROM ${schema}.tag WHERE numeric_id = $1`, [candidate]);
    return r.rowCount > 0;
  });
  const result = await pool.query(
    `INSERT INTO ${schema}.tag (id, name, color, numeric_id) VALUES ($3, $1, $2, $4) RETURNING *`,
    [name, color, uuidv4(), numericId]
  );
  return result.rows[0];
};

const getTags = async (schema) => {
  await ensureTagColumns(schema);
  const result = await pool.query(
    `SELECT * FROM ${schema}.tag`
  );
  return result.rows;
};

// Resolve uma tag por numeric_id OU uuid. Devolve a linha ou null.
const resolveTag = async (idOrNumeric, schema) => {
  await ensureTagColumns(schema);
  const raw = String(idOrNumeric || '').trim();
  if (!raw) return null;
  if (/^\d{6,}$/.test(raw)) {
    const r = await pool.query(`SELECT * FROM ${schema}.tag WHERE numeric_id = $1`, [raw]);
    if (r.rowCount > 0) return r.rows[0];
  }
  const r = await pool.query(`SELECT * FROM ${schema}.tag WHERE id::text = $1`, [raw]);
  return r.rows[0] || null;
};

const deleteTag = async (tagId, schema) => {
  await pool.query(
    `DELETE FROM ${schema}.tag WHERE id = $1`,
    [tagId]
  );
};

const addTagToChat = async (chatId, tagId, schema) => {
  await pool.query(
    `INSERT INTO ${schema}.chat_tag (chat_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [chatId, tagId]
  );
};

const removeTagFromChat = async (chatId, tagId, schema) => {
  await pool.query(
    `DELETE FROM ${schema}.chat_tag WHERE chat_id = $1 AND tag_id = $2`,
    [chatId, tagId]
  );
};

const getTagsByChat = async (chatId, schema) => {
  const result = await pool.query(
    `SELECT t.* FROM ${schema}.tag t
     JOIN ${schema}.chat_tag ct ON t.id = ct.tag_id
     WHERE ct.chat_id = $1`,
    [chatId]
  );
  return result.rows;
};

module.exports = {
  ensureTagColumns,
  createTag,
  getTags,
  resolveTag,
  deleteTag,
  addTagToChat,
  removeTagFromChat,
  getTagsByChat,
};