const pool = require("../db/queries")

const insertLimits = async (name, is_on, quantity, schema) => {
    const result = await pool.query(`INSERT INTO effective_gain.limits(schema, name, is_on, quantity) VALUES ($1, $2, $3, $4) RETURNING *`, [schema, name, is_on, quantity])
    return result.rows[0]
}

const updateLimits = async (name, is_on, quantity, schema) => {
    const result = await pool.query(`UPDATE effective_gain.limits SET is_on=$1, quantity=$2 WHERE schema=$3 AND name=$4 RETURNING *`, [is_on, quantity, schema, name])
    return result.rows[0]
}

const getLimitsBySchema = async (schema) => {
    const result = await pool.query(`SELECT * FROM effective_gain.limits WHERE schema=$1`, [schema])
    return result.rows
}

module.exports = {
    insertLimits,
    updateLimits,
    getLimitsBySchema
}