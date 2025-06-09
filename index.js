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
const bodyParser = require('body-parser');

const cors = require('cors');
const configureSocket = require('./config/SocketConfig');

const app = express();


const corsOptions = {
  origin: ['http://localhost:3001',
    'https://landing-page-front.8rxpnw.easypanel.host',
    'https://eg-crm.effectivegain.com',
    'https://ilhadogovernador.effectivegain.com/',
    'https://ilhadogovernador.effectivegain.com'
  ],
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
};

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:3001',
      'https://landing-page-front.8rxpnw.easypanel.host',
      'https://eg-crm.effectivegain.com',
      'https://landing-page-teste.8rxpnw.easypanel.host/',
      'https://ilhadogovernador.effectivegain.com/',
      'https://ilhadogovernador.effectivegain.com'
    ], 
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
  },
});

io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

app.use(cors(corsOptions));
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

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
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

configureSocket(io, server);

const PORT = 3002;

server.listen(PORT, () => {
console.log(`Servidor rodando na porta ${PORT} 🚀`);
});