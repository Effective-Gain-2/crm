const pool = require("../db/queries");
const uuid = require('uuid');
const bcrypt = require('bcrypt')

const createApiKey = async (data) => {
    const api_key = uuid.v4()
    const api_key_hash = await bcrypt.hash(api_key, 10);
    await pool.query(`INSERT INTO effective_gain.api_keys(chave, schema_name) VALUES ($1, $2)`, [api_key_hash, data.schema_name]);
    return api_key
}

module.exports = { createApiKey }