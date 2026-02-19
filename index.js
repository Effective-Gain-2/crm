const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
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
const campaingRoutes = require('./routes/CampaingRoutes')
const tagRoutes = require('./routes/TagRoutes')
const bodyParser = require('body-parser');
const excelRoutes = require('./routes/ExcelRoutes');
const documentRoutes = require('./routes/DocumentRoutes');
const lembreteRoutes = require('./routes/LembretesRoutes');
const preferenceRoutes = require('./routes/UserPreferencesRoutes');
const passportRoutes = require('./routes/PassportRoutes')
const googleCalendarRoutes = require('./routes/GoogleCalendarRoutes');
const reportRoutes = require('./routes/ReportRoutes');
const categoryRoutes = require('./routes/CategoryRoute');
const vendorRoutes = require('./routes/VendorRoutes');
const expensesRoutes = require('./routes/ExpensesRoutes');
const receitaRoutes = require('./routes/ReceitaRoutes');
const publicRoutes = require('./routes/PublicRoutes');
const botRoutes = require('./routes/BotRoutes');
const limitsRoutes = require('./routes/LimitsRoutes');
const stockRoutes = require('./routes/StockRoutes')
const OfcCampaingRoutes = require('./routes/OfcCampaingRoutes')
const ajudaRoutes = require('./routes/AjudaRoute');
const clientesRoutes = require('./routes/ClientesRoute');


const { setGlobalSocket } = require('./services/LembreteService');
const quickMessagesRoutes = require('./routes/QuickMessagesRoutes');
const { google } = require('googleapis');

const passport = require('passport')
const session = require('express-session')
const googleStrategy = require('passport-google-oauth20').Strategy


const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

// Trust proxy - necessário para funcionar com proxy reverso
app.set('trust proxy', 1);

// const oauth2Client  = new google.auth.OAuth2(
//   process.env.GOOGLE_CLIENT_ID,
//   process.env.GOOGLE_CLIENT_SECRET,
//   'http://localhost:3002/auth/redirect'
// )

app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true
}))
app.use(passport.initialize())
app.use(passport.session());


// passport.use(new googleStrategy({
//   clientID: process.env.GOOGLE_CLIENT_ID,
//   clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//   callbackURL: 'http://localhost:3002/auth/google'  
// },(accessToken, refreshToken, profile, done)=>{
//   return done(null, profile)
// }))

// passport.serializeUser((user, done)=>{
//   done(null, user)
// })
// passport.deserializeUser((user, done)=>done(null, user))

// const userHeartbeats = new Map();



const corsOptions = {

  origin: function (origin, callback) {

    // Permitir requests sem origin (como mobile apps ou Postman)
    if (!origin) return callback(null, true);
    
const allowedOrigins = [
      'http://localhost:3001',
      'http://localhost:3000',
      'https://landing-page-front.8rxpnw.easypanel.host',
      'https://eg-crm.effectivegain.com',
      'https://ilhadogovernador.effectivegain.com',
      'https://barreiras.effectivegain.com',
      'https://campo-grande.effectivegain.com',
      'https://porto-alegre.effectivegain.com',
      'https://ilha-backend.9znbc3.easypanel.host',
      'http://localhost:3002',
      'http://localhost:3002/'
    ];


    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
  credentials: true,
   
};

const server = http.createServer(app);
const socketIoServer = socketIo(server, {
  path: '/socket.io/',
  cors: {
    origin: [
      "http://localhost:3001",
      'http://localhost:3000',
      'http://localhost:3002',
      
      "chrome-extension://ophmdkgfcjapomjdpfobjfbihojchbko",
      "https://landing-page-teste.8rxpnw.easypanel.host",
      "https://landing-page-front.8rxpnw.easypanel.host",
      "https://eg-crm.effectivegain.com",
      "https://ilhadogovernador.effectivegain.com",
      "https://barreiras.effectivegain.com",
      "https://campo-grande.effectivegain.com",
      "https://porto-alegre.effectivegain.com",
      "https://ilha-backend.9znbc3.easypanel.host",
      "https://crm-stage.effectivegain.com",
      "http://localhost:3000"
    ],
    methods: ["GET", "POST", "DELETE", "PUT"],
    allowedHeaders: ["Content-Type"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  allowUpgrades: true
});

global.socketIoServer = socketIoServer;

socketIoServer.on('connection', async(socket) => {

  socket.on('user_login', async (data) => {
    try {
      const { userId, schema } = data;
      
      socket.userId = userId;
      socket.schema = schema;
      await changeOnline(userId, schema);
      
    } catch (error) {
      console.error('❌ Erro ao conectar usuário:', error);
    }
  });

  socket.on('join', (room) => {
    socket.join(room);
    
    if (room && typeof room === 'string' && room.length > 10) {
      socket.join(`user_${room}`);
    }
  });

  socket.on('leave', (roomId) => {
    socket.leave(roomId);
  });

  socket.on('disconnect', async (reason) => {
    if (socket.userId && socket.schema) {
      try {
        await changeOffline(socket.userId, socket.schema);
        
      } catch (error) {
        console.error('❌ Erro ao desconectar usuário:', error);
      }
    }
  });

  socket.on('message', (message) => {
    socket.broadcast.emit('message', message);
  });

  socket.on('lembrete', (data)=>{
    socket.broadcast.emit('lembrete', data);
  })

  // socket.on('page_visibility_change', async (data) => {
  //   try {
  //     const { isVisible, userId, schema } = data;
  //     const { changeOnline, changeOffline } = require('./services/UserService');
      
  //     console.log(`📥 Recebido evento page_visibility_change:`, { isVisible, userId, schema });
      
  //     if (isVisible) {
  //       await changeOnline(userId, schema);
  //       userHeartbeats.set(`${userId}_${schema}`, Date.now());
  //       console.log(`👤 Usuário ${userId} voltou à aba (online)`);
  //     } else {
  //       await changeOffline(userId, schema);
  //       userHeartbeats.delete(`${userId}_${schema}`);
  //       console.log(`👤 Usuário ${userId} saiu da aba (offline)`);
  //     }
  //   } catch (error) {
  //     console.error('Erro ao atualizar status de visibilidade:', error);
  //   }
  // });

  socket.on('leadMoved', (data) => {
    socket.broadcast.emit('leadMoved', data);
  });

  // socket.on('heartbeat', async (data) => {
  //   try {
  //     const { userId, schema } = data;
  //     const { changeOnline } = require('./services/UserService');
      
  //     await changeOnline(userId, schema);
      
  //     userHeartbeats.set(`${userId}_${schema}`, Date.now());
      
  //     console.log(`Heartbeat recebido do usuário ${userId}`);
  //   } catch (error) {
  //     console.error('Erro ao processar heartbeat:', error);
  //   }
  // });
});

app.use(cors(corsOptions));
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api/webhook', webhook((msg) => socketIoServer.emit('message', msg)));
app.get('/api/test', (_req, res) => {
  res.status(200).json({ success: true });
});
app.get('/health', (req, res) => {
  res.status(200).json({ ok: true })
})

// Rota temporária para testar emissões via Socket.io
app.get('/socket-test/:schema', (req, res) => {
  try {
    const schema = req.params.schema;
    if (!global.socketIoServer) return res.status(500).send('Socket server not initialized');
    const payload = { test: true, timestamp: Date.now(), schema };
    // Emite para a sala do schema
    global.socketIoServer.to(`schema_${schema}`).emit('chats_updated', payload);
    return res.status(200).json({ sent: true, payload });
  } catch (error) {
    console.error('Erro em /socket-test:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.use('/api/api', userRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/connection', connRoutes);
app.use('/api/evo', evoRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/kanban', kanbanRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/campaing', campaingRoutes)
app.use('/api/tag', tagRoutes)
app.use('/api/excel', excelRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/lembretes', lembreteRoutes);
app.use('/api/preferences', preferenceRoutes)
app.use('/api/auth', passportRoutes);
app.use('/api/qmessage', quickMessagesRoutes);
app.use('/api/calendar', googleCalendarRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/receita', receitaRoutes);
app.use('/api/effective_gain', publicRoutes);
app.use('/api/bot', botRoutes)
app.use('/api/limits', limitsRoutes)
app.use('/api/stock', stockRoutes)
app.use('/api/ofc-campaing', OfcCampaingRoutes)
app.use('/api/ajuda', ajudaRoutes);
app.use('/api/clientes', clientesRoutes);


const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const { changeOnline, changeOffline } = require('./services/UserService');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);





app.post('/webhook/audio', async (req, res) => {
  const { type, body, from } = req.body;

  if (type === 'audio' && body.startsWith('http')) {

    try {
      console.log('Baixando áudio do URL:', body);
      const response = await axios.get(body, { responseType: 'stream' });
      const writer = fs.createWriteStream(oggPath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      console.log('Convertendo áudio para MP3...');
      await new Promise((resolve, reject) => {
        ffmpeg(oggPath)
          .toFormat('mp3')
          .on('end', resolve)
          .on('error', reject)
          .save(mp3Path);
      });

      console.log('Áudio processado com sucesso:', mp3Path);
      res.sendStatus(200);
    } catch (error) {
      console.error('Erro ao processar áudio:', error);
      res.sendStatus(500);
    }
  } else {
    console.log('Requisição de áudio ignorada. Tipo ou URL inválido.');
    res.sendStatus(204);
  }
});


const PORT = 3002;

server.listen(PORT, '0.0.0.0', () => {
console.log(`Servidor rodando na porta ${PORT} 🚀`);
});



// Configurar o socket global para o LembreteService
setGlobalSocket(socketIoServer);

// setInterval(async () => {
//   const now = Date.now();
//   const timeout = 2 * 60 * 1000; 
  
//   for (const [key, lastHeartbeat] of userHeartbeats.entries()) {
//     if (now - lastHeartbeat > timeout) {
//       const [userId, schema] = key.split('_');
      
//       try {
//         const { changeOffline } = require('./services/UserService');
//         await changeOffline(userId, schema);
//         userHeartbeats.delete(key);
//         console.log(`⏰ Usuário ${userId} marcado como offline por timeout`);
//       } catch (error) {
//         console.error(`Erro ao marcar usuário ${userId} como offline:`, error);
//       }
//     }
//   }
// }, 60000);