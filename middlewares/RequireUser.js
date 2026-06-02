const { returnForbiddenError } = require("../Errors/Errors");
const { getUserById } = require("../services/UserService");
const jwt = require('jsonwebtoken');
const { insertLog } = require("./Log");


function allowedRoles(roles, saveLog = false, action_name=null) {
    return (req, res, next) => {
        verifyUserRoleAndId(req, res, next, roles, saveLog, action_name);
    }
}

async function verifyUserRoleAndId(req, res, next, roles, saveLog = false, action_name=null) {
    const { user_id, user_role, schema, isServiceAuth } = req;
    if (!schema) return null
    let allowedRoles;
    switch (roles) {
        case 'tec-admin':
            allowedRoles = ['tecnico', 'admin'];
            break;
        case 'tec-user':
            allowedRoles = ['tecnico', 'user'];
            break;
        case 'admin-user':
            allowedRoles = ['admin', 'user'];
            break;
        case 'tec':
            allowedRoles = ['tecnico'];
            break;
        default:
            allowedRoles = ['tecnico', 'admin', 'user'];
            break;
    }
    if (!allowedRoles.includes(user_role)) {
        return returnForbiddenError(res);
    }
    // Service-auth (BFF do allpfit): a identidade já foi validada pelo upstream
    // via pre-shared key. Pulamos o lookup em users — não há registro real.
    if (isServiceAuth) {
        if (saveLog) {
            try { await insertLog(user_id, action_name, schema) } catch (_) { /* não falha o request */ }
        }
        return next();
    }
    if (user_role === "tecnico") {
        const user = await getUserById(user_id, "effective_gain");
        if (user.rowsCount === 0) {
            return returnForbiddenError(res);
        }
        return next();
    }
    const user = await getUserById(user_id, schema);
    if (user.rowsCount === 0) {
        return returnForbiddenError(res);
    }
    if (saveLog) {
        await insertLog(user_id, action_name, schema)
    }

    return next();
}

module.exports = {
    allowedRoles,
    verifyUserRoleAndId
}
