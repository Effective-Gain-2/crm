// Autenticação central: verifica o JWT do cookie e injeta req.auth.
// Payload esperado: { account_id, local_user_id, schema, company_id, role, is_tecnico, typ:'access' }
const jwt = require('jsonwebtoken');

const ACCESS_SECRET = () => process.env.JWT_SECRET;
const REFRESH_SECRET = () => process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET}.refresh`;

const ROLE_LEVEL = { operacional: 1, lider: 2, master: 3, tecnico: 4 };

function auth(req, res, next) {
    const { token } = req.cookies || {};
    if (!token) {
        return res.status(401).json({ error: 'Não autenticado' });
    }
    jwt.verify(token, ACCESS_SECRET(), (error, decoded) => {
        if (error || decoded?.typ !== 'access' || !decoded?.schema || !decoded?.role) {
            return res.status(401).json({ error: 'Sessão inválida ou expirada' });
        }
        req.auth = {
            account_id: decoded.account_id,
            local_user_id: decoded.local_user_id,
            schema: decoded.schema,
            company_id: decoded.company_id,
            role: decoded.role,
            is_tecnico: !!decoded.is_tecnico,
        };
        // Compat: controllers legados leem req.user_id
        req.user_id = decoded.local_user_id;
        next();
    });
}

module.exports = { auth, ACCESS_SECRET, REFRESH_SECRET, ROLE_LEVEL };
