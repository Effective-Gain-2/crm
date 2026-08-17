const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const cookieLib = require('cookie');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const googleStrategy = require('passport-google-oauth20').Strategy;

const userRoutes = require('./routes/UserRoutes');
const companyRoutes = require('./routes/CompanyRoutes');
const queueRoutes = require('./routes/QueueRoutes');
const connRoutes = require('./routes/ConnectionRoutes');
const evoRoutes = require('./routes/EvolutionRoutes');
const chatRoutes = require('./routes/ChatRoutes');
const contactRoutes = require('./routes/ContactRoute');
const kanbanRoutes = require('./routes/KanbanRoutes');
const webhook = require('./controllers/Webhook');
const filesRoutes = require('./routes/FilesRoutes');
const campaingRoutes = require('./routes/CampaingRoutes');
const tagRoutes = require('./routes/TagRoutes');
const excelRoutes = require('./routes/ExcelRoutes');
const lembreteRoutes = require('./routes/LembretesRoutes');
const preferenceRoutes = require('./routes/UserPreferencesRoutes');
const passportRoutes = require('./routes/PassportRoutes');
const googleCalendarRoutes = require('./routes/GoogleCalendarRoutes');
const reportRoutes = require('./routes/ReportRoutes');
const categoryRoutes = require('./routes/CategoryRoute');
const vendorRoutes = require('./routes/VendorRoutes');
const expensesRoutes = require('./routes/ExpensesRoutes');
const receitaRoutes = require('./routes/ReceitaRouter');
const opportunityRoutes = require('./routes/OpportunityRoutes');
const metaLeadsRoutes = require('./routes/MetaLeadsRoutes');
const aiAgentRoutes = require('./routes/AiAgentRoutes');
const attributionRoutes = require('./routes/AttributionRoutes');
const quickMessagesRoutes = require('./routes/QuickMessagesRoutes');

const { setGlobalSocket } = require('./services/LembreteService');
const { changeOnline, changeOffline } = require('./services/UserService');
const { auth, ACCESS_SECRET } = require('./middlewares/auth');
const { enforceSchema } = require('./middlewares/enforceSchema');
const { requireRole, requireTecnico } = require('./middlewares/requireRole');
const { bindAuthParams } = require('./middlewares/schemaParams');

const app = express();

// ---- Sessão (usada apenas pelo Passport/Google) ----
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'dev-session-secret',
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new googleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:3002'}/auth/google`,
  }, (accessToken, refreshToken, profile, done) => done(null, profile)));
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));
}

// ---- CORS ----
const allowedOrigins = [
  'http://localhost:3001',
  'http://localhost:3000',
  'http://localhost:3002',
  'https://eg-crm.effectivegain.com',
  'https://crm.effectivegain.com',
  'https://ilhadogovernador.effectivegain.com',
  'https://barreiras.effectivegain.com',
  'https://campo-grande.effectivegain.com',
  'https://porto-alegre.effectivegain.com',
];
const originAllowed = (origin) => !origin || allowedOrigins.includes(origin) || /\.easypanel\.host$/.test(origin);

const corsOptions = {
  origin: (origin, callback) => originAllowed(origin) ? callback(null, true) : callback(new Error('Not allowed by CORS')),
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
  credentials: true,
};

const socketCors = {
  origin: (origin, callback) => originAllowed(origin) ? callback(null, true) : callback(new Error('Not allowed by CORS')),
  methods: ['GET', 'POST'],
  credentials: true,
};

// ---- Servidores HTTP + Socket.io ----
// UMA instância de socket.io atende os DOIS servidores (API 3002 e socket 3333).
// Com instâncias separadas, quem conectava pela porta da API não recebia os
// eventos emitidos via global.socketIoServer (lembretes, filas, kanban, chats).
const server = http.createServer(app);
const socketServer = http.createServer();
const io = socketIo(server, { cors: socketCors, transports: ['websocket', 'polling'], allowEIO3: true });
io.attach(socketServer);
const socketIoServer = io;

global.socketIoServer = socketIoServer;

// ---- Autenticação do Socket.io (handshake via cookie JWT) ----
// Sem token válido a conexão é recusada — impede escutar eventos de outra empresa.
const socketAuth = (socket, next) => {
  try {
    const cookies = cookieLib.parse(socket.handshake.headers?.cookie || '');
    const token = cookies.token;
    if (!token) return next(new Error('unauthorized'));
    const decoded = jwt.verify(token, ACCESS_SECRET());
    if (decoded.typ !== 'access' || !decoded.schema) return next(new Error('unauthorized'));
    socket.auth = {
      account_id: decoded.account_id,
      local_user_id: decoded.local_user_id,
      schema: decoded.schema,
      role: decoded.role,
    };
    next();
  } catch (e) {
    next(new Error('unauthorized'));
  }
};

// Sala permitida para o socket: a do próprio schema, a do próprio usuário, ou filas (UUID)
const roomAllowed = (socket, room) => {
  if (typeof room !== 'string') return false;
  if (room === `schema_${socket.auth.schema}`) return true;
  if (room === `user_${socket.auth.local_user_id}`) return true;
  if (/^fila_[0-9a-f-]{36}$/i.test(room)) return true;
  return false;
};

io.use(socketAuth);

io.on('connection', (socket) => {
  socket.join(`schema_${socket.auth.schema}`);
  socket.join(`user_${socket.auth.local_user_id}`);

  socket.on('contatosImportados', (data) => {
    socket.broadcast.to(`schema_${socket.auth.schema}`).emit('contatosImportados', data);
  });

  socket.on('user_login', async () => {
    try {
      await changeOnline(socket.auth.local_user_id, socket.auth.schema);
    } catch (error) {
      console.error('Erro ao marcar online:', error.message);
    }
  });

  socket.on('join', (room) => {
    const target = typeof room === 'string' && !room.startsWith('user_') && !room.startsWith('schema_') && !room.startsWith('fila_')
      ? `user_${room}` : room;
    if (roomAllowed(socket, target)) socket.join(target);
  });

  socket.on('leave', (roomId) => socket.leave(roomId));

  socket.on('disconnect', async () => {
    try {
      await changeOffline(socket.auth.local_user_id, socket.auth.schema);
    } catch (error) {
      console.error('Erro ao marcar offline:', error.message);
    }
  });

  // Reemissões restritas à empresa do emissor (antes: broadcast global cross-tenant)
  socket.on('message', (message) => {
    socket.broadcast.to(`schema_${socket.auth.schema}`).emit('message', message);
  });
  socket.on('lembrete', (data) => {
    socket.broadcast.to(`schema_${socket.auth.schema}`).emit('lembrete', data);
  });
  socket.on('leadMoved', (data) => {
    socket.broadcast.to(`schema_${socket.auth.schema}`).emit('leadMoved', data);
  });
  socket.on('opportunityMoved', (data) => {
    socket.broadcast.to(`schema_${socket.auth.schema}`).emit('opportunityMoved', data);
  });
  socket.on('transferirEmMassa', (data) => {
    socket.broadcast.to(`schema_${socket.auth.schema}`).emit('transferirEmMassa', data);
  });
});

// ---- Parsers ----
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '50mb', verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ---- Gate global de autenticação/isolamento ----
// Tudo exige sessão + schema do token, exceto os públicos abaixo.
const PUBLIC_PATHS = new Set([
  'POST /api/login',
  'POST /api/select-company',
  'POST /api/refresh-token',
  'POST /api/logout',
  'GET /api/test',
]);

const requireEvolutionKey = (req, res, next) => {
  const expected = process.env.EVOLUTION_API_KEY;
  if (!expected) return next(); // sem chave configurada ainda — não bloqueia o boot
  if (req.headers.authorization === expected) return next();
  return res.status(401).json({ error: 'Webhook não autorizado' });
};

app.use((req, res, next) => {
  const key = `${req.method} ${req.path.replace(/\/+$/, '') || '/'}`;
  if (PUBLIC_PATHS.has(key)) return next();
  if (req.path.startsWith('/webhook')) return requireEvolutionKey(req, res, next);
  if (req.path.startsWith('/meta-leads')) return next(); // valida HMAC internamente
  return auth(req, res, () => enforceSchema(req, res, next));
});

// Healthcheck (usado pelo monitor de latência do frontend)
app.get('/api/test', (req, res) => res.status(200).json({ ok: true, ts: Date.now() }));

// ---- Rotas ----
// bindAuthParams neutraliza :schema/:role de URL com os valores do token.
app.use('/webhook', webhook((msg) => io.emit('message', msg)));
app.use('/api', bindAuthParams(userRoutes));
app.use('/company', requireTecnico, bindAuthParams(companyRoutes));
app.use('/queue', bindAuthParams(queueRoutes));
app.use('/connection', bindAuthParams(connRoutes));
app.use('/evo', bindAuthParams(evoRoutes));
app.use('/chat', bindAuthParams(chatRoutes));
app.use('/contact', bindAuthParams(contactRoutes));
app.use('/kanban', bindAuthParams(kanbanRoutes));
app.use('/files', bindAuthParams(filesRoutes));
app.use('/campaing', requireRole('lider'), bindAuthParams(campaingRoutes));
app.use('/tag', bindAuthParams(tagRoutes));
app.use('/excel', bindAuthParams(excelRoutes));
app.use('/lembretes', bindAuthParams(lembreteRoutes));
app.use('/preferences', bindAuthParams(preferenceRoutes));
app.use('/auth', passportRoutes);
app.use('/qmessage', bindAuthParams(quickMessagesRoutes));
app.use('/calendar', bindAuthParams(googleCalendarRoutes));
app.use('/report', bindAuthParams(reportRoutes));
app.use('/category', requireRole('master'), bindAuthParams(categoryRoutes));
app.use('/vendor', requireRole('master'), bindAuthParams(vendorRoutes));
app.use('/expenses', requireRole('master'), bindAuthParams(expensesRoutes));
app.use('/receita', requireRole('master'), bindAuthParams(receitaRoutes));
app.use('/opportunity', bindAuthParams(opportunityRoutes));
app.use('/meta-leads', metaLeadsRoutes);
app.use('/ai-agent', requireRole('master'), bindAuthParams(aiAgentRoutes));
app.use('/attribution', requireRole('lider'), bindAuthParams(attributionRoutes));

// ---- Error handler final: nenhum erro sai como HTML/stack ou derruba a request ----
// Sempre JSON {error} consistente; o front (axiosConfig) transforma em toast.
app.use((err, req, res, next) => {
  console.error(`Erro não tratado em ${req.method} ${req.originalUrl}:`, err.stack || err.message || err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.expose ? err.message : 'Erro interno do servidor' });
});

const PORT = 3002;

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT} 🚀`);
});

// ---- Migrações no boot (idempotentes) ----
// Todo deploy garante o shape do banco sozinho — sem depender de console manual.
setTimeout(async () => {
  try {
    const { ensureSchemaTables } = require('./services/CompanyService');
    const db = require('./db/queries');
    const companies = await db.query(`SELECT schema_name FROM effective_gain.companies`);
    for (const row of companies.rows) {
      try {
        await ensureSchemaTables(row.schema_name);
      } catch (e) {
        console.error(`Migração boot falhou em ${row.schema_name}:`, e.message);
      }
    }
    console.log(`Migrações de boot aplicadas em ${companies.rows.length} tenant(s)`);

    // ---- Reconciliação dos webhooks da Evolution (idempotente) ----
    // A lista de eventos só é aplicada quando a instância é CRIADA. As instâncias já
    // escaneadas ficariam sem MESSAGES_UPDATE/CHATS_UPDATE (leitura no celular) até
    // alguém reconectar o QR. Aqui todo deploy realinha as conexões existentes.
    try {
      const { setInstanceWebhook } = require('./requests/evolution');
      let ok = 0, falhas = 0;
      for (const row of companies.rows) {
        let conns = { rows: [] };
        try {
          conns = await db.query(`SELECT name FROM ${row.schema_name}.connections`);
        } catch (e) { continue; } // schema sem a tabela ainda
        for (const conn of conns.rows) {
          try {
            await setInstanceWebhook(conn.name);
            ok++;
          } catch (e) {
            falhas++;
            console.error(`Webhook não realinhado (${conn.name}):`, e.message);
          }
        }
      }
      if (ok || falhas) console.log(`Webhooks Evolution realinhados: ${ok} ok, ${falhas} falha(s)`);
    } catch (e) {
      console.error('Reconciliação de webhooks indisponível:', e.message);
    }
  } catch (e) {
    console.error('Migração de boot indisponível:', e.message);
  }
}, 5000);

// ---- Reconciliação periódica com o WhatsApp ----
// Os eventos (MESSAGES_UPDATE/CHATS_UPDATE) dão a atualização instantânea; esta varredura
// garante CONVERGÊNCIA: pega o que foi lido antes de os eventos existirem e o que se perder
// no caminho (era o caso de 44 "não lidas" no CRM contra 0 no WhatsApp), e aprende os pares
// LID↔telefone das conversas em que só nós falamos (que ficavam com o número no lugar do nome).
const RECONCILIA_MS = 5 * 60 * 1000;
const reconciliarWhatsapp = async () => {
  try {
    const { sincronizarLidsDaEvolution, sincronizarNaoLidasDaEvolution, corrigirEsperaSemFila } = require('./controllers/Webhook');
    const db = require('./db/queries');
    const companies = await db.query(`SELECT schema_name FROM effective_gain.companies`);
    for (const row of companies.rows) {
      await corrigirEsperaSemFila(row.schema_name);
      let conns = { rows: [] };
      try {
        conns = await db.query(`SELECT name FROM ${row.schema_name}.connections WHERE status = 'connected'`);
      } catch (e) { continue; }
      for (const conn of conns.rows) {
        await sincronizarLidsDaEvolution(conn.name, row.schema_name).catch((e) => console.error(`LID sync (${conn.name}):`, e.message));
        await sincronizarNaoLidasDaEvolution(conn.name, row.schema_name, socketIoServer).catch((e) => console.error(`Não lidas sync (${conn.name}):`, e.message));
      }
    }
  } catch (e) {
    console.error('Reconciliação WhatsApp indisponível:', e.message);
  }
};
setTimeout(reconciliarWhatsapp, 20000);
setInterval(reconciliarWhatsapp, RECONCILIA_MS);

// Socket global para o LembreteService
setGlobalSocket(socketIoServer);

socketServer.listen(3333, () => {
  console.log(`Socket rodando na porta 3333`);
});
