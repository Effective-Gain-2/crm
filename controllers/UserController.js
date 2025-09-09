const { createUser, getAllUsers, searchUser, changeOnline, getOnlineUsers, changeOffline, deleteUser, updateUser, getUserById, getLoginAttempts, getIp, saveLoginAttempt} = require('../services/UserService');
const { Users } = require('../entities/Users');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const { token } = req.cookies;
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
    req.user_id = decoded.user_id;
    next();
  });
}

const refreshTokenController = (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token não fornecido' });
  }
  try {
    const refresh = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const newToken = jwt.sign(
      { user_id: refresh.user_id },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    res.cookie('token', newToken, {
      maxAge: 15 * 60 * 1000, // 15 minutos em millisegundos
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined
    });
    return res.status(200).json({ 
      success: true,
      token: newToken 
    });
  } catch (refreshError) {
    return res.status(401).json({ error: 'Refresh token inválido' });
  }
};


const createUserController = async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
  
      const user = new Users(
        uuidv4(),
        name,
        email,
        password,
        role
      );
  
        const schema = req.body.schema;
        const result = await createUser(user, schema);
        global.socketIoServer.to(`schema_${schema}`).emit('new_user', result)
      res.status(201).json({success:true,result});
  
    } catch (err) {
      console.error("Erro ao criar usuário:", err.message);
      res.status(500).json({ error: 'Erro ao criar usuário' });
    }
  };
  const updateUserController = async (req, res) => {
    const { userId, userName, userEmail, userRole } = req.body;
    const schema = req.body.schema;
    try {
      const result = await updateUser(userId, userName, userEmail, userRole, schema);
      res.status(200).json({
        message: 'Usuário atualizado com sucesso',
      })
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error.message);
      res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
  }
const getAllUsersController = async (req, res) => {
  const schema = req.params.schema;
  
  try {
    const result = await getAllUsers(schema);
    res.status(200).json({
      users: result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Não foi possível exibir os usuários'
    });
  }
};
const searchUserController = async (req, res) => {
  const { email, password } = req.body;
  const ip = await getIp(req);

  try {
    const result = await searchUser(email, password);
    
    if (!result) {
      console.log("Usuário não encontrado");
      await saveLoginAttempt(ip, 'effective_gain');
      return res.status(404).json({success:false});
    }

    const isBlocked = await getLoginAttempts(ip, result.company.schema_name);
    if(isBlocked===true){
      return res.status(403).json({ error: 'IP bloqueado por tentativas excessivas' });
    }

    changeOnline(result.user.id, result.company.schema_name);

    const token = jwt.sign(
      { user_id: result.user.id },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { user_id: result.user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      maxAge: 15 * 60 * 1000, // 15 minutos em millisegundos
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined
    });

    res.cookie('refreshToken', refreshToken, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias em millisegundos
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined
    });

    res.status(200).json({
      success: true,
      user: result.user,
      role: result.user.permission,
      company: result.company,
      schema: result.company.schema_name
    });

  } catch (error) {
    console.error("Erro ao buscar usuário:", error.message);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }

}

const searchUserByIdController = async (req, res) => {
  const { user_id, schema } = req.params;
  try {
    const result = await getUserById(user_id, schema);

    if (!result) {
      return res.status(404).json({});
    }
    
    res.status(200).json({
      success: true,
      user: result,
    });

  } catch (error) {
    console.error("Erro ao buscar usuário:", error.message);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
}
const getOnlineUsersController = async (req, res) => {
  const { schema } = req.query 
  try {
    const result = await getOnlineUsers(schema);
    res.status(201).json({
      users: result,
    });
  } catch (error) {
    console.error(error)
    res.status(500).json({
      message: 'Não foi possível exibir os usuários',
    });
  }
  
};

const changeOfflineController = async(req, res)=>{
  const { userID } = req.query 
  const schema = req.param?.schema
  try {
    const result = await changeOffline(userID, schema)
    res.status(201).json({
      users: result,
    });
  } catch (error) {
    console.error(error)
    res.status(500).json({
      message: error,
    });
  }
}
const deleteUserController = async(req, res)=>{
  const {user_id} = req.body
  const schema = req.body.schema

  try{
    const result = await deleteUser(user_id, schema)
    res.status(204).json({
      success:true,
      users: result,
    });
  } catch (error) {
    console.error(error)
    res.status(500).json({
      message: error,
    });
  }
}

const logoutController = async (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined
    });

    res.status(200).json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({
      error: 'Erro ao fazer logout'
    });
  }
};
  module.exports = {
    createUserController,
    getAllUsersController,
    searchUserController,
    getOnlineUsersController,
    changeOfflineController,
    deleteUserController,
    updateUserController,
    searchUserByIdController,
    logoutController,
    verifyToken,
    refreshTokenController
  }