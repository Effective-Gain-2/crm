const pool = require('../db/queries');
const { getCurrentTimestamp } = require('../services/getCurrentTimestamp');


const insertLog = async (user_id, log, schema) => {
    const logQuery = await pool.query(
        `INSERT INTO ${schema}.logs (user_id, action, created_at) VALUES ($1, $2, $3) RETURNING *`,
        [user_id, log, getCurrentTimestamp()]
    )
    return logQuery;
}

module.exports = {
    insertLog
}