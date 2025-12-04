const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { Chat } = require('../entities/Chat');
const { Message } = require('../entities/Message');
const { createChat, getChatService, setChatQueue, setUserChat, saveMediaMessage, getChatByUser, setMessageIsUnread, getChatIfUserIsNull, getChatById, updateCacheMessages } = require('../services/ChatService');
const { saveMessage } = require('../services/MessageService');
const pool = require('../db/queries');
const { getCurrentTimestamp } = require('../services/getCurrentTimestamp');
const { getBase64FromMediaMessage, sendTextMessage } = require('../requests/evolution');
const express = require('express');
const createRedisConnection = require('../config/Redis');
const { Queue, Worker } = require('bullmq');
const { getQueueById } = require('../services/QueueService');
const { createThread, messageAnAssistant, getAssistantReply } = require('../services/OpenAi');
const { updateContactInKanban } = require('../services/KanbanService');
const { createApiOfcChat, setApiChatQueue, getImageApiOfc } = require('../services/ChatApiOfc');
const { getItemByName, updateItemInStock, alterItemQuantityInStock } = require('../services/StockService');
const { getSchemaByPhoneId } = require('../services/ApiConnection');
require('dotenv').config({ path: '../.env' });


// Função para emitir chats para as filas específicas
const emitChatsToQueues = async (serverTest, schema, chat, baseChat) => {
  if (!serverTest.io) return;

  try {
    // Buscar usuários da fila do chat
    const queueUsersQuery = await pool.query(
      `SELECT user_id FROM ${schema}.queue_users WHERE queue_id = $1`,
      [chat.queue_id]
    );

    if (queueUsersQuery.rowCount > 0) {
      const userIds = queueUsersQuery.rows.map(row => row.user_id);

      // Para cada usuário da fila, buscar seus chats atualizados
      for (const userId of userIds) {
        const userChats = await getChatByUser(userId, 'user', schema);
        if (userChats && userChats.length > 0) {
          serverTest.io.to(`user_${userId}`).emit('chats_updated', userChats);
        }
      }
    }
  } catch (error) {
    console.error('Erro ao emitir chats para filas:', error);
  }
};

const emitWaitingChatsToQueue = async (serverTest, schema, connectionId, queueId) => {
  if (!serverTest.io) return;

  try {
    // Buscar todos os usuários online
    const onlineUsersQuery = await pool.query(
      `SELECT id, permission FROM ${schema}.users WHERE online = true`,
    );

    if (onlineUsersQuery.rowCount > 0) {
      const onlineUsers = onlineUsersQuery.rows;

      for (const user of onlineUsers) {
        if (user.permission === 'admin' || user.permission === 'tecnico') {
          // Admins e técnicos veem todos os chats na sala de espera
          const allWaitingChats = await getChatIfUserIsNull(connectionId, user.permission, schema);
          if (allWaitingChats && allWaitingChats.length > 0) {
            serverTest.io.to(`user_${user.id}`).emit('chats_updated', allWaitingChats);
          }
        } else {
          // Usuários normais só veem chats da sua fila
          const userQueuesQuery = await pool.query(
            `SELECT queue_id FROM ${schema}.queue_users WHERE user_id = $1`,
            [user.id]
          );

          if (userQueuesQuery.rowCount > 0) {
            const userQueues = userQueuesQuery.rows.map(row => ({ id: row.queue_id }));
            const waitingChats = await getChatIfUserIsNull(connectionId, 'user', schema, userQueues);

            if (waitingChats && waitingChats.length > 0) {
              serverTest.io.to(`user_${user.id}`).emit('chats_updated', waitingChats);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Erro ao emitir chats na sala de espera:', error);
  }
};

const updateChatStatusFromDisparo = async (chatId, schema) => {
  try {
    // Primeiro, buscar informações da fila do chat
    const chatInfo = await pool.query(
      `SELECT queue_id FROM ${schema}.chats WHERE id = $1`,
      [chatId]
    );

    if (chatInfo.rowCount > 0 && chatInfo.rows[0].queue_id) {
      // Buscar informações da fila
      const queueInfo = await pool.query(
        `SELECT distribution FROM ${schema}.queues WHERE id = $1`,
        [chatInfo.rows[0].queue_id]
      );

      let newStatus = 'waiting'; // Padrão

      if (queueInfo.rowCount > 0 && queueInfo.rows[0].distribution) {
        // Se a fila tem distribuição automática ligada, usa 'open'
        newStatus = 'open';
      }

      // Atualiza o status baseado na configuração da fila
      await pool.query(
        `UPDATE ${schema}.chats SET status = $1 WHERE id = $2 AND status = 'disparo'`,
        [newStatus, chatId]
      );
    }
  } catch (error) {
    console.error('Erro ao atualizar status do chat de disparo:', error);
  }
};

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

module.exports = (broadcastMessage) => {
  const app = express.Router();

  // Usar a instância global do socket
  const serverTest = { io: global.socketIoServer };

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  const bullConn = createRedisConnection();

  const chatQueue = new Queue('chat', { connection: bullConn });

  new Worker('chat', async (job) => {
    try {
      if (job.data.chatId) {
        broadcastMessage({ type: 'message', payload: job.data });
      }
    } catch (error) {
      console.error(error)
    }
  }, { connection: bullConn })
  const gptQueue = new Queue('gpt', { connection: bullConn });

  new Worker('gpt', async (job) => {
    try {
      const resposta = job.data.thread_id ? await getAssistantReply(job.data.thread_id, job.data.body, job.data.assistant_id, job.data.chat_id, job.data.schema) : await createThread(job.data.body, job.data.assistant_id, job.data.chat_id, job.data.schema)
      if (resposta) {
        if (typeof resposta === 'object' && resposta.functionName && resposta.executed) {
        } else if (typeof resposta === 'string') {
          const message = new Message(uuidv4(), resposta, true, job.data.chat_id, getCurrentTimestamp());
          await sendTextMessage(job.data.instance, resposta, job.data.number)
          await saveMessage(job.data.chat_id, message, job.data.schema, null)
          await updateCacheMessages(message.id, job.data.chat_id, message.fromMe, message.message, getCurrentTimestamp(), null, null, null, null, null)
          if (serverTest.io) {
            serverTest.io.to(`schema_${job.data.schema}`).emit('message', {
              chatId: job.data.chat_id,
              body: resposta,
              fromMe: true,
              timestamp: getCurrentTimestamp(),
              user_id: job.data.user_id || null,
              status: job.data.status || null,
              schema: job.data.schema || null
            })
          }
        }
      }
    } catch (error) {
      console.error(error)
    }
  }, { connection: bullConn })

  app.post('/chat', async (req, res) => {
    const result = req.body;
    if (!result?.data?.key?.remoteJid) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }
    const num = result.data.key.remoteJid.split('@')[0];
    const numberLimpo = num.length === 12
      ? num
      : num.slice(0, 4) + num.slice(5);
    const contact = result.data.key.fromMe
      ? numberLimpo
      : result.data.pushName || numberLimpo;

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
      let payload = null;
      let midiaType = null;
      let documentBase64 = null;
      let documentInfo = null;
      let fileName = null
      let mimeType = null

      const createChats = await createChat(chat, result.instance, result.data.message.conversation, null, null);
      const chatDb = await getChatService(createChats.chat.id, createChats.chat.connection_id, createChats.schema);
      const schema = createChats.schema

      if (chatDb.assigned_user === null) {
        await setUserChat(chatDb.id, schema)
      }

      const baseChat = await getChatService(createChats.chat.id, createChats.chat.connection_id, createChats.schema)
      if (result.data.key.fromMe === false) {
        await setMessageIsUnread(baseChat.id, schema)
        await updateChatStatusFromDisparo(baseChat.id, schema)
      }

      //Emitindo apenas o chat específico que foi atualizado
      if (baseChat.assigned_user !== null) {
        if (serverTest.io) {
          // Envia apenas o chat específico que foi atualizado, não todos os chats do usuário
          serverTest.io.to(`user_${baseChat.assigned_user}`).emit('chats_updated', baseChat)

          const adminUsersQuery = await pool.query(
            `SELECT id FROM ${schema}.users WHERE (permission = 'admin' OR permission = 'tecnico') AND online = true AND id != $1`,
            [baseChat.assigned_user]
          );

          if (adminUsersQuery.rowCount > 0) {
            const adminUsers = adminUsersQuery.rows.map(row => row.id);
            for (const adminId of adminUsers) {
              // Para admins, também envia apenas o chat específico
              serverTest.io.to(`user_${adminId}`).emit('chats_updated', baseChat);
            }
          }
        }
      } else {
        await emitWaitingChatsToQueue(serverTest, schema, baseChat.connection_id, baseChat.queue_id)
      }
      if (result.data.message.conversation) {
        // Mensagem de texto
        messageBody = result.data.message.conversation;
      } else if (result.data.message.audioMessage) {
        // Mensagem de áudio
        if (result.data.message.audioMessage.base64) {
          audioBase64 = result.data.message.audioMessage.base64;
        } else if (result.data.message.audioMessage.url) {
          const audioResponse = await axios.get(result.data.message.audioMessage.url, {
            responseType: 'arraybuffer',
          });
          audioBase64 = Buffer.from(audioResponse.data).toString('base64');
        }
        audioBase64 = await getBase64FromMediaMessage(result.instance, result.data.key.id);
        audioBase64 = audioBase64.base64
        midiaType = 'audio';
      } else if (result.data.message.imageMessage) {
        // Mensagem com imagem
        imageBase64 = await getBase64FromMediaMessage(result.instance, result.data.key.id);
        midiaType = 'image';
        messageBody = result.data.message.imageMessage.caption ? result.data.message.imageMessage.caption : null;
        imageBase64 = imageBase64.base64
      } else if (result.data.message.messageType === 'documentMessage' || result.data.message.documentMessage || result.data.messageType === 'documentMessage' || result.data.messageType === 'document') {
        // Mensagem com documento
        documentBase64 = await getBase64FromMediaMessage(result.instance, result.data.key.id)
        documentInfo = documentBase64;
        documentBase64 = documentBase64.base64
        midiaType = 'document';
        if (documentInfo) {
          fileName = documentInfo.fileName || documentInfo.filename || documentInfo.name || 'documento';
          mimeType = documentInfo.mimetype || documentInfo.mimeType || documentInfo.type || 'application/octet-stream';
        }
      }

      payload = {
        chatId: baseChat.id,
        body: messageBody || null,
        midiaBase64: imageBase64 || audioBase64 || documentBase64 || null,
        fromMe: result.data.key.fromMe,
        from: result.data.pushName,
        timestamp,
        message_type: result.data.messageType,
        fileName: fileName || null,
        mimeType: mimeType || null,
      }

      payload.midiaBase64 ? await saveMediaMessage(result.data.key.id, result.data.key.fromMe, chatDb.id, timestamp, midiaType, payload.midiaBase64, schema, payload.fileName, payload.mimeType) : null
      await updateCacheMessages(result.data.key.id, baseChat.id, payload.fromMe, messageBody || null, timestamp, midiaType, payload.midiaBase64 || null, null, payload.fileName || null, payload.mimeType || null, schema)
      if (serverTest.io) {
        if (baseChat.assigned_user) {
          // Envia apenas o chat específico que foi atualizado
          serverTest.io.to(`user_${baseChat.assigned_user}`).emit('chats_updated', baseChat)
        } else {
          await emitWaitingChatsToQueue(serverTest, schema, baseChat.connection_id, baseChat.queue_id)
        }
      }
      serverTest.io.to(`schema_${schema}`).emit('message', payload);


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
      const data = {
        chatId: chatDb.id,
        instance: result.instance,
        body: messageBody,
        fromMe: result.data.key.fromMe,
        from: result.data.pushName,
        timestamp,
        message_type: result.data.messageType,
        user_id: baseChat.assigned_user,
        status: baseChat.status,
        schema: schema
      };

      const queueById = await getQueueById(chatDb.queue_id, schema);

      if (queueById[0].is_webhook_on === true && queueById[0].webhook_url !== null) {
        try {
          await axios.post(queueById[0].webhook_url, data)
        } catch (error) {
          console.error(error);
        }
      }
      await chatQueue.add('new_message', data)

      queueById[0].assistant_id && baseChat.isboton ? await gptQueue.add('gpt', {
        chat_id: baseChat.id,
        thread_id: baseChat.thread_id || null,
        body: messageBody,
        assistant_id: queueById[0].assistant_id,
        instance: result.instance,
        number: numberLimpo,
        schema: schema
      }) : null

      if (!chat || !result.instance) {
        throw new Error('Dados obrigatórios ausentes para createChat');
      }
      res.status(200).json({ result });

    } catch (error) {
      console.error('Erro ao enviar para o próximo webhook:', error);
    }
  });

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

  app.post('/resposta', async (req, res) => {
    try {
      const message = new Message(
        uuidv4(),
        req.body.body,
        true,
        req.body.id,
        getCurrentTimestamp(req.body.timestamp)
      )
      await saveMessage(req.body.id, message, req.body.schema)
      await sendTextMessage(req.body.instance, req.body.body, req.body.number)
      const payload = {
        chatId: req.body.id,
        body: req.body.body,
        fromMe: true,
        timestamp: getCurrentTimestamp(req.body.timestamp),
        user_id: req.body.assigned_user
      };

      // Emitir via socket para aparecer diretamente na interface
      serverTest.io.to(`schema_${req.body.schema}`).emit('message', payload);

      res.status(200).json({ success: true })
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: error.message })
    }
  })
  app.get('/api-ofc', async (req, res) => {
    //Esse token serve apenas para teste, não se trata do valor real que utilizaremos
    const verifyToken = process.env.WHATSAPP_API_TOKEN;
    const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('WEBHOOK VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.status(403).end();
    }
  })
  app.post('/api-ofc', async (req, res) => {
    const changes = req.body.entry[0].changes;
    const phoneAndSchema = await getSchemaByPhoneId(changes[0].value.metadata.phone_number_id)
    if(!changes[0].value.contacts){
      return
    }
    if(!phoneAndSchema){
      return
    }
    const schema = phoneAndSchema.schema
    let midiaBase64 = null
    const midia_id=changes[0].value.messages[0].image?.id || changes[0].value.messages[0].audio?.id || changes[0].value.messages[0].document?.id ||null
    const chat = await createApiOfcChat(changes[0].value.contacts[0].wa_id, phoneAndSchema.phone_id.id, changes[0].value.contacts[0].wa_id, changes[0].value.contacts[0].profile.name, /*connection.queue_id*/ null, null, 'open', getCurrentTimestamp(), getCurrentTimestamp(), false, null, schema)
    if(changes[0].value.messages[0].type==='image' ||changes[0].value.messages[0].type==='audio' || changes[0].value.messages[0].type==='document'){
      midiaBase64 = await getImageApiOfc(midia_id, phoneAndSchema.token)
    }
    if (!chat) {
      res.status(500).json({ success: false, message: 'Chat não encontrado ou não vinculado a nenhuma conexão' })
      return
    }
    let message = null;
    midiaBase64?message = await saveMediaMessage(changes[0].value.messages[0].id, false, chat.id, getCurrentTimestamp(),changes[0].value.messages[0].type, midiaBase64, schema, changes[0].value.messages[0].document?.filename||null, changes[0].value.messages[0].document?.mime_type||null):message = await saveMessage(chat.id, new Message(uuidv4(), changes[0].value.messages[0].text?.body || null, false, chat.id, getCurrentTimestamp()), schema, null)
    await updateCacheMessages(message?.id, chat.id, false, changes[0].value.messages[0].text?.body||null, getCurrentTimestamp(),null, midiaBase64||null,null, changes[0].value.messages[0].document?.filename||null,  changes[0].value.messages[0].document?.mime_type||null)
    if (!serverTest.io) {
      return
    }
    serverTest.io.to(`schema_${schema}`).emit('chats_updated', {
      chat_id:chat.chat_id,
      connection_id:chat.conntection_id,
      created_at:chat.created_at,
      id:chat.id,
      is_bot_on:chat.is_bot_on,
      name:chat.name,
      number:chat.number,
      queue_id:chat.queue_id,
      status:chat.status,
      thread_id:chat.thread_id,
      updated_at:chat.updated_at,
      user_id:chat.user_id,
      isApi:true
    })
    serverTest.io.to(`schema_${schema}`).emit('message', {
      chatId: chat.id,
      body: changes[0].value.messages[0].text?.body||null,
      midiaBase64:midiaBase64 || null,
      fromMe: false,
      timestamp: getCurrentTimestamp(),
      user_id: changes[0].value.contacts[0].wa_id,
      filename:changes[0].value.messages[0].document?.filename || null,
      mimetype:changes[0].value.messages[0].document?.mime_type || null
    })
    
    res.status(200).json({ success: true, chat })
  })

  app.post('/file', async(req, res)=>{
    const {itens} = req.body
    const itensNotFound = []
    try {
      for(const item of itens.itens){
        const result = await getItemByName(item, 'effective_gain')
        if(!result?.found){
          itensNotFound.push(result.item)
        }else{
          result?await alterItemQuantityInStock(result.item[0].id, Number(item.quantidade || item.qCom), true, 'effective_gain'):null
        }
      }
      res.status(200).json({ success: true, itens_not_found:itensNotFound})

    } catch (error) {
      console.error(error)
      res.status(500).json({ success:false, error: error.message })
    }
  })

  return app;
};