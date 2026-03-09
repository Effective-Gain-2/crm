const bcrypt = require('bcrypt')
const pool = require('../db/queries')

const getTenant = async (req, res, next) => {
    const api_key = req.headers['api-key']

    if(!api_key) return res.status(401).json({error:'API KEY is required'})

    const api_key_hash = await pool.query(`SELECT * from effective_gain.api_keys`)
    for (const row of api_key_hash.rows){
        const match = await bcrypt.compare(api_key, row.chave)
        if(match) {
            req.schema = row.schema_name
            return next()
        }
    }
    return res.status(401).json({error:'Invalid API KEY'})
}

module.exports = {
    getTenant
}