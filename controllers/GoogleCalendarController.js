const { google } = require('googleapis');
const { setPreference, getPreferencesByUser } = require('../services/UserPreferencesService');
const { createLembrete } = require('../services/LembreteService');

// Configuração do OAuth2 (ajustar se necessário)
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3002/calendar/callback'
);

// Escopos necessários para o Google Calendar
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

// 1. Gerar URL de autenticação
const getAuthUrl = (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
  res.json({ url });
};

// 2. Callback de autenticação
const oauthCallback = async (req, res) => {
  const code = req.query.code;
  const user_id = req.session.user_id || req.user_id || req.query.user_id || req.body.user_id;
  const schema = req.session.schema || req.query.schema || req.body.schema;
  const userRole = req.session.userRole || req.query.userRole || req.body.userRole;
  if (!code || !user_id || !schema) return res.status(400).json({ error: 'Código, usuário ou schema não fornecido' });
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    // Salvar tokens no banco
    await setPreference(user_id, 'google_tokens', JSON.stringify(tokens), schema, userRole);
    res.redirect('http://localhost:3001/painel');
  } catch (err) {
    res.status(500).json({ error: 'Erro ao autenticar com Google', details: err.message });
  }
};

// Função utilitária para buscar tokens do banco
async function getUserGoogleTokens(user_id, schema) {
  const prefs = await getPreferencesByUser(user_id, schema);
  if (prefs && prefs.google_tokens) {
    return JSON.parse(prefs.google_tokens);
  }
  return null;
}

// 3. Listar eventos do calendário
const listEvents = async (req, res) => {
  const user_id = req.user_id || req.query.user_id || req.body.user_id;
  const schema = req.query.schema || req.body.schema;
  if (!user_id || !schema) return res.status(401).json({ error: 'Não autenticado no Google' });
  const tokens = await getUserGoogleTokens(user_id, schema);
  if (!tokens) return res.status(401).json({ error: 'Não autenticado no Google' });
  oauth2Client.setCredentials(tokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });
    res.json(response.data.items);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar eventos', details: err.message });
  }
};

const createEvent = async (req, res) => {
  const user_id = req.user_id || req.body.user_id;
  const schema = req.body.schema;
  if (!user_id || !schema) return res.status(401).json({ error: 'Não autenticado no Google' });
  const tokens = await getUserGoogleTokens(user_id, schema);
  if (!tokens) return res.status(401).json({ error: 'Não autenticado no Google' });
  oauth2Client.setCredentials(tokens);

  const { summary, description, start, end, tag, icone, filas } = req.body;
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    const event = {
      summary,
      description,
      start: { dateTime: start },
      end: { dateTime: end },
    };
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });
    const google_event_id = response.data.id;
    // Cria o lembrete do sistema já com o google_event_id
    const lembrete = await createLembrete(
      summary,
      tag || 'pessoal',
      description,
      Math.floor(new Date(start).getTime() / 1000),
      icone || 'bi-calendar-event',
      user_id,
      schema,
      filas || [],
      google_event_id
    );
    res.json({ google_event: response.data, lembrete });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar evento no Google Calendar', details: err.message });
  }
};

const disconnectGoogle = async (req, res) => {
  const user_id = req.body.user_id;
  const schema = req.body.schema;
  if (!user_id || !schema) return res.status(400).json({ error: 'Dados insuficientes' });
  try {
    await setPreference(user_id, 'google_tokens', '', schema, null);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao desconectar do Google', details: err.message });
  }
};

module.exports = { getAuthUrl, oauthCallback, listEvents, createEvent, disconnectGoogle }; 