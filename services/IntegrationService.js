// Chaves de API por cliente (controle de custo por empresa).
// Valores são write-only na API: o frontend nunca recebe a chave de volta, só a presença.
const pool = require('../db/queries');

const getSetting = async (schema, key) => {
    try {
        const res = await pool.query(
            `SELECT value FROM ${schema}.integration_settings WHERE key = $1`, [key]
        );
        return res.rows[0]?.value || null;
    } catch (e) {
        return null; // tabela pode não existir em schema não migrado
    }
};

const setSetting = async (schema, key, value, updatedBy) => {
    await pool.query(
        `INSERT INTO ${schema}.integration_settings (key, value, updated_by, updated_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
        [key, value, updatedBy || null]
    );
};

const deleteSetting = async (schema, key) => {
    await pool.query(`DELETE FROM ${schema}.integration_settings WHERE key = $1`, [key]);
};

// Presença das chaves (sem expor valores)
const listSettingKeys = async (schema) => {
    try {
        const res = await pool.query(
            `SELECT key, updated_at FROM ${schema}.integration_settings WHERE value IS NOT NULL AND value <> ''`
        );
        return res.rows;
    } catch (e) {
        return [];
    }
};

// Chave OpenAI do tenant → fallback env global → null (agente desabilitado)
const getOpenAiKey = async (schema) => {
    const tenantKey = await getSetting(schema, 'openai_api_key');
    if (tenantKey) return { key: tenantKey, source: 'tenant' };
    if (process.env.OPENAI_KEY) return { key: process.env.OPENAI_KEY, source: 'env' };
    return null;
};

// ---- Medição de uso de IA por empresa ----
const logAiUsage = async (schema, { model, prompt_tokens, completion_tokens, contact_number }) => {
    try {
        await pool.query(
            `INSERT INTO ${schema}.ai_usage_log (model, prompt_tokens, completion_tokens, contact_number)
             VALUES ($1, $2, $3, $4)`,
            [model || null, prompt_tokens || 0, completion_tokens || 0, contact_number || null]
        );
    } catch (e) {
        console.error('logAiUsage:', e.message);
    }
};

const getAiUsageSummary = async (schema) => {
    try {
        const res = await pool.query(
            `SELECT COUNT(*)::int AS calls,
                    COALESCE(SUM(prompt_tokens), 0)::int AS prompt_tokens,
                    COALESCE(SUM(completion_tokens), 0)::int AS completion_tokens
               FROM ${schema}.ai_usage_log
              WHERE ts >= date_trunc('month', now())`
        );
        return res.rows[0];
    } catch (e) {
        return { calls: 0, prompt_tokens: 0, completion_tokens: 0 };
    }
};

module.exports = { getSetting, setSetting, deleteSetting, listSettingKeys, getOpenAiKey, logAiUsage, getAiUsageSummary };
