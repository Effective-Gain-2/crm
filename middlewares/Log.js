const pool = require('../db/queries');
const { getCurrentTimestamp } = require('../services/getCurrentTimestamp');


const insertLog = async (user_id, log, schema) => {
    const logQuery = await pool.query(
        `INSERT INTO ${schema}.logs (user_id, action, created_at) VALUES ($1, $2, $3) RETURNING *`,
        [user_id, log, getCurrentTimestamp()]
    )
    return logQuery;
}
const getLogs = async (schema) => {
    const logsQuery = await pool.query(
        `SELECT l.id, l.user_id, u.name as user_name, l.action, l.created_at 
         FROM ${schema}.logs l 
         JOIN ${schema}.users u ON l.user_id = u.id 
         ORDER BY l.created_at DESC`
    );
    return logsQuery.rows;
}

module.exports = {
    insertLog,
    getLogs
}