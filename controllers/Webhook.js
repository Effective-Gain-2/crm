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
const { saveMessage, updateMessageChat } = require('../services/MessageService');
const pool = require('../db/queries');
const { getCurrentTimestamp } = require('../services/getCurrentTimestamp');
const { getBase64FromMediaMessage, sendTextMessage } = require('../requests/evolution');
const express = require('express');
const createRedisConnection = require('../config/Redis');
const { Queue, Worker } = require('bullmq');
const { getQueueById } = require('../services/QueueService');
const { createThread, messageAnAssistant, getAssistantReply, speechToText } = require('../services/OpenAi');
const { updateContactInKanban, getSpecificContactInKanban, insertContactInKanbanByStageId } = require('../services/KanbanService');
const { createApiOfcChat, setApiChatQueue, getImageApiOfc } = require('../services/ChatApiOfc');
const { getItemByName, updateItemInStock, alterItemQuantityInStock } = require('../services/StockService');
const { getSchemaByPhoneId } = require('../services/ApiConnection');
const { getBotById, isNumberAllowedForBot } = require('../services/BotService');
const { canCall } = require('../compilance/compilance.service');
const { configDotenv } = require('dotenv');
const { getContactByNumber, createContact } = require('../services/ContactService');
const { createCall } = require('./VoiceController');
const { getTenant } = require('../middlewares/webhookMiddleware');
const { extractFromTranscript, insertDNC } = require('../services/ExtractionService');
const { score } = require('../services/ScoreService');
const { scheduleLeadSummary } = require('../services/LeadSummaryWorker');
const { fireTrigger: fireWorkflowTrigger } = require('../services/WorkflowTrigger');
require('dotenv').config({ path: '../.env' });

// Função para emitir chats para as filas específicas
const emitChatsToQueues = async (schema, chat, baseChat) => {
  if (!global.socketIoServer) return;

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
          global.socketIoServer.to(`user_${userId}`).emit('chats_updated', userChats);
        }
      }
    }
  } catch (error) {
    console.error('Erro ao emitir chats para filas:', error);
  }
};

const emitWaitingChatsToQueue = async (schema, connectionId, queueId) => {
  if (!global.socketIoServer) return;

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
            global.socketIoServer.to(`user_${user.id}`).emit('chats_updated', allWaitingChats);
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
              global.socketIoServer.to(`user_${user.id}`).emit('chats_updated', waitingChats);
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
      if (job.attemptsMade > 1) {
        console.error('Áudio falhou após múltiplas tentativas');
        throw new Error('Max retries exceeded for audio processing');
      }
      console.error(error)
    }
  }, { connection: bullConn, maxRetries: 1 })
  const gptQueue = new Queue('gpt', { connection: bullConn });

  new Worker('gpt', async (job) => {
    try {
      const gptData = await getBotById(job.data.assistant_id, job.data.schema)

      if (gptData && gptData.test_mode) {
        const allowed = await isNumberAllowedForBot(job.data.assistant_id, job.data.number, job.data.schema)
        if (!allowed) {
          return
        }
      }

      if (gptData && gptData.init_time && gptData.end_time) {
        // Bot só responde DENTRO do horário comercial configurado.
        // Fora dele (antes de init OU depois de end), aborta.
        const init_time = parseInt(gptData.init_time.split(':')[0], 10)
        const end_time = parseInt(gptData.end_time.split(':')[0], 10)
        const currentHour = new Date().getHours()
        if (currentHour < init_time || currentHour >= end_time) {
          return
        }
      }
      // Cooldown de 30min após msg do atendente foi removido: o auto-disable
      // do bot quando o atendente envia (controllers/Chat/Evolution) já desliga
      // isboton, então esse gate ficou redundante e travava re-ativação manual.
      const formData = new FormData();
      let body = job.data.body;

      if (job.data.type === 'audio' && job.data.base64) {
        let base64 = job.data.base64;
        if (base64.includes(',')) {
          base64 = base64.split(',')[1];
        }
        const buffer = Buffer.from(base64, 'base64');

        const file = new File(
          [buffer],
          'audio.ogg', // ajuste ao formato real
          { type: 'audio/ogg' }
        );

        body = await speechToText(file);

      }

      let threadId = job.data.thread_id
      if (!threadId) {
        threadId = await createThread(job.data.assistant_id, job.data.chat_id, job.data.schema)
        if (!threadId) {
          console.error('Nao foi possivel criar thread OpenAI para chat', job.data.chat_id)
          return
        }
      }
      const resposta = await getAssistantReply(threadId, body, job.data.assistant_id, job.data.chat_id, job.data.schema)
      if (!resposta) {
        console.warn('Bot nao retornou resposta para chat', job.data.chat_id)
      }
      if (resposta) {
        if (typeof resposta === 'object' && resposta.functionName && resposta.executed) {
        } else if (typeof resposta === 'string') {
          const message = new Message(uuidv4(), resposta, true, job.data.chat_id, getCurrentTimestamp());
          await sendTextMessage(job.data.instance, resposta, job.data.number)
          await saveMessage(job.data.chat_id, message, job.data.schema, null)
          await updateCacheMessages(message.id, job.data.chat_id, message.fromMe, message.message, getCurrentTimestamp(), null, null, null, null, null)
          if (global.socketIoServer) {
            global.socketIoServer.to(`schema_${job.data.schema}`).emit('message', {
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
      if (job.attemptsMade > 1) {
        console.error('Áudio falhou após múltiplas tentativas');
        throw new Error('Max retries exceeded for audio processing');
      }
      console.error(error)
    }
  }, { connection: bullConn })

  app.post('/call', getTenant, async (req, res) => {
    const body=req.body
    const schema=req.schema
    res.status(200).json({ success: true });
    if(body.message.type === 'end-of-call-report' || body.message.type === 'transcription' || body.message.type === 'call.ended') {
      const call = await pool.query(`SELECT * FROM ${schema}.voice_calls WHERE vapi_call_id = $1`, [body.message.call.id])
      const transcription = await pool.query(`INSERT INTO ${schema}.voice_transcripts(call_id, tenant_id, transcript_raw, extraction_at) VALUES ($1, $2, $3, $4) RETURNING *`, [call.rows[0].id, schema, JSON.stringify(body.message.artifact.transcript), new Date()])
      const transcriptionResume = await extractFromTranscript(transcription.rows[0].transcript_raw, body.message.call.duration_seconds)
      await pool.query(`UPDATE ${schema}.voice_transcripts SET extracted_data = $1 WHERE id = $2`, [transcriptionResume.data, transcription.rows[0].id])
      const scoreData = await score(transcriptionResume.data)
      await pool.query(`INSERT INTO ${schema}.voice_scores(call_id, tenant_id, score_financial, score_urgency, score_engagement, score_composite, classification, hot_override, score_inputs, scored_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [call.rows[0].id, schema, scoreData.score_financial, scoreData.score_urgency, scoreData.score_engagement, scoreData.score_composite, scoreData.classification, scoreData.hot_override, scoreData, new Date()])
      const costs = body.message.costs
      await insertDNC({objections:transcriptionResume.data.objections, phone: call.rows[0].phone_dialed, schema: schema})
      let totalAmount  = costs.reduce((total, cost) => total + parseFloat(cost.cost), 0)
      const voiceCost = await pool.query(`INSERT INTO ${schema}.voice_costs(call_id, tenant_id, cost_vapi_usd, cost_telnyx_usd, cost_wa_brl, cost_llm_usd, cost_total_brl, exchange_rate, recorded_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`, [call.rows[0].id, schema, body.message.costBreakdown.total, costs.find(cost => cost.type === 'telnyx')?.cost || null, costs.find(cost => cost.type === 'wa')?.cost || null, costs.find(cost=>cost.type==='model').cost, body.message.costBreakdown.total* 5, 5.0, new Date()])
      await axios.post('https://n8n-n8n-start.8rxpnw.easypanel.host/webhook-test/everything',{transcription_resume:transcriptionResume, score:scoreData, costs: voiceCost.rows[0]})
    }
    const data = {
      schema:schema,
      lead_id: body.message.customer.number,
      vapi_call_id:body.message.call.id,
      idempotency_key:`call_${body.message.customer.number}_${Math.floor(Date.now() / 60000)}`,
      status:body.message.status,
      phone_dialed:body.message.customer.number,
      attempt_number:1,
      cost_estimated:body.message.call.cost,
      metadata_json:req.body,
      started_at:body.message.startedAt,
      created_at:new Date(),
    }
    const call = await createCall(data)
  })

  app.post('/leads/intake', async (req, res) => {
    const {name, number} = req.body
    const schema = req.schema
    if (!name || !number) {
      return res.status(400).json({ error: 'name e number são obrigatórios' });
    }
    const normalizedNumber = number.replace(/\D/g, '');
    try {
      const existingContact = await getContactByNumber(normalizedNumber, schema);

      if (existingContact) {
        return res.status(200).json({ contact: existingContact, isNew: false });
      } 
      
      const contact = await createContact(normalizedNumber, name, null, null, schema )
      const consent = await pool.query(`INSERT INTO ${schema}.lead_consents (lead_id, tenant_id, consent_text, channel, granted_at) VALUES ($1, $2, $3, $4, $5) RETURNING *`, [contact.contact.number, schema, 'O cliente consentiu em receber mensagens via WhatsApp', 'whatsapp', getCurrentTimestamp()])
      return res.status(201).json({ contact: contact.contact, isNew: true , consent: consent.rows[0]});
    } catch (error) {
      console.error(error)
    }

  })

  app.post('/chat', async (req, res) => {
    res.sendStatus(200)
    const result = req.body;
    const correctRemoteJid = result.data.key.remoteJid.includes('@s.whatsapp.net') || result.data.key.remoteJid.includes('@c.us') ? result.data.key.remoteJid : result.data.key.remoteJidAlt
    if (!result?.data?.key?.remoteJid) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }
    if (!correctRemoteJid) {
      return null
    }

    const num = correctRemoteJid.split('@')[0];
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
        correctRemoteJid,
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
        if (global.socketIoServer) {
          // Envia apenas o chat específico que foi atualizado, não todos os chats do usuário
          global.socketIoServer.to(`user_${baseChat.assigned_user}`).emit('chats_updated', baseChat)

          const adminUsersQuery = await pool.query(
            `SELECT id FROM ${schema}.users WHERE (permission = 'admin' OR permission = 'tecnico') AND online = true AND id != $1`,
            [baseChat.assigned_user]
          );

          if (adminUsersQuery.rowCount > 0) {
            const adminUsers = adminUsersQuery.rows.map(row => row.id);
            for (const adminId of adminUsers) {
              // Para admins, também envia apenas o chat específico
              global.socketIoServer.to(`user_${adminId}`).emit('chats_updated', baseChat);
            }
          }
        }
      } else {
        await emitWaitingChatsToQueue(schema, baseChat.connection_id, baseChat.queue_id)
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

      // Persistir ANTES de emitir socket — evita "mensagens somem ao reabrir
      // o chat" se algum INSERT falhar e o emit já tiver mostrado a mensagem.
      const existingMessage = await pool.query(
        `SELECT id FROM ${schema}.messages WHERE id = $1`,
        [result.data.key.id]
      );

      if (existingMessage.rowCount === 0) {
        // Conta mensagens previas antes de inserir a nova para detectar
        // "primeira mensagem do lead" (usado abaixo para agendar resumo 24h).
        let priorCount = 0;
        try {
          const cnt = await pool.query(
            `SELECT COUNT(*)::int AS c FROM ${schema}.messages WHERE chat_id = $1`,
            [chatDb.id]
          );
          priorCount = cnt.rows[0].c;
        } catch (_) {}

        try {
          if (payload.midiaBase64) {
            await saveMediaMessage(result.data.key.id, result.data.key.fromMe, chatDb.id, timestamp, midiaType, payload.midiaBase64, schema, payload.fileName, payload.mimeType);
          } else if (!result.data.message?.audioMessage?.base64) {
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
        } catch (persistErr) {
          console.error('Falha ao persistir mensagem recebida:', persistErr);
        }

        // Trigger do resumo 24h: somente quando a primeira mensagem do chat
        // veio do cliente. Idempotente via jobId estavel.
        if (priorCount === 0 && result.data.key.fromMe === false) {
          scheduleLeadSummary(schema, chatDb.id);
        }

        // Triggers de workflow: new_message sempre que cliente envia,
        // first_message só na primeira (priorCount=0).
        if (result.data.key.fromMe === false) {
          const wfContext = {
            chat: baseChat,
            contact: { name: chatDb.contact_name, number: chatDb.contact_phone },
            message: { id: result.data.key.id, body: messageBody, type: midiaType || 'text' },
          };
          const wfPayload = {
            chat_id: chatDb.id,
            queue_id: chatDb.queue_id,
            contact_phone: chatDb.contact_phone,
            body: messageBody,
          };
          fireWorkflowTrigger(schema, 'new_message', { ...wfPayload, ...wfContext });
          if (priorCount === 0) {
            fireWorkflowTrigger(schema, 'first_message', { ...wfPayload, ...wfContext });
          }
        }
      }

      await updateCacheMessages(result.data.key.id, baseChat.id, payload.fromMe, messageBody || null, timestamp, midiaType, payload.midiaBase64 || null, null, payload.fileName || null, payload.mimeType || null, schema)
      if (global.socketIoServer) {
        if (baseChat.assigned_user) {
          global.socketIoServer.to(`user_${baseChat.assigned_user}`).emit('chats_updated', baseChat)
        } else {
          await emitWaitingChatsToQueue(schema, baseChat.connection_id, baseChat.queue_id)
        }
      }
      global.socketIoServer.to(`schema_${schema}`).emit('message', payload);
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
      if (queueById[0].stage_id) {
        const stageKanban = await getSpecificContactInKanban(numberLimpo, schema);
        stageKanban ? null : await insertContactInKanbanByStageId(queueById[0].stage_id, numberLimpo, schema);
      }

      if (queueById[0].is_webhook_on === true && queueById[0].webhook_url !== null) {
        try {
          await axios.post(queueById[0].webhook_url, data)
        } catch (error) {
          console.error(error);
        }
      }

      await chatQueue.add('new_message', data)
      if (data.fromMe === true) {
        await updateMessageChat(data.chatId, data, schema)
        return
      }
      queueById[0].assistant_id && baseChat.isboton ? await gptQueue.add('gpt', {
        chat_id: baseChat.id,
        thread_id: baseChat.thread_id || null,
        body: messageBody,
        assistant_id: queueById[0].assistant_id,
        instance: result.instance,
        number: numberLimpo,
        schema: schema,
        updated_at: baseChat.last_user_message,
        base64: payload.midiaBase64 || null,
        type: midiaType || null,
      }) : null

      if (!chat || !result.instance) {
        throw new Error('Dados obrigatórios ausentes para createChat');
      }

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
      global.socketIoServer.to(`schema_${req.body.schema}`).emit('message', payload);

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
    if (!changes[0].value.contacts) {
      return
    }
    if (!phoneAndSchema) {
      return
    }
    const schema = phoneAndSchema.schema
    let midiaBase64 = null
    const midia_id = changes[0].value.messages[0].image?.id || changes[0].value.messages[0].audio?.id || changes[0].value.messages[0].document?.id || null
    const chat = await createApiOfcChat(changes[0].value.contacts[0].wa_id, phoneAndSchema.phone_id.id, changes[0].value.contacts[0].wa_id, changes[0].value.contacts[0].profile.name, /*connection.queue_id*/ null, null, 'open', getCurrentTimestamp(), getCurrentTimestamp(), false, null, schema)
    if (changes[0].value.messages[0].type === 'image' || changes[0].value.messages[0].type === 'audio' || changes[0].value.messages[0].type === 'document') {
      midiaBase64 = await getImageApiOfc(midia_id, phoneAndSchema.token)
    }
    if (!chat) {
      res.status(500).json({ success: false, message: 'Chat não encontrado ou não vinculado a nenhuma conexão' })
      return
    }
    let message = null;
    midiaBase64 ? message = await saveMediaMessage(changes[0].value.messages[0].id, false, chat.id, getCurrentTimestamp(), changes[0].value.messages[0].type, midiaBase64, schema, changes[0].value.messages[0].document?.filename || null, changes[0].value.messages[0].document?.mime_type || null) : message = await saveMessage(chat.id, new Message(uuidv4(), changes[0].value.messages[0].text?.body || null, false, chat.id, getCurrentTimestamp()), schema, null)
    await updateCacheMessages(message?.id, chat.id, false, changes[0].value.messages[0].text?.body || null, getCurrentTimestamp(), null, midiaBase64 || null, null, changes[0].value.messages[0].document?.filename || null, changes[0].value.messages[0].document?.mime_type || null)
    if (!global.socketIoServer) {
      return
    }
    global.socketIoServer.to(`schema_${schema}`).emit('chats_updated', {
      chat_id: chat.chat_id,
      connection_id: chat.conntection_id,
      created_at: chat.created_at,
      id: chat.id,
      is_bot_on: chat.is_bot_on,
      name: chat.name,
      number: chat.number,
      queue_id: chat.queue_id,
      status: chat.status,
      thread_id: chat.thread_id,
      updated_at: chat.updated_at,
      user_id: chat.user_id,
      isApi: true
    })
    global.socketIoServer.to(`schema_${schema}`).emit('message', {
      chatId: chat.id,
      body: changes[0].value.messages[0].text?.body || null,
      midiaBase64: midiaBase64 || null,
      fromMe: false,
      timestamp: getCurrentTimestamp(),
      user_id: changes[0].value.contacts[0].wa_id,
      filename: changes[0].value.messages[0].document?.filename || null,
      mimetype: changes[0].value.messages[0].document?.mime_type || null
    })

    res.status(200).json({ success: true, chat })
  })

  app.post('/file', async (req, res) => {
    const { itens } = req.body
    const itensNotFound = []
    try {
      for (const item of itens.itens) {
        const result = await getItemByName(item, 'effective_gain')
        if (!result?.found) {
          itensNotFound.push(result.item)
        } else {
          result ? await alterItemQuantityInStock(result.item[0].id, Number(item.quantidade || item.qCom), true, 'effective_gain') : null
        }
      }
      res.status(200).json({ success: true, itens_not_found: itensNotFound })

    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, error: error.message })
    }
  })

  return app;
};