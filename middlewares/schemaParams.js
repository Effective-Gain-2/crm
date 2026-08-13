// Neutraliza :schema e :role vindos da URL, substituindo pelos valores do token.
// Uso: bindAuthParams(router) — 1 linha em cada arquivo de rotas.
function bindAuthParams(router) {
    router.param('schema', (req, res, next) => {
        if (req.auth?.schema) req.params.schema = req.auth.schema;
        next();
    });
    router.param('role', (req, res, next) => {
        if (req.auth?.role) req.params.role = req.auth.role;
        next();
    });
    return router;
}

module.exports = { bindAuthParams };
