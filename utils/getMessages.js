const pool = require("../db/queries");

const getMessages = async(chat_Id, schema)=>{
    const result = await pool.query(
      `SELECT * FROM ${schema}.messages WHERE chat_id=$1 ORDER BY created_at ASC`,
      [chat_Id]
    );
    return result.rows
}

const getChatData = async(id, schema)=>{
  const chat = await pool.query(
    `SELECT * FROM ${schema}.chats WHERE id=$1`, [id]
  )
  const connection = await pool.query(
    `SELECT * FROM ${schema}.connections WHERE id=$1`, [chat.rows[0].connection_id]
  )
  const queue = await pool.query(
    `SELECT * FROM ${schema}.queues WHERE id=$1`, [chat.rows[0].queue_id]
  )
  const user = await pool.query(
    `SELECT * FROM ${schema}.users WHERE id=$1`, [chat.rows[0].assigned_user]
  )

  return {
    chat: chat.rows[0],
    connection: connection.rows[0],
    queue: queue.rows[0],
    user: user.rows[0],
  }
}

module.exports = {
    getMessages,
    getChatData
};