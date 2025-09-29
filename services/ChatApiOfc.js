const pool = require("../db/queries")
const { v4: uuid4 } = require('uuid');


const createApiOfcChat = async (chat_id, connection_id, number, name, queue_id, user_id, status, created_at, updated_at, is_bot_on, thread_id, schema) => {
    const chatExists = await pool.query(
        `SELECT * FROM ${schema}.api_ofc_chats WHERE number = $1 and status <> 'closed'`,[number]
    )
    if (chatExists.rows.length > 0){
        return chatExists.rows[0]
    }else{
        const result = await pool.query(
            `INSERT INTO ${schema}.api_ofc_chats (id, chat_id, connection_id, number, name, queue_id, user_id, status, created_at, updated_at, is_bot_on, thread_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
            [uuid4(), chat_id, connection_id, number, name, queue_id, user_id, status, created_at, updated_at, is_bot_on, thread_id]
        )
        return result.rows[0]
    }
}

const getApiChats = async (schema) => {
    const result = await pool.query(
        `SELECT * FROM ${schema}.api_ofc_chats`
    )
    return result.rows
}

const setApiChatQueue = async (chat_id, schema) => {
    const chat = await pool.query(
        `SELECT * FROM ${schema}.api_ofc_chats WHERE id=$1`,
        [chat_id]
    )
    if(!chat || chat.rowCount === 0){
        return;
    }
    const connection = await pool.query(
        `SELECT * FROM ${schema}.connections WHERE id=$1`,
        [chat.rows[0].connection_id]
    )
    const result = await pool.query(
        `UPDATE ${schema}.api_ofc_chats SET queue_id=$1 WHERE id=$2 RETURNING *`,
        [connection.rows[0].queue_id, chat_id]
    )
    return (result.rows[0]
    )
}

module.exports = {
    createApiOfcChat,
    getApiChats,
    setApiChatQueue
}