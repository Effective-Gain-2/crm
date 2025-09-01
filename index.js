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

const { setGlobalSocket } = require('./services/LembreteService');
const quickMessagesRoutes = require('./routes/QuickMessagesRoutes');
const { google } = require('googleapis');

const passport = require('passport')
const session = require('express-session')
const googleStrategy = require('passport-google-oauth20').Strategy


const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

const oauth2Client  = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3002/auth/redirect'
)

app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true
}))
app.use(passport.initialize())
app.use(passport.session());


passport.use(new googleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:3002/auth/google'  
},(accessToken, refreshToken, profile, done)=>{
  return done(null, profile)
}))

passport.serializeUser((user, done)=>{
  done(null, user)
})
passport.deserializeUser((user, done)=>done(null, user))

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
  credentials: true
};

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:3001',
      'http://localhost:3000',
      'http://localhost:3002',
      'https://landing-page-front.8rxpnw.easypanel.host',
      'https://eg-crm.effectivegain.com',
      'https://landing-page-teste.8rxpnw.easypanel.host/',
      'https://ilhadogovernador.effectivegain.com/',
      'https://ilhadogovernador.effectivegain.com',
      'https://barreiras.effectivegain.com',
      'https://barreiras.effectivegain.com/',
      'https://campo-grande.effectivegain.com/',
      'https://campo-grande.effectivegain.com',
      'https://porto-alegre.effectivegain.com',
      'https://porto-alegre.effectivegain.com/',
      'https://ilha-backend.9znbc3.easypanel.host'

    ], 
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

const socketServer = http.createServer();
const socketIoServer = socketIo(socketServer, {
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
      "https://ilha-backend.9znbc3.easypanel.host"
    ],
    methods: ["GET", "POST", "DELETE", "PUT"],
    allowedHeaders: ["Content-Type"],
    credentials: true
  }
});

global.socketIoServer = socketIoServer;

io.on('connection', async (socket) => {
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
  });

  socket.on('disconnect', async () => {
  });

  socket.on('contatosImportados', (data) => {
    socket.broadcast.emit('contatosImportados', data);
  });
});

socketIoServer.on('connection', async(socket) => {
  socket.on('user_login', async (data) => {
    try {
      const { userId, schema } = data;
      // const { changeOnline } = require('./services/UserService');
      // await changeOnline(userId, schema);
      socket.userId = userId;
      socket.schema = schema;
      await changeOnline(userId, schema);

      // userHeartbeats.set(`${userId}_${schema}`, Date.now());
      
    } catch (error) {
      console.error('Erro ao conectar usuário:', error);
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

  socket.on('disconnect', async (data) => {
    if (socket.userId && socket.schema) {
      try {
        await changeOffline(socket.userId, socket.schema);
        console.log(socket.userId, socket.schema);
        // const { changeOffline } = require('./services/UserService');
        // await changeOffline(socket.userId, socket.schema);
        
        // userHeartbeats.delete(`${socket.userId}_${socket.schema}`);
        
      } catch (error) {
        console.error('Erro ao desconectar usuário:', error);
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
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/webhook', webhook((msg) => io.emit('message', msg)));
app.use('/api', userRoutes);
app.use('/company', companyRoutes);
app.use('/queue', queueRoutes);
app.use('/connection', connRoutes);
app.use('/evo', evoRoutes);
app.use('/chat', chatRoutes);
app.use('/contact', contactRoutes);
app.use('/kanban', kanbanRoutes);
app.use('/files', filesRoutes);
app.use('/campaing', campaingRoutes)
app.use('/tag', tagRoutes)
app.use('/excel', excelRoutes);
app.use('/lembretes', lembreteRoutes);
app.use('/preferences', preferenceRoutes)
app.use('/auth', passportRoutes);
app.use('/qmessage', quickMessagesRoutes);
app.use('/calendar', googleCalendarRoutes);
app.use('/report', reportRoutes);
app.use('/category', categoryRoutes);
app.use('/vendor', vendorRoutes);
app.use('/expenses', expensesRoutes);
app.use('/receita', receitaRoutes);
app.use('/effective_gain', publicRoutes);
app.use('/bot', botRoutes)

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

server.listen(PORT, () => {
console.log(`Servidor rodando na porta ${PORT} 🚀`);
});



// Configurar o socket global para o LembreteService
setGlobalSocket(socketIoServer);

socketServer.listen(3333, () => {
  console.log(`Socket rodando na porta 3333`);
});

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