// Allowlist de schemas — barreira central contra SQL injection por interpolação.
// Usada pelos middlewares HTTP, webhook (schema derivado da instância Evolution)
// e workers (lembretes/campanhas).
const pool = require('../db/queries');

const SCHEMA_RE = /^[a-z][a-z0-9_]{1,40}$/;

let cache = { set: new Set(), loadedAt: 0 };
const TTL_MS = 60 * 1000;

const loadAllowlist = async () => {
    const res = await pool.query(`SELECT schema_name FROM effective_gain.companies`);
    cache = { set: new Set(res.rows.map(r => r.schema_name)), loadedAt: Date.now() };
    return cache.set;
};

// Invalida o cache (chamar ao criar empresa)
const invalidateSchemaCache = () => { cache.loadedAt = 0; };

// true se o schema tem formato válido E está registrado como empresa
const isValidSchema = async (schema) => {
    if (!SCHEMA_RE.test(schema || '')) return false;
    if (Date.now() - cache.loadedAt > TTL_MS) {
        try { await loadAllowlist(); } catch (e) {
            console.error('validateSchema: erro ao carregar allowlist:', e.message);
            return false;
        }
    }
    return cache.set.has(schema);
};

// Lança se inválido — para uso em workers/webhook
const assertSchema = async (schema) => {
    if (!(await isValidSchema(schema))) {
        throw new Error(`Schema não permitido: ${schema}`);
    }
    return schema;
};

module.exports = { SCHEMA_RE, isValidSchema, assertSchema, invalidateSchemaCache };
