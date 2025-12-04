const { returnForbiddenError } = require("../Errors/Errors");
const { getUserById } = require("../services/UserService");
const jwt = require('jsonwebtoken');


function allowedRoles(roles){
    return (req, res, next) => {
        verifyUserRoleAndId(req, res, next, roles);    
    }
}

async function verifyUserRoleAndId(req, res, next, roles) {
    const {token} = req.cookies;
    const decodedToken = jwt.decode(token)
    const { user_id, user_role, schema } = decodedToken || {};
    
    if(!schema) return null
    let allowedRoles;
    switch(roles){
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
    return ForbiddenError(res);
  }
  if (user_role === "tecnico") {
      const user = await getUserById(user_id, "effective_gain");
      if (user.rowsCount === 0) {
      return ForbiddenError(res);
    }
    return next();
  }
  const user = await getUserById(user_id, schema);
  if (user.rowsCount === 0) {
    return ForbiddenError(res);
  }
  return next();
}

module.exports ={
    allowedRoles,
    verifyUserRoleAndId
}
