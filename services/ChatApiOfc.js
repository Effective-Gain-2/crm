const pool = require("../db/queries")
const { v4: uuid4 } = require('uuid');


const createApiOfcChat = async (chat_id, connection_id, number, name, queue_id, user_id, status, created_at, updated_at, is_bot_on, thread_id, schema) => {
    const result = await pool.query(
        `INSERT INTO ${schema}.api_ofc_chats (id, chat_id, connection_id, number, name, queue_id, user_id, status, created_at, updated_at, is_bot_on, thread_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [uuid4(), chat_id, connection_id, number, name, queue_id, user_id, status, created_at, updated_at, is_bot_on, thread_id]
    )
    return result.rows[0]
}

module.exports = {
    createApiOfcChat
}