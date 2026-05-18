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
    // Schemas antigos podem nao ter todas as colunas — garante antes do UPDATE.
    try {
        await pool.query(`ALTER TABLE ${schema}.bots ADD COLUMN IF NOT EXISTS instructions TEXT`)
        await pool.query(`ALTER TABLE ${schema}.bots ADD COLUMN IF NOT EXISTS model TEXT`)
        await pool.query(`ALTER TABLE ${schema}.bots ADD COLUMN IF NOT EXISTS has_func BOOLEAN DEFAULT false`)
        await pool.query(`ALTER TABLE ${schema}.bots ADD COLUMN IF NOT EXISTS updated_at BIGINT`)
    } catch (_) {}
    await pool.query(`UPDATE ${schema}.bots
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
const ensureBotFunctionsTable = async (schema) => {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS ${schema}.bot_functions (
            assistant_id TEXT NOT NULL,
            func_id UUID NOT NULL
        )`)
    } catch (_) {}
}
const insertBotFunctions = async (assistant_id, function_id, schema) => {
    await ensureBotFunctionsTable(schema)
    await pool.query(`INSERT INTO ${schema}.bot_functions(assistant_id, func_id) VALUES ($1, $2)`, [assistant_id, function_id])
}
const deleteAllBotFunctions = async (assistant_id, schema) => {
    await ensureBotFunctionsTable(schema)
    await pool.query(`DELETE FROM ${schema}.bot_functions WHERE assistant_id = $1`, [assistant_id])
}
const getBotById = async (assistant_id, schema) => {
    const result = await pool.query(`SELECT * FROM ${schema}.bots WHERE id = $1`, [assistant_id])
    return result.rows[0]
}

const setBotTestMode = async (assistant_id, test_mode, schema) => {
    // Schemas antigos podem nao ter sido provisionados com test_mode —
    // garante a coluna antes do UPDATE para nao estourar 42703 (que
    // sob nginx em prod pode aparecer como 502 se o backend reciclar).
    try {
        await pool.query(`ALTER TABLE ${schema}.bots ADD COLUMN IF NOT EXISTS test_mode BOOLEAN DEFAULT false`)
    } catch (_) {}
    const result = await pool.query(
        `UPDATE ${schema}.bots SET test_mode = $1, updated_at = $2 WHERE id = $3 RETURNING *`,
        [!!test_mode, getCurrentTimestamp(), assistant_id]
    )
    return result.rows[0]
}

const ensureBotTestNumbersTable = async (schema) => {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS ${schema}.bot_test_numbers (
            id UUID PRIMARY KEY,
            assistant_id TEXT NOT NULL,
            number TEXT NOT NULL,
            created_at BIGINT
        )`)
        await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS bot_test_numbers_unique
            ON ${schema}.bot_test_numbers (assistant_id, number)`)
    } catch (_) { /* ignore */ }
}

const getBotTestNumbers = async (assistant_id, schema) => {
    await ensureBotTestNumbersTable(schema)
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
    await ensureBotTestNumbersTable(schema)
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
    await ensureBotTestNumbersTable(schema)
    const result = await pool.query(
        `DELETE FROM ${schema}.bot_test_numbers WHERE id = $1 AND assistant_id = $2 RETURNING *`,
        [id, assistant_id]
    )
    return result.rows[0] || null
}

// Gera variantes para casar com a forma BR sem-9 que o webhook normaliza
// e com a forma com-9 que o usuário normalmente cadastra.
const numberVariants = (raw) => {
    const n = normalizeNumber(raw)
    if (!n) return []
    const set = new Set([n])
    // 13 dígitos começando com 55 e com o 9 do celular → adiciona versão sem 9
    if (/^55\d{2}9\d{8}$/.test(n)) set.add(n.slice(0, 4) + n.slice(5))
    // 12 dígitos começando com 55 → adiciona versão com 9
    if (/^55\d{10}$/.test(n)) set.add(n.slice(0, 4) + '9' + n.slice(4))
    return [...set]
}

const isNumberAllowedForBot = async (assistant_id, rawNumber, schema) => {
    if (!assistant_id) return true
    const bot = await pool.query(
        `SELECT test_mode FROM ${schema}.bots WHERE id = $1`,
        [assistant_id]
    )
    if (bot.rowCount === 0 || !bot.rows[0].test_mode) return true
    const variants = numberVariants(rawNumber)
    if (variants.length === 0) return false
    const allowed = await pool.query(
        `SELECT 1 FROM ${schema}.bot_test_numbers WHERE assistant_id = $1 AND number = ANY($2) LIMIT 1`,
        [assistant_id, variants]
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