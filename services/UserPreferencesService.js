const pool = require('../db/queries');
const { v4: uuidv4 } = require('uuid');

const setPreference = async (user_id, key, value, schema, userRole) => {
    try {
        const userExists = await pool.query(
            `SELECT 1 FROM ${schema}.users WHERE id = $1`,
            [user_id]
        );

        let targetSchema = schema;

        if (userRole === 'tecnico' && userExists.rowCount === 0) {
            targetSchema = 'effective_gain';
        }

        const result = await pool.query(
            `INSERT INTO ${targetSchema}.user_preferences(id, user_id, key, value) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (user_id, key) 
             DO UPDATE SET 
                value = EXCLUDED.value
             RETURNING *`,
            [uuidv4(), user_id, key, value]
        );
        
        return result.rows[0];
    } catch (error) {
        console.error('Erro ao salvar preferência:', error);
        throw error;
    }
};

const getPreferencesByUser = async (user_id, schema) => {
    try {
        const result = await pool.query(
            `SELECT key, value FROM ${schema}.user_preferences WHERE user_id = $1`,
            [user_id]
        );
        
        // Converter array de objetos para objeto simples
        const preferences = {};
        result.rows.forEach(row => {
            preferences[row.key] = row.value;
        });
        
        return preferences;
    } catch (error) {
        console.error('Erro ao buscar preferências:', error);
        return {};
    }
};

const updatePreference = async (user_id, key, value, schema) => {
    try {
        const result = await pool.query(
            `UPDATE ${schema}.user_preferences SET value = $1, updated_at = NOW() WHERE user_id = $2 AND key = $3 RETURNING *`,
            [value, user_id, key]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Erro ao atualizar preferência:', error);
        throw error;
    }
};

module.exports = {
    setPreference,
    getPreferencesByUser,
    updatePreference
};