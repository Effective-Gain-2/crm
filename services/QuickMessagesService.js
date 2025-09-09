const pool = require('../db/queries');
const { v4: uuidv4 } = require('uuid');

const createQuickMessage = async (type, queue_id, user_id, message, is_command_on, shortcut, schema) => {
    if(queue_id){
        const result = await pool.query(`INSERT INTO ${schema}.quick_messages (id, tag, queue_id, user_id, value, is_command_on, shortcut) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, 
            [uuidv4(), type, queue_id, user_id, message, is_command_on, shortcut])
    
        return result.rows[0]
    }else{
        const result = await pool.query(`INSERT INTO ${schema}.quick_messages (id, tag, user_id, value, is_command_on, shortcut) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, 
            [uuidv4(), type, user_id, message, is_command_on, shortcut])
    
        return result.rows[0]
    }
}

const getAllQuickMessages = async (schema) => {
    const result = await pool.query(`SELECT * FROM ${schema}.quick_messages`)
    
    return result.rows
}

const getQuickMessageById = async (quick_message_id, schema) => {
     const result = await pool.query(`SELECT * FROM ${schema}.quick_messages where id=$1`,[quick_message_id])
    
    return result.rows[0]
}

const updateQuickMessage = async (quick_message_id, type, queue_id, message, shortcut, schema) => {
    const result = await pool.query(`UPDATE ${schema}.quick_messages SET value=$1, shortcut=$2, tag=$4, queue_id=$5 WHERE id=$3 RETURNING *`, [message, shortcut, quick_message_id, type, queue_id||null])
    return result.rows[0]
}

const deleteQuickMessage = async (quick_message_id, schema) => {
    try {
        await pool.query(`DELETE FROM ${schema}.quick_messages WHERE id=$1`,[quick_message_id])
    } catch (error) {
        console.error(error)
    }
}

const getAllQuickMessagesByUser = async (user_id, schema) => {
    const queues = await pool.query(`SELECT * FROM ${schema}.queue_users where user_id=$1`, [user_id]);
    let messages = [];
    for(const queue of queues.rows){
        const message = await pool.query(`SELECT * FROM ${schema}.quick_messages WHERE queue_id=$1`, [queue.queue_id || queue.id]);
        messages = messages.concat(message.rows);
    }
    const personalMessages = await pool.query(`SELECT * FROM ${schema}.quick_messages where user_id=$1`, [user_id]);
    messages = messages.concat(personalMessages.rows);
    return messages;
}

module.exports =
{
    createQuickMessage,
    getAllQuickMessages,
    getQuickMessageById,
    updateQuickMessage,
    deleteQuickMessage,
    getAllQuickMessagesByUser

}