// Autorização por papel com hierarquia: tecnico(4) > master(3) > lider(2) > operacional(1)
const { ROLE_LEVEL } = require('./auth');

const requireRole = (minRole) => (req, res, next) => {
    const level = ROLE_LEVEL[req.auth?.role] || 0;
    const required = ROLE_LEVEL[minRole] || 99;
    if (level < required) {
        return res.status(403).json({ error: 'Permissão insuficiente' });
    }
    next();
};

const requireTecnico = requireRole('tecnico');

module.exports = { requireRole, requireTecnico };
