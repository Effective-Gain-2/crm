// Isolamento multi-tenant: o schema NUNCA vem do cliente (exceto técnico, com validação).
// - Papéis de cliente: TODAS as fontes (body/query) são sobrescritas com o schema do token.
// - Técnico: pode indicar outro schema (poder de plataforma), validado por formato estrito;
//   sem schema explícito, usa o da sessão.
// Os :schema/:role de URL são neutralizados por router.param (middlewares/schemaParams.js),
// que respeita a mesma regra via req.schema.
// Rotas multipart devem reaplicar este middleware APÓS o multer (repopula req.body).
const { SCHEMA_RE } = require('../utils/validateSchema');

function enforceSchema(req, res, next) {
    if (!req.auth?.schema) {
        return res.status(401).json({ error: 'Não autenticado' });
    }

    if (req.auth.is_tecnico) {
        // Técnico: valida formato do que vier; fallback = schema da sessão
        const candidates = [req.body?.schema, req.body?.schema_name, req.query?.schema];
        for (const c of candidates) {
            if (c !== undefined && c !== null && c !== '' && !SCHEMA_RE.test(String(c))) {
                return res.status(400).json({ error: 'Nome de schema inválido' });
            }
        }
        req.schema = (req.body?.schema || req.query?.schema || req.auth.schema);
        if (req.body && typeof req.body === 'object' && !req.body.schema && req.method !== 'GET') {
            req.body.schema = req.auth.schema;
        }
        return next();
    }

    const schema = req.auth.schema;
    if (req.body && typeof req.body === 'object') {
        if ('schema' in req.body || req.method !== 'GET') req.body.schema = schema;
        if ('schema_name' in req.body) req.body.schema_name = schema;
    }
    if (req.query && typeof req.query === 'object' && 'schema' in req.query) {
        req.query.schema = schema;
    }
    req.schema = schema;
    next();
}

module.exports = { enforceSchema };
