const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { Chat } = require('../entities/Chat');
const { Message } = require('../entities/Message');
const { createChat, getChatService, setChatQueue, setUserChat, saveMediaMessage, getChatByUser, setMessageIsUnread, getChatIfUserIsNull, getChatById } = require('../services/ChatService');
const { saveMessage } = require('../services/MessageService');
const pool = require('../db/queries');
const { getCurrentTimestamp } = require('../services/getCurrentTimestamp');
const { getBase64FromMediaMessage } = require('../requests/evolution');
const express = require('express');
const SocketServer = require('../server');
const createRedisConnection = require('../config/Redis');
const { Queue, Worker } = require('bullmq');



ffmpeg.setFfmpegPath(ffmpegInstaller.path);



module.exports = (broadcastMessage) => {
  const serverTest = new SocketServer()
  serverTest.start()
  const app = express.Router();

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));


  const bullConn = createRedisConnection();

  const chatQueue = new Queue('chat', {connection: bullConn });

  new Worker('chat', async(job)=>{
    try{
      if(job.data.chatId){
        serverTest.io.to(job.data.chatId).emit('message', job.data);
      }
    }catch(error){
      console.error(error)
    }
  }, {connection: bullConn})

  app.post('/chat', async (req, res) => {
    const result = req.body;
    if (!result?.data?.key?.remoteJid) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }
    const contact = result.data.key.fromMe
      ? result.data.key.remoteJid.split('@')[0]
      : result.data.pushName || result.data.key.remoteJid.split('@')[0];

    try {
      const timestamp = getCurrentTimestamp()
      if (!result.data.key.remoteJid || !result.data.instanceId) {
        throw new Error('Dados obrigatórios ausentes: remoteJid ou instanceId');
      }

      const chat = new Chat(
        uuidv4(),
        result.data.key.remoteJid,
        result.data.instanceId,
        null,
        result.data.key.fromMe,
        contact,
        null,
        result.data.status,
        timestamp,
        []
      );

      let messageBody = '';
      let audioBase64 = null;
      let imageBase64 = null;
      
      const createChats = await createChat(chat, result.instance, result.data.message.conversation, null, null);
      const chatDb = await getChatService(createChats.chat.id, createChats.chat.connection_id, createChats.schema);
      const schema = createChats.schema

      if(chatDb.assigned_user===null){
        await setUserChat(chatDb.id, schema)
      }

      const baseChat = await getChatService(createChats.chat.id, createChats.chat.connection_id, createChats.schema)
      if(result.data.key.fromMe===false){
        await setMessageIsUnread(baseChat.id, schema)
      }
      if (baseChat.assigned_user !== null) {
        const userChat = await getChatByUser(baseChat.assigned_user, baseChat.permission,schema)
        serverTest.io.emit('chats_updated', userChat)
      }else{
        const chats = await getChatIfUserIsNull(baseChat.connection_id,baseChat.permission,schema)
        serverTest.io.emit('chats_updated', chats)
      }

      if (result.data.message?.conversation) {
      } else if (result.data.message?.audioMessage) {
        try {
          if (result.data.message.audioMessage.base64) {
            audioBase64 = result.data.message.base64;
          } else if (result.data.message.audioMessage.url) {
            const audioResponse = await axios.get(result.data.message.audioMessage.url, {
              responseType: 'arraybuffer',
            });
            audioBase64 = Buffer.from(audioResponse.data).toString('base64');
          }

          if (audioBase64) {
            const base64Formatado = await getBase64FromMediaMessage(result.instance, result.data.key.id)
            await saveMediaMessage(result.data.key.id, result.data.key.fromMe, chatDb.id, timestamp, 'audio', base64Formatado.base64, schema);

           messageBody = '[áudio recebido]';
           const payload = {
            chatId: chatDb.id,
            body: messageBody,
            midiaBase64: base64Formatado.base64,
            fromMe: result.data.key.fromMe,
            from: result.data.pushName,
            timestamp,
            message_type: result.data.messageType
          };
          await chatQueue.add('message', payload, { removeOnComplete: true });
          } else {
            throw new Error('Áudio não encontrado ou não processado.');
          }
        } catch (err) {
          console.error('Erro ao processar áudio:', err);
          messageBody = '[erro ao processar áudio]';
        }
      }

      if (result.data.message?.imageMessage) {
        try {
          if (result.data.message.base64) {
            imageBase64 = result.data.message.base64
          } 
          if (imageBase64) {
            const base64Formatado = await getBase64FromMediaMessage(result.instance, result.data.key.id)
            await saveMediaMessage(result.data.key.id,result.data.key.fromMe, chatDb.id, timestamp, 'image', base64Formatado.base64, schema);
            messageBody = '[imagem recebida]';
            const payload = {
            chatId: chatDb.id,
            body: messageBody,
            midiaBase64: base64Formatado.base64,
            fromMe: result.data.key.fromMe,
            from: result.data.pushName,
            timestamp,
            message_type: result.data.messageType
          };
          await chatQueue.add('message', payload, { removeOnComplete: true });
          } else {
            throw new Error('Imagem não encontrada ou não processada.');
          }
        } catch (err) {
          console.error('Erro ao processar imagem:', err);
          messageBody = '[erro ao processar imagem]';
        }
      }
      if(result.data.messageType==='conversation'){
        messageBody = result.data.message.conversation;
        const payload = {
            chatId: chatDb.id,
            body: messageBody,
            fromMe: result.data.key.fromMe,
            from: result.data.pushName,
            timestamp,
            message_type: result.data.messageType,
            user_id: baseChat.assigned_user,
            status: baseChat.status
          };
      
          await chatQueue.add('message', payload, { removeOnComplete: true });

      }
      if (!chat || !result.instance) {
        throw new Error('Dados obrigatórios ausentes para createChat');
      }

      const existingMessage = await pool.query(
        `SELECT id FROM ${schema}.messages WHERE id = $1`,
        [result.data.key.id]
      );

      if (existingMessage.rowCount === 0 && !result.data.message?.audioMessage?.base64) {
        await saveMessage(
          chatDb.id,
          new Message(
            result.data.key.id,
            messageBody,
            result.data.key.fromMe,
            result.data.key.remoteJid,
            timestamp
          ),
          schema
        );
      }
      

      res.status(200).json({ result });
    //   await axios.post(`https://n8n-n8n-start.8rxpnw.easypanel.host/${result.instance}`, data);
    // console.log('Dados enviados para o Webhook 2');
  } catch (error) {
    console.error('Erro ao enviar para o próximo webhook:', error);
  }
  });

  // ENVIO DE MENSAGEM DE TEXTO
  //atualizando aqui
  

  app.post('/chat/sendMessage', async (req, res) => {
    const { chatId, message, schema } = req.body;

    try {
      const sentMessage = {
        chatId,
        body: message,
        fromMe: true,
        timestamp: Date.now(),
      };

      broadcastMessage({ type: 'message', payload: sentMessage });

      res.status(200).json({ success: true, message: sentMessage });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const audioFolder = path.join(__dirname, '..', 'uploads');
      ensureAudioFolder(audioFolder);
      cb(null, audioFolder);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  });

  const upload = multer({ storage });

// FUNÇÃO PRA GARANTIR QUE A PASTA DE AUDIO EXISTE

  app.post('/chat/sendAudio', upload.single('audio'), async (req, res) => {
    const { chatId, schema } = req.body;
    const audioFile = req.file;

    try {
        if (!audioFile) {
            return res.status(400).json({ error: 'Áudio não encontrado' });
        }

        const audioBase64 = audioFile.buffer.toString('base64');

        const sentAudio = {
            chatId,
            body: audioBase64,
            audioUrl: null,
            fromMe: true,
            timestamp: Date.now(),
        };

        broadcastMessage({ type: 'message', payload: sentAudio });

        res.status(200).json({ success: true, message: sentAudio });
    } catch (err) {
        console.error('Erro ao enviar áudio:', err);
        res.status(500).json({ error: err.message });
    }
});

  return app;
};