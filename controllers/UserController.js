const { createUser, getAllUsers, searchUser, changeOnline, getOnlineUsers, changeOffline, deleteUser, updateUser, getUserById, getLoginAttempts, getIp, saveLoginAttempt} = require('../services/UserService');
const { Users } = require('../entities/Users');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { getLimitsBySchema } = require('../services/LimitsService');
const { getLogs } = require('../middlewares/Log');

function verifyToken(req, res, next) {
  // Service-auth: BFF do allpfit (Next.js) usa pre-shared key. Quando bate, o
  // user/role/schema vêm de headers, o request é marcado isServiceAuth e o
  // RequireUser pula o lookup em users (não há usuário real por trás).
  const serviceKey = req.headers['x-crm-service-key'];
  if (serviceKey && process.env.CRM_SERVICE_KEY && serviceKey === process.env.CRM_SERVICE_KEY) {
    req.user_id   = req.headers['x-crm-user-id']   || process.env.DEFAULT_USER_ID;
    req.user_role = req.headers['x-crm-user-role'] || process.env.DEFAULT_USER_ROLE || 'admin';
    req.schema    = req.headers['x-crm-schema']    || process.env.DEFAULT_SCHEMA;
    req.isServiceAuth = true;
    return next();
  }

  const { token } = req.cookies;
  if (!token) {
    return res.status(401).json({error:'Token não fornecido' });
  }
  jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
    req.user_id = decoded.user_id;
    req.user_role = decoded.user_role;
    req.schema = decoded.schema || process.env.DEFAULT_SCHEMA;
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
      { user_id: refresh.user_id, schema: refresh.schema, user_role: refresh.user_role },
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
  
        const schema = req.schema;
        const result = await createUser(user, schema);
        global.socketIoServer.to(`schema_${schema}`).emit('new_user', result)
      res.status(201).json({success:true,result});
  
    } catch (err) {
      console.error("Erro ao criar usuário:", err.message);
      res.status(500).json({ error: 'Erro ao criar usuário' });
    }
  };
  const updateUserController = async (req, res) => {
    const { userId, userName, userEmail, userRole, shift_start, shift_end } = req.body;
    const schema = req.schema;
    try {
      const result = await updateUser(userId, userName, userEmail, userRole, schema, { shift_start, shift_end });
      res.status(200).json({
        message: 'Usuário atualizado com sucesso',
        user: result,
      })
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error.message);
      res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
  }
const getAllUsersController = async (req, res) => {
  const schema = req.schema;
  
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

    // Bloqueio por IP desativado a pedido do usuario. A logica original
    // tratava QUALQUER row existente em login_data como "bloqueado" (sem
    // reset por tempo nem limite minimo de attempts), o que efetivamente
    // banía pra sempre qualquer IP que ja tenha errado senha uma vez.
    // const isBlocked = await getLoginAttempts(ip, result.company.schema_name);
    // if (isBlocked) return res.status(429).json({ error: 'IP bloqueado por tentativas excessivas' });

    changeOnline(result.user.id, result.company.schema_name);


    //Bloqueando acesso caso pagamento não esteja em dia
    const limits = await getLimitsBySchema(result.company.schema_name);
    if(limits.payment==='false'){
      return res.status(402).json({ error: 'Pagamento pendente. Acesso negado.' });
    }

    const token = jwt.sign(
      { user_id: result.user.id, schema:result.company.schema_name, user_role: result.user.permission  },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { user_id: result.user.id, schema:result.company.schema_name, user_role: result.user.permission },
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
  const { user_id} = req.params;
  const schema = req.schema;
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
  const schema = req.schema
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
  const schema = req.schema
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
  const schema = req.schema

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
const googleCallbackController = async (req, res) => {
  try {

    const { code } = req.query;

    const { tokens } = await oAuth2Client.getToken(code);

    const { user, company, schema, ip, timestamp } = req.session.user;


    req.session.google_tokens = tokens;




    return res.send(`
      <script>
        // Se precisar comunicar o sucesso à janela principal, use window.opener.postMessage()
        // Mas, para o fluxo simples, basta fechar:
        window.close();
      </script>
    `);


  } catch (error) {
    console.log(error)
    console.error("Erro ao buscar usuário:", error.message);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
}

const gerarLembretesController = async (req, res) => {
  try {
    const { lembrete_name, message, date, user_id } = req.body;
    const schema = req.schema;

    console.log('=== TESTE DE INTEGRAÇÃO GOOGLE CALENDAR ===');
    console.log('Dados recebidos:', { lembrete_name, message, date, user_id, schema });

    if (!lembrete_name || !message || !date || !user_id || !schema) {
      return res.status(400).json({ error: 'Dados incompletos para teste' });
    }

    // const { getPreferencesByUser } = require('../services/UserPreferencesService');

    // // Buscar tokens do Google do usuário
    // const prefs = await getPreferencesByUser(user_id, schema);

    // if (!prefs || !prefs.google_tokens) {
    //   console.log('❌ Usuário não possui tokens do Google Calendar');
    //   return res.status(400).json({
    //     error: 'Usuário não conectado ao Google Calendar',
    //     needsAuth: true
    //   });
    // }

    console.log(req.session.google_tokens);

    const tokens = req.session.google_tokens;
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials(tokens);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Converter timestamp Unix para ISO
    const startDate = new Date(date * 1000);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // +30 minutos

    console.log('Data do evento:', {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    });

    const event = {
      summary: lembrete_name,
      description: message,
      start: { dateTime: startDate.toISOString(), timeZone: 'America/Sao_Paulo' },
      end: { dateTime: endDate.toISOString(), timeZone: 'America/Sao_Paulo' },
    };

    console.log('Criando evento no Google Calendar...');

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    console.log('✓ Evento criado com sucesso!');
    console.log('Google Event ID:', response.data.id);
    console.log('Link do evento:', response.data.htmlLink);

    res.status(201).json({
      success: true,
      message: 'Evento criado no Google Calendar com sucesso!',
      googleEvent: {
        id: response.data.id,
        summary: response.data.summary,
        start: response.data.start,
        end: response.data.end,
        htmlLink: response.data.htmlLink
      }
    });

  } catch (error) {
    console.error('❌ Erro ao criar evento no Google Calendar:', error);
    console.error('Detalhes do erro:', error.message);
    if (error.response) {
      console.error('Resposta da API:', error.response.data);
    }
    res.status(500).json({
      error: 'Erro ao criar evento no Google Calendar',
      details: error.message,
      errorType: error.constructor.name
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

const getLogsController = async (req, res) => {
  const schema = req.schema;
  try {
    const logs = await getLogs(schema);
    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Erro ao obter logs:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter logs'
    });
  }
}
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
    refreshTokenController,
    googleCallbackController,
    gerarLembretesController,
    getLogsController
  }