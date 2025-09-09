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
const { getBase64FromMediaMessage, sendTextMessage } = require('../requests/evolution');
const express = require('express');
const createRedisConnection = require('../config/Redis');
const { Queue, Worker } = require('bullmq');
const { getQueueById } = require('../services/QueueService');
const { createThread, messageAnAssistant, getAssistantReply } = require('../services/OpenAi');

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

  const chatQueue = new Queue('chat', {connection: bullConn });

  new Worker('chat', async(job)=>{
    try{
      if(job.data.chatId){
        broadcastMessage({ type: 'message', payload: job.data });
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
      
      const createChats = await createChat(chat, result.instance, result.data.message.conversation, null, null);
      const chatDb = await getChatService(createChats.chat.id, createChats.chat.connection_id, createChats.schema);
      const schema = createChats.schema

      if(chatDb.assigned_user===null){
        await setUserChat(chatDb.id, schema)
      }

      const baseChat = await getChatService(createChats.chat.id, createChats.chat.connection_id, createChats.schema)
      if(result.data.key.fromMe===false){
        await setMessageIsUnread(baseChat.id, schema)
        await updateChatStatusFromDisparo(baseChat.id, schema)
      }
      if (baseChat.assigned_user !== null) {
        const userChat = await getChatByUser(baseChat.assigned_user, baseChat.permission, schema)
        if (serverTest.io) {
          serverTest.io.to(`user_${baseChat.assigned_user}`).emit('chats_updated', userChat)
          
          const adminUsersQuery = await pool.query(
            `SELECT id FROM ${schema}.users WHERE (permission = 'admin' OR permission = 'tecnico') AND online = true AND id != $1`,
            [baseChat.assigned_user]
          );
          
          if (adminUsersQuery.rowCount > 0) {
            const adminUsers = adminUsersQuery.rows.map(row => row.id);
            for (const adminId of adminUsers) {
              const adminChats = await getChatByUser(adminId, 'admin', schema);
              if (adminChats && adminChats.length > 0) {
                serverTest.io.to(`user_${adminId}`).emit('chats_updated', adminChats);
              }
            }
          }
        }
      } else {
        await emitWaitingChatsToQueue(serverTest, schema, baseChat.connection_id, baseChat.queue_id)
      }

      if (result.data.message?.conversation) {
      } else if (result.data.message?.audioMessage) {
        try {
          if (result.data.message.audioMessage.base64) {
            audioBase64 = result.data.message.audioMessage.base64;
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
          if (serverTest.io) {
          // Emitir chats atualizados baseado no status
          if (baseChat.assigned_user !== null) {
            const userChat = await getChatByUser(baseChat.assigned_user, baseChat.permission, schema)
            serverTest.io.to(`user_${baseChat.assigned_user}`).emit('chats_updated', userChat)
            
            // Emitir para admins e técnicos
            const adminUsersQuery = await pool.query(
              `SELECT id FROM ${schema}.users WHERE (permission = 'admin' OR permission = 'tecnico') AND online = true AND id != $1`,
              [baseChat.assigned_user]
            );
            
            if (adminUsersQuery.rowCount > 0) {
              const adminUsers = adminUsersQuery.rows.map(row => row.id);
              for (const adminId of adminUsers) {
                const adminChats = await getChatByUser(adminId, 'admin', schema);
                if (adminChats && adminChats.length > 0) {
                  serverTest.io.to(`user_${adminId}`).emit('chats_updated', adminChats);
                }
              }
            }
          } else {
            await emitWaitingChatsToQueue(serverTest, schema, baseChat.connection_id, baseChat.queue_id)
          }
          const messagePayload = {
            chatId: chatDb.id,
            fromMe: result.data.key.fromMe,
            from: result.data.pushName,
            timestamp,
            message_type: result.data.messageType,
            user_id: baseChat.assigned_user,
            base64: base64Formatado.base64,
            status: baseChat.status,
            schema: schema
          };
          serverTest.io.to(`schema_${schema}`).emit('message', messagePayload);
        }
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
          let imageBase64 = null;

          // Se não conseguiu pela URL, tenta via API
          if (!imageBase64) {
            const base64Formatado = await getBase64FromMediaMessage(result.instance, result.data.key.id)
            imageBase64 = base64Formatado.base64;
          }
          
          if (imageBase64) {
            await saveMediaMessage(result.data.key.id, result.data.key.fromMe, chatDb.id, timestamp, 'image', imageBase64, schema);
            messageBody = '[imagem recebida]';
            const payload = {
            chatId: chatDb.id,
            body: messageBody,
            midiaBase64: imageBase64,
            fromMe: result.data.key.fromMe,
            from: result.data.pushName,
            timestamp,
            message_type: result.data.messageType
          };

          if (serverTest.io) {
            // Emitir chats atualizados baseado no status
            if (baseChat.assigned_user !== null) {
              const userChat = await getChatByUser(baseChat.assigned_user, baseChat.permission, schema)
              serverTest.io.to(`user_${baseChat.assigned_user}`).emit('chats_updated', userChat)
              
              // Emitir para admins e técnicos
              const adminUsersQuery = await pool.query(
                `SELECT id FROM ${schema}.users WHERE (permission = 'admin' OR permission = 'tecnico') AND online = true AND id != $1`,
                [baseChat.assigned_user]
              );
              
              if (adminUsersQuery.rowCount > 0) {
                const adminUsers = adminUsersQuery.rows.map(row => row.id);
                for (const adminId of adminUsers) {
                  const adminChats = await getChatByUser(adminId, 'admin', schema);
                  if (adminChats && adminChats.length > 0) {
                    serverTest.io.to(`user_${adminId}`).emit('chats_updated', adminChats);
                  }
                }
              }
            } else {
              await emitWaitingChatsToQueue(serverTest, schema, baseChat.connection_id, baseChat.queue_id)
            }
            const messagePayload = {
              chatId: chatDb.id,
              fromMe: result.data.key.fromMe,
              from: result.data.pushName,
              timestamp,
              message_type: result.data.messageType,
              user_id: baseChat.assigned_user,
              base64: imageBase64,
              status: baseChat.status,
              schema: schema
            };
            serverTest.io.to(`schema_${schema}`).emit('message', messagePayload);
          }

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
     
      
        if (serverTest.io) {
          // Emitir chats atualizados baseado no status
          if (baseChat.assigned_user !== null) {
            const userChat = await getChatByUser(baseChat.assigned_user, baseChat.permission, schema)
            serverTest.io.to(`user_${baseChat.assigned_user}`).emit('chats_updated', userChat)
            
            // Emitir para admins e técnicos
            const adminUsersQuery = await pool.query(
              `SELECT id FROM ${schema}.users WHERE (permission = 'admin' OR permission = 'tecnico') AND online = true AND id != $1`,
              [baseChat.assigned_user]
            );
            
            if (adminUsersQuery.rowCount > 0) {
              const adminUsers = adminUsersQuery.rows.map(row => row.id);
              for (const adminId of adminUsers) {
                const adminChats = await getChatByUser(adminId, 'admin', schema);
                if (adminChats && adminChats.length > 0) {
                  serverTest.io.to(`user_${adminId}`).emit('chats_updated', adminChats);
                }
              }
            }
          } else {
            await emitWaitingChatsToQueue(serverTest, schema, baseChat.connection_id, baseChat.queue_id)
          }
          const messagePayload = {
            chatId: chatDb.id,
            body: messageBody,
            fromMe: result.data.key.fromMe,
            from: result.data.pushName,
            timestamp,
            message_type: result.data.messageType,
            user_id: baseChat.assigned_user,
            status: baseChat.status,
            schema: schema
          };
          serverTest.io.to(`schema_${schema}`).emit('message', messagePayload);
        }
      
        await chatQueue.add('message', payload, { removeOnComplete: true });
        
      }
      if (!chat || !result.instance) {
        throw new Error('Dados obrigatórios ausentes para createChat');
      }

      
      if(result.data.message.messageType === 'documentMessage' || result.data.message.documentMessage || result.data.messageType === 'documentMessage' || result.data.messageType === 'document'){
        let documentBase64 = null
        let documentInfo = null
        const base64Formatado = await getBase64FromMediaMessage(result.instance, result.data.key.id)
        documentBase64 = base64Formatado.base64;
        documentInfo = base64Formatado;
        

        if(documentBase64){
          // Extrair informações do documento
          const filename = documentInfo.fileName || documentInfo.filename || documentInfo.name || 'documento';
          const mimetype = documentInfo.mimetype || documentInfo.mimeType || documentInfo.type || 'application/octet-stream';
          
          
          // Salvar com informações adicionais
          await saveMediaMessage(result.data.key.id, result.data.key.fromMe, chatDb.id, timestamp, 'document', documentBase64, schema, filename, mimetype);
        }
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
      const queue = await getQueueById(baseChat.queue_id, schema)
        if(queue[0].assistant_id){
        if(baseChat.isboton==='on' || baseChat.isboton===true || baseChat.botchating===true){
            const assistant_id = queue[0].assistant_id
            if(!baseChat.thread_id){
              await createThread(messageBody, assistant_id, baseChat.id, schema)
            }else{
              const resposta = await getAssistantReply(baseChat.thread_id, messageBody, assistant_id, baseChat.id, schema)
              if(resposta){
                await sendTextMessage(result.instance, resposta, baseChat.contact_phone)
                const message = await saveMessage(baseChat.id, new Message(uuidv4(), resposta, true, baseChat.id, getCurrentTimestamp()), schema, null)
                messagePayload={
                  id: message.id,
                  chatId:baseChat.id,
                  contact_name:baseChat.contact_name,
                  body:resposta,
                  from_me: true,
                  timestamp: timestamp,
                  message_type:null,
                  base64:null,
                  user_id:baseChat.user_id
                }
          serverTest.io.to(baseChat.id).emit('message', messagePayload)
              }
              
            }
          }
      }
      const data = {
        chatId: chatDb.id,
        instance:result.instance,
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

      if(queueById[0].is_webhook_on === true && queueById[0].webhook_url !== null){
        try {
          await axios.post(queueById[0].webhook_url, data)
        } catch (error) {
          console.error(error);
        }
      }


      res.status(200).json({ result });

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

app.post('/resposta', async(req, res)=>{
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
        
        res.status(200).json({success:true})
    } catch (error) {
        console.error(error)
        res.status(500).json({error: error.message})
    }
})

  return app;
};