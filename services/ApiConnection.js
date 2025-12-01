const axios = require('axios')
const pool = require('../db/queries')
const { v4: uuid4 } = require('uuid');
const { hash, compare } = require('bcrypt');

const createApiConnection = async (phone_number, phone_id, token, name, schema) => {
    const tokenHash = await hash(token, 10)
    console.log('token', token, tokenHash)
    const result = await pool.query(`INSERT INTO ${schema}.api_connections(id, phone_id, name, number, token) VALUES ($1, $2, $3, $4, $5) RETURNING *`, [uuid4(), phone_id, name, phone_number, tokenHash])
    return result.rows[0]
}
const getApiConnections = async (phone_id, schema) => {
    let result = await pool.query(`SELECT * FROM ${schema}.api_connections WHERE phone_id=$1`, [phone_id])
    if(result.rowCount === 0){
       result = await pool.query(`SELECT * FROM ${schema}.api_connections WHERE id=$1`, [phone_id])
    }
    return result.rows[0]
}
const deleteEverythingApiOfc = async (phone_id, schema) => {
    await pool.query(`DELETE FROM ${schema}.api_ofc_chats WHERE connection_id=$1`, [phone_id])
    // await pool.query(`DELETE FROM ${schema}.api_connections WHERE phone=$1`, [phone_id])
    await pool.query(`DELETE FROM ${schema}.connections WHERE name=$1`, [phone_id])
}
const getSchemaByPhoneId = async (phone_id) => {
    // Get all non-system schema names
    const schemas = await pool.query(`SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'public')`)
    try {
        for (const row of schemas.rows) {
            const schemaName = row.schema_name;

            // Check if the api_connections table exists in this schema
            const checkTable = await pool.query(`
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = $1 AND table_name = 'api_connections'
                ) AS table_exists;
            `, [schemaName]);

            if (!checkTable.rows[0].table_exists) {
                // table not present in this schema, continue to next
                continue;
            }

            // Query the api_connections table in this schema for the phone_id
            const result = await pool.query(`SELECT * FROM ${schemaName}.api_connections WHERE phone_id = $1`, [phone_id]);
            if (result && result.rowCount > 0) {
                return {phone_id:result.rows[0], schema:schemaName};
            }
        }
        // not found in any schema
        return null;
    } catch (error) {
        console.error('getSchemaByPhoneId error:', error);
        throw error;
    }
}

module.exports = {
    createApiConnection,
    getApiConnections,
    deleteEverythingApiOfc,
    getSchemaByPhoneId
}