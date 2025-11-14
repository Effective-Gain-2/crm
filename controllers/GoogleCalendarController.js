const { google } = require('googleapis');
const { setPreference, getPreferencesByUser } = require('../services/UserPreferencesService');
const { createLembrete } = require('../services/LembreteService');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3002/calendar/callback'
);

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

//gerando a url de autenticação
const getAuthUrl = (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
  res.json({ url });
};

const oauthCallback = async (req, res) => {
  //Dados que usamos para vincular conta gmail com usuario do nosso sistema
  const code = req.query.code;
  const user_id = req.session.user_id
  const schema = req.session.schema
  const userRole = req.session.userRole

  if (!code || !user_id || !schema) return res.status(400).json({ error: 'Código, usuário ou schema não fornecido' });
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    //Salvando no banco de dados
    await setPreference(user_id, 'google_tokens', JSON.stringify(tokens), schema, userRole);
    res.redirect('http://localhost:3001/painel');
  } catch (err) {
    res.status(500).json({ error: 'Erro ao autenticar com Google', details: err.message });
  }
};

async function getUserGoogleTokens(user_id, schema) {
  //Pegando o token do usuario para persistencia
  const prefs = await getPreferencesByUser(user_id, schema);
  if (prefs && prefs.google_tokens) {
    return JSON.parse(prefs.google_tokens);
  }
  return null;
}

const listEvents = async (req, res) => {
  const user_id = req.query.user_id;
  const schema = req.query.schema;
  //Tratando possiveis erros
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
  //Dados importantes para a criação
  const user_id = req.body.user_id;
  const schema = req.body.schema;
  //Possiveis erros
  if (!user_id || !schema) return res.status(401).json({ error: 'Não autenticado no Google' });
  const tokens = await getUserGoogleTokens(user_id, schema);
  if (!tokens) return res.status(401).json({ error: 'Não autenticado no Google' });

  oauth2Client.setCredentials(tokens);
  const { summary, description, start, end, tag, icone, filas } = req.body;
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    //payload
    const event = {
      summary,
      description,
      start: { dateTime: start },
      end: { dateTime: end },
    };

    //Essa parte salva no google calendar
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });
    const google_event_id = response.data.id;

    //Essa é a função de criar lembretes nativa do sistema
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

//função para desconectar o google
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