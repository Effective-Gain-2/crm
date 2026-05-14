const express = require('express');
const { getAuthUrl, oauthCallback, listEvents, createEvent, disconnectGoogle } = require('../controllers/GoogleCalendarController');
const { verifyToken } = require('../controllers/UserController');
const { allowedRoles } = require('../middlewares/RequireUser');
const router = express.Router();

// 1. Gerar URL de autenticação (precisa de auth — só usuário logado pode iniciar OAuth)
router.get('/auth-url', verifyToken, allowedRoles(), getAuthUrl);

// 2. Callback do Google — vem direto do Google, sem JWT. Mantém público.
router.get('/callback', oauthCallback);

// 3. Listar eventos do calendário
router.get('/events', verifyToken, allowedRoles(), listEvents);

// 4. Criar evento no calendário
router.post('/events', verifyToken, allowedRoles(), createEvent);

// Desconectar Google Calendar
router.post('/disconnect', verifyToken, allowedRoles(), disconnectGoogle);

// Salva user_id e schema na sessão antes do OAuth
router.post('/set-session', verifyToken, allowedRoles(), (req, res) => {
  // Confia no JWT em vez do body — evita user_id forjado.
  req.session.user_id = req.user_id;
  req.session.schema = req.schema;
  req.session.userRole = req.user_role;
  res.json({ ok: true });
});

module.exports = router;