const express = require('express');
const { getAuthUrl, oauthCallback, listEvents, createEvent, disconnectGoogle } = require('../controllers/GoogleCalendarController');
const router = express.Router();

// 1. Gerar URL de autenticação
router.get('/auth-url', getAuthUrl);

// 2. Callback do Google
router.get('/callback', oauthCallback);

// 3. Listar eventos do calendário
router.get('/events', listEvents);

// 4. Criar evento no calendário
router.post('/events', createEvent);

// Desconectar Google Calendar
router.post('/disconnect', disconnectGoogle);

// Salva user_id e schema na sessão antes do OAuth
router.post('/set-session', (req, res) => {
  req.session.user_id = req.body.user_id;
  req.session.schema = req.body.schema;
  req.session.userRole = req.body.userRole;
  res.json({ ok: true });
});

module.exports = router; 