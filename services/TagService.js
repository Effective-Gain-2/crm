const pool = require('../db/queries');
const { v4: uuidv4 } = require('uuid');


const createTag = async (name, color, schema) => {
  const result = await pool.query(
    `INSERT INTO ${schema}.tag (id, name, color) VALUES ($3, $1, $2) RETURNING *`,
    [name, color, uuidv4()]
  );
  return result.rows[0];
};

const getTags = async (schema) => {
  const result = await pool.query(
    `SELECT * FROM ${schema}.tag`
  );
  return result.rows;
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
  createTag,
  getTags,
  deleteTag,
  addTagToChat,
  removeTagFromChat,
  getTagsByChat,
};