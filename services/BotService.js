const pool = require("../db/queries")
const { getCurrentTimestamp } = require("./getCurrentTimestamp")
const { v4: uuidv4 } = require('uuid')

const normalizeNumber = (raw) => {
    if (!raw) return null
    const digits = String(raw).replace(/\D/g, '')
    return digits || null
}

const insertBotInTable = async (assistant_id, name, instructions, model, has_func, schema) => {
    const result = await pool.query(`INSERT INTO ${schema}.bots(id, name, instructions, model, has_func, created_at, updated_at)
        VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *
        `, [assistant_id, name, instructions, model, has_func, getCurrentTimestamp(), getCurrentTimestamp()])
    return result.rows[0];
}

const updateBotInTable = async (assistant_id, name, instructions, model, has_func, schema) => {
    const result = await pool.query(`UPDATE ${schema}.bots
        SET name = $2, instructions = $3, model = $4, has_func = $5, updated_at = $6
        WHERE id = $1
        `, [assistant_id, name, instructions, model, has_func || false, getCurrentTimestamp()])
}

const deleteBotInTable = async (assistant_id, schema) => {
    await pool.query(`DELETE FROM ${schema}.bots where id=$1`,[assistant_id])
}

const getBots = async (schema) => {
    const result = await pool.query(`SELECT * FROM ${schema}.bots`)
    return result.rows
}
const getFunctions = async (schema) => {
    const result = await pool.query(`SELECT * FROM ${schema}.functions`)
    return result.rows
}
const insertBotFunctions = async (assistant_id, function_id, schema) => {
    await pool.query(`INSERT INTO ${schema}.bot_functions(assistant_id, func_id) VALUES ($1, $2)`, [assistant_id, function_id])
}
const deleteAllBotFunctions = async (assistant_id, schema) => {
    await pool.query(`DELETE FROM ${schema}.bot_functions WHERE assistant_id = $1`, [assistant_id])
}
const getBotById = async (assistant_id, schema) => {
    const result = await pool.query(`SELECT * FROM ${schema}.bots WHERE id = $1`, [assistant_id])
    return result.rows[0]
}

const setBotTestMode = async (assistant_id, test_mode, schema) => {
    const result = await pool.query(
        `UPDATE ${schema}.bots SET test_mode = $1, updated_at = $2 WHERE id = $3 RETURNING *`,
        [!!test_mode, getCurrentTimestamp(), assistant_id]
    )
    return result.rows[0]
}

const getBotTestNumbers = async (assistant_id, schema) => {
    const result = await pool.query(
        `SELECT id, number, created_at FROM ${schema}.bot_test_numbers WHERE assistant_id = $1 ORDER BY created_at ASC`,
        [assistant_id]
    )
    return result.rows
}

const addBotTestNumber = async (assistant_id, rawNumber, schema) => {
    const number = normalizeNumber(rawNumber)
    if (!number) {
        throw new Error('Número inválido')
    }
    const result = await pool.query(
        `INSERT INTO ${schema}.bot_test_numbers (id, assistant_id, number, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (assistant_id, number) DO NOTHING
         RETURNING *`,
        [uuidv4(), assistant_id, number, getCurrentTimestamp()]
    )
    return result.rows[0] || null
}

const removeBotTestNumber = async (id, assistant_id, schema) => {
    const result = await pool.query(
        `DELETE FROM ${schema}.bot_test_numbers WHERE id = $1 AND assistant_id = $2 RETURNING *`,
        [id, assistant_id]
    )
    return result.rows[0] || null
}

const isNumberAllowedForBot = async (assistant_id, rawNumber, schema) => {
    if (!assistant_id) return true
    const bot = await pool.query(
        `SELECT test_mode FROM ${schema}.bots WHERE id = $1`,
        [assistant_id]
    )
    if (bot.rowCount === 0 || !bot.rows[0].test_mode) return true
    const number = normalizeNumber(rawNumber)
    if (!number) return false
    const allowed = await pool.query(
        `SELECT 1 FROM ${schema}.bot_test_numbers WHERE assistant_id = $1 AND number = $2 LIMIT 1`,
        [assistant_id, number]
    )
    return allowed.rowCount > 0
}

module.exports={
    insertBotInTable,
    updateBotInTable,
    deleteBotInTable,
    getBots,
    getFunctions,
    insertBotFunctions,
    deleteAllBotFunctions,
    getBotById,
    setBotTestMode,
    getBotTestNumbers,
    addBotTestNumber,
    removeBotTestNumber,
    isNumberAllowedForBot,
    normalizeNumber
}