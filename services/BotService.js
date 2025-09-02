const pool = require("../db/queries")
const { getCurrentTimestamp } = require("./getCurrentTimestamp")

const insertBotInTable = async (assistant_id, name, instructions, model, has_func, schema) => {
    const result = await pool.query(`INSERT INTO ${schema}.bots(id, name, instructions, model, has_func, created_at, updated_at)
        VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *
        `, [assistant_id, name, instructions, model, has_func, getCurrentTimestamp(), getCurrentTimestamp()])
    return result.rows[0];
}

const updateBotInTable = async (assistant_id, name, instructions, model, has_func) => {
    const result = await pool.query(`UPDATE ${schema}.bots
        SET name = $2, instructions = $3, model = $4, has_func = $5, updated_at = $6
        WHERE assistant_id = $1
        `, [assistant_id, name, instructions, model, has_func, getCurrentTimestamp()])
}

const deleteBotInTable = async (assistant_id, schema) => {
    const result = await pool.query(`DELETE FROM ${schema}.bots where id=$1`,[assistant_id])
}

const getBots = async (schema) => {
    const result = await pool.query(`SELECT * FROM ${schema}.bots`)
    return result.rows
}
module.exports={
    insertBotInTable,
    updateBotInTable,
    deleteBotInTable,
    getBots
    
}