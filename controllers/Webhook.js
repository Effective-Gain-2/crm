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
const { getBase64FromMediaMessage, sendTextMessage, setInstanceWebhook } = require('../requests/evolution');
const aiAgent = require('../services/AiAgentService');
const express = require('express');
const createRedisConnection = require('../config/Redis');
const { Queue, Worker } = require('bullmq');
const { getQueueById } = require('../services/QueueService');
const { setConnectionStatusByName } = require('../services/ConnectionService');
const { isValidSchema } = require('../utils/validateSchema');

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
        if (user.permission === 'admin' || user.permission === 'tecnico' || user.permission === 'master') {
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

// Resolve o schema a partir do nome da instância Evolution.
// Instâncias novas: "<schema>__<nome>" → O(1). Legado: varre connections por empresa registrada.
const resolveSchemaByInstance = async (instanceName) => {
  if (typeof instanceName === 'string' && instanceName.includes('__')) {
    const prefix = instanceName.split('__')[0];
    if (await isValidSchema(prefix)) return prefix;
  }
  const companies = await pool.query(`SELECT schema_name FROM effective_gain.companies`);
  for (const row of companies.rows) {
    try {
      const found = await pool.query(
        `SELECT 1 FROM ${row.schema_name}.connections WHERE name = $1 LIMIT 1`, [instanceName]
      );
      if (found.rowCount > 0) return row.schema_name;
    } catch (e) { /* schema sem tabela */ }
  }
  return null;
};

const mapConnectionState = (state) => {
  if (state === 'open') return 'connected';
  if (state === 'connecting') return 'connecting';
  return 'disconnected';
};

// ---- Endereçamento LID do WhatsApp ----
// O WhatsApp passou a identificar contatos por um "LID" (<id>@lid) em vez do telefone.
// A Evolution entrega:
//   recebida → remoteJid/senderPn = <telefone>@s.whatsapp.net + previousRemoteJid = <lid>@lid
//   enviada  → remoteJid = <lid>@lid  (sem o telefone!)
// Sem tratar isso, ida e volta da MESMA conversa viram dois chats distintos.
// Guardamos o par (lid → telefone) assim que ele aparece e usamos nas enviadas.
const lembrarLid = async (lid, jidTelefone, schema) => {
  if (!lid || !jidTelefone || !schema) return;
  try {
    await pool.query(
      `INSERT INTO ${schema}.lid_map (lid, phone_jid, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (lid) DO UPDATE SET phone_jid = EXCLUDED.phone_jid, updated_at = now()`,
      [lid, jidTelefone]
    );
    // Merge automático: chats criados antes de o par ser conhecido (só com o LID)
    // são convertidos/fundidos AGORA, sem esperar backfill manual.
    await fundirChatsDoLid(lid, jidTelefone, schema);
  } catch (e) { /* tabela ainda não migrada — segue com o LID mesmo */ }
};

// Converte/funde chats abertos cujo contact_phone é o LID (ou o LID "mutilado" —
// uma versão antiga do webhook removia o 5º dígito de todo número).
const fundirChatsDoLid = async (lid, jidTelefone, schema) => {
  try {
    const lidNum = lid.split('@')[0];
    const lidMutilado = lidNum.slice(0, 4) + lidNum.slice(5);
    const phoneNum = jidTelefone.split('@')[0];

    const orfaos = await pool.query(
      `SELECT id, connection_id FROM ${schema}.chats
        WHERE contact_phone = ANY($1) AND status <> 'closed'`,
      [[lidNum, lidMutilado]]
    );
    for (const chat of orfaos.rows) {
      const alvo = await pool.query(
        `SELECT id FROM ${schema}.chats
          WHERE contact_phone = $1 AND connection_id = $2 AND status <> 'closed' AND id <> $3
          ORDER BY created_at DESC LIMIT 1`,
        [phoneNum, chat.connection_id, chat.id]
      );
      if (alvo.rows[0]) {
        // já existe o chat do telefone: move as mensagens e fecha o órfão
        await pool.query(`UPDATE ${schema}.messages SET chat_id = $1 WHERE chat_id = $2`, [alvo.rows[0].id, chat.id]);
        await pool.query(`UPDATE ${schema}.lembretes SET chat_id = $1 WHERE chat_id = $2`, [alvo.rows[0].id, chat.id]).catch(() => {});
        await pool.query(`UPDATE ${schema}.chats SET status = 'closed' WHERE id = $1`, [chat.id]);
      } else {
        // não existe: o próprio chat do LID vira o chat do telefone (herda nome da agenda se houver)
        const nome = await pool.query(
          `SELECT contact_name FROM ${schema}.contacts WHERE number = $1`, [phoneNum]
        ).catch(() => ({ rows: [] }));
        await pool.query(
          `UPDATE ${schema}.chats SET contact_phone = $1, chat_id = $2
                  ${nome.rows[0]?.contact_name ? ', contact_name = $4' : ''}
            WHERE id = $3`,
          nome.rows[0]?.contact_name
            ? [phoneNum, jidTelefone, chat.id, nome.rows[0].contact_name]
            : [phoneNum, jidTelefone, chat.id]
        );
      }
    }
  } catch (e) {
    console.error('fundirChatsDoLid:', e.message);
  }
};

const buscarLid = async (lid, schema) => {
  if (!lid || !schema) return null;
  try {
    const r = await pool.query(`SELECT phone_jid FROM ${schema}.lid_map WHERE lid = $1`, [lid]);
    return r.rows[0]?.phone_jid || null;
  } catch (e) { return null; }
};

// Upsert de contatos vindos da Evolution (agenda). Regra:
//  - isSaved/saved=true → nome da AGENDA: grava contact_name e marca is_saved
//  - senão → só push_name; contact_name apenas se o atual for ruim (número/vazio)
const upsertContatosDaAgenda = async (contatos, schema) => {
  for (const c of contatos) {
    try {
      const jid = c.remoteJid || c.id || '';
      if (!jid || jid.endsWith('@g.us') || jid.endsWith('@lid')) continue; // grupos/LID não são agenda
      const numero = String(jid).split('@')[0].split(':')[0];
      if (!/^\d{8,15}$/.test(numero)) continue;
      const salvo = !!(c.isSaved ?? c.saved);
      const nome = (c.pushName || c.name || '').trim();
      if (!nome) continue;
      if (salvo) {
        await pool.query(
          `INSERT INTO ${schema}.contacts (number, contact_name, push_name, is_saved)
           VALUES ($1, $2, $2, true)
           ON CONFLICT (number) DO UPDATE SET contact_name = EXCLUDED.contact_name, push_name = EXCLUDED.push_name, is_saved = true`,
          [numero, nome]
        );
        // reflete no chat aberto se o nome atual for número/vazio OU pushName antigo
        await pool.query(
          `UPDATE ${schema}.chats SET contact_name = $1 WHERE contact_phone = $2 AND status <> 'closed'`,
          [nome, numero]
        ).catch(() => {});
      } else {
        await pool.query(
          `INSERT INTO ${schema}.contacts (number, contact_name, push_name, is_saved)
           VALUES ($1, $2, $2, false)
           ON CONFLICT (number) DO UPDATE SET
             push_name = EXCLUDED.push_name,
             contact_name = CASE
               WHEN ${schema}.contacts.is_saved THEN ${schema}.contacts.contact_name
               WHEN ${schema}.contacts.contact_name IS NULL OR ${schema}.contacts.contact_name ~ '^[0-9 ()+-]+$'
                 THEN EXCLUDED.contact_name
               ELSE ${schema}.contacts.contact_name
             END`,
          [numero, nome]
        );
      }
    } catch (e) { /* contato individual com problema não derruba o lote */ }
  }
};

// ---- Leitura feita no CELULAR reflete no CRM ----
// O WhatsApp avisa por dois caminhos, e a Evolution repassa os dois:
//   chats.update    → { remoteJid|id, unreadCount }  — unreadCount 0 = zerou no telefone
//   messages.update → mensagem RECEBIDA que virou READ/PLAYED = eu li em outro aparelho
// Antes disso, conversa lida no celular ficava com a bolinha azul para sempre no painel.
const eventoIndicaLeitura = (eventName, item) => {
  if (!item || typeof item !== 'object') return false;

  if (eventName === 'chats.update' || eventName === 'chats.upsert') {
    const naoLidas = item.unreadCount ?? item.unread_count;
    return naoLidas !== undefined && naoLidas !== null && Number(naoLidas) === 0;
  }

  // messages.update: só interessa mensagem que EU RECEBI passando a lida.
  // (fromMe=true virando READ significa que o CONTATO leu a minha — não mexe no não-lida)
  const fromMe = item.fromMe ?? item.key?.fromMe ?? item.update?.key?.fromMe;
  if (fromMe === true) return false;
  const status = item.status ?? item.update?.status;
  if (status === undefined || status === null) return false;
  const s = String(status).toUpperCase();
  return s === 'READ' || s === 'PLAYED' || Number(status) >= 4;
};

const jidDoEvento = (item) =>
  item?.remoteJid || item?.id || item?.key?.remoteJid || item?.update?.key?.remoteJid || '';

const conexaoIdPorInstancia = async (instanceName, schema) => {
  try {
    const r = await pool.query(
      `SELECT id FROM ${schema}.connections WHERE name = $1 LIMIT 1`, [instanceName]
    );
    return r.rows[0]?.id || null;
  } catch (e) { return null; }
};

const marcarLidoPeloCelular = async (jidBruto, instanceName, schema, io) => {
  if (!jidBruto || !schema) return 0;
  // LID → telefone (mesma normalização das mensagens); grupo mantém o próprio jid
  let jid = String(jidBruto);
  if (jid.endsWith('@lid')) jid = (await buscarLid(jid, schema)) || jid;
  const numero = jid.split('@')[0].split(':')[0];
  if (!numero) return 0;

  // Escopo pela CONEXÃO: com 2 números na mesma empresa, ler no celular de um
  // não pode zerar o não-lida do outro.
  const connectionId = await conexaoIdPorInstancia(instanceName, schema);
  const r = await pool.query(
    `UPDATE ${schema}.chats SET unreadmessages = false
      WHERE contact_phone = $1 AND status <> 'closed' AND unreadmessages = true
        ${connectionId ? 'AND connection_id = $2' : ''}
      RETURNING id`,
    connectionId ? [numero, connectionId] : [numero]
  );

  // Evento próprio — NÃO reaproveita 'chats_updated', que toca som de notificação
  for (const row of r.rows) {
    io?.to(`schema_${schema}`).emit('chatRead', { chatId: row.id, schema });
  }
  return r.rowCount;
};

// Sync completo da agenda de uma instância (chamado ao conectar)
const sincronizarAgenda = async (instanceName, schema) => {
  const { listAllContacts } = require('../requests/evolution');
  const contatos = await listAllContacts(instanceName);
  if (contatos.length === 0) return;
  await upsertContatosDaAgenda(contatos, schema);
  console.log(`Agenda sincronizada (${instanceName}): ${contatos.length} contatos processados`);
};

// Nome do contato 1:1 sem pushName: agenda (contacts) → perfil na Evolution
// (verifiedName cobre contas business). Cache em memória evita repetir a consulta.
const perfisConsultados = new Set();
const resolverNomeDoPerfil = async (numero, instanceName, schema) => {
  try {
    const c = await pool.query(
      `SELECT contact_name FROM ${schema}.contacts WHERE number = $1`, [numero]
    );
    const atual = c.rows[0]?.contact_name;
    if (atual && !/^[\d\s()+\-]+$/.test(atual)) return atual;

    const chaveCache = `${schema}:${numero}`;
    if (perfisConsultados.has(chaveCache)) return null;
    perfisConsultados.add(chaveCache);

    const { fetchProfileName } = require('../requests/evolution');
    const nome = await fetchProfileName(instanceName, numero);
    if (nome && !/^[\d\s()+\-]+$/.test(nome)) {
      await pool.query(
        `INSERT INTO ${schema}.contacts (number, contact_name, push_name, is_saved)
         VALUES ($1, $2, $2, false)
         ON CONFLICT (number) DO UPDATE SET
           contact_name = CASE WHEN ${schema}.contacts.is_saved THEN ${schema}.contacts.contact_name ELSE EXCLUDED.contact_name END,
           push_name = EXCLUDED.push_name`,
        [numero, nome]
      ).catch(() => {});
      return nome;
    }
    return null;
  } catch (e) { return null; }
};

// Nome do grupo com cache em contacts (number = id do grupo).
// Sem isso o chat do grupo era batizado com o pushName do 1º remetente.
// Cache de subject de grupo EM MEMÓRIA, com TTL.
// Por que não usar mais o cache em `contacts`: antes do fix de grupos, o
// contacts do ID do grupo era gravado com o pushName de QUEM MANDOU a mensagem.
// Como esse nome "parece bom", o cache devolvia a pessoa para sempre e a
// Evolution nunca era consultada — grupo ficava com nome de gente.
const GRUPO_TTL_MS = 10 * 60 * 1000;
const cacheGrupos = new Map(); // groupJid -> { subject, exp }

const resolverNomeGrupo = async (groupJid, instanceName, schema) => {
  const groupId = groupJid.split('@')[0];
  const agora = Date.now();

  const memo = cacheGrupos.get(groupJid);
  if (memo && memo.exp > agora) return memo.subject;

  const { getGroupSubject } = require('../requests/evolution');
  const subject = await getGroupSubject(instanceName, groupJid);

  if (subject) {
    cacheGrupos.set(groupJid, { subject, exp: agora + GRUPO_TTL_MS });
    if (schema) {
      await pool.query(
        `INSERT INTO ${schema}.contacts (number, contact_name, is_saved)
         VALUES ($1, $2, false)
         ON CONFLICT (number) DO UPDATE SET contact_name = EXCLUDED.contact_name`,
        [groupId, subject]
      ).catch(() => {});
      // Nome do grupo mudou (ou o chat estava com nome de pessoa) → corrige o chat
      await pool.query(
        `UPDATE ${schema}.chats SET contact_name = $1
          WHERE contact_phone = $2 AND status <> 'closed' AND contact_name IS DISTINCT FROM $1`,
        [subject, groupId]
      ).catch(() => {});
    }
    return subject;
  }

  // Evolution indisponível: usa o último nome conhecido em contacts como plano B
  if (schema) {
    try {
      const cached = await pool.query(
        `SELECT contact_name FROM ${schema}.contacts WHERE number = $1`, [groupId]
      );
      const nome = cached.rows[0]?.contact_name;
      if (nome && nome !== 'Grupo') return nome;
    } catch (e) { /* sem cache também */ }
  }
  return 'Grupo';
};

const normalizarJid = async (key, schema) => {
  const remoteJid = key?.remoteJid || '';
  if (remoteJid.endsWith('@g.us')) return remoteJid; // grupo: o próprio jid é a conversa

  // Telefone explícito na mensagem (recebidas) — é a fonte mais confiável
  const jidTelefone = [key?.senderPn, remoteJid].find(j => typeof j === 'string' && j.includes('@s.whatsapp.net'));
  const lid = [key?.previousRemoteJid, remoteJid].find(j => typeof j === 'string' && j.endsWith('@lid'));

  if (jidTelefone) {
    if (lid) await lembrarLid(lid, jidTelefone, schema); // aprende o par para as enviadas
    return jidTelefone;
  }
  if (lid) {
    const conhecido = await buscarLid(lid, schema);
    if (conhecido) return conhecido;
  }
  return remoteJid;
};


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

    // ---- Eventos de status de conexão (não têm remoteJid) ----
    const eventName = (result?.event || '').toLowerCase();
    if (eventName === 'connection.update' || eventName === 'qrcode.updated') {
      try {
        const instanceName = result.instance;
        const schema = await resolveSchemaByInstance(instanceName);
        if (schema) {
          if (eventName === 'connection.update') {
            const status = mapConnectionState(result?.data?.state);
            await setConnectionStatusByName(instanceName, status, schema);
            serverTest.io?.to(`schema_${schema}`).emit('connectionStatus', { connection_name: instanceName, status });
            // Conectou → sincroniza a AGENDA em background (nomes salvos > pushName > número)
            if (status === 'connected') {
              sincronizarAgenda(instanceName, schema)
                .catch((e) => console.error('Sync de agenda falhou:', e.message));
              // Reconcilia a lista de eventos do webhook: instância criada antes de
              // MESSAGES_UPDATE/CHATS_UPDATE existirem não receberia esses eventos.
              setInstanceWebhook(instanceName)
                .catch((e) => console.error('Re-registro de webhook falhou:', e.message));
            }
          } else {
            const base64 = result?.data?.qrcode?.base64 || result?.data?.base64 || null;
            serverTest.io?.to(`schema_${schema}`).emit('qrcodeUpdated', { connection_name: instanceName, base64 });
          }
        }
      } catch (e) {
        console.error('Erro no evento de conexão:', e.message);
      }
      return res.sendStatus(200);
    }

    // Contatos da agenda chegando por evento (antes: caía no 400 "Dados incompletos")
    if (eventName === 'contacts.upsert' || eventName === 'contacts.set' || eventName === 'contacts.update') {
      try {
        const schema = await resolveSchemaByInstance(result.instance);
        const lista = Array.isArray(result.data) ? result.data : [result.data];
        if (schema) await upsertContatosDaAgenda(lista, schema);
      } catch (e) {
        console.error('Erro no evento de contatos:', e.message);
      }
      return res.sendStatus(200);
    }

    // ---- Leitura no celular → zera o "não lida" no CRM ----
    // Precisa vir ANTES do fluxo de mensagem: messages.update também carrega `key`
    // e seria processado como se fosse mensagem nova.
    if (eventName === 'chats.update' || eventName === 'chats.upsert' || eventName === 'messages.update') {
      try {
        const schema = await resolveSchemaByInstance(result.instance);
        if (schema) {
          const lista = Array.isArray(result.data) ? result.data : [result.data];
          let marcados = 0, ignorados = 0;
          for (const item of lista) {
            if (!eventoIndicaLeitura(eventName, item)) {
              ignorados++;
              continue;
            }
            marcados += await marcarLidoPeloCelular(jidDoEvento(item), result.instance, schema, serverTest.io);
          }
          // Observabilidade: sem isto não dá para saber se o WhatsApp sequer avisa da
          // leitura, e o sintoma ("não atualiza sozinho") fica indistinguível de bug nosso.
          console.log(`[leitura] ${eventName} inst=${result.instance} itens=${lista.length} chats_marcados=${marcados} ignorados=${ignorados} amostra=${JSON.stringify(lista[0] || {}).slice(0, 220)}`);
        }
      } catch (e) {
        console.error(`Erro no evento ${eventName}:`, e.message);
      }
      return res.sendStatus(200);
    }

    if (!result?.data?.key?.remoteJid) {
      // Eventos sem remoteJid não são erro — só não nos interessam
      return res.sendStatus(200);
    }
    // ---- Endereçamento LID (WhatsApp novo) ----
    // Recebidas trazem senderPn (telefone) + previousRemoteJid (o LID);
    // enviadas trazem SÓ o LID. Sem normalizar, a mesma pessoa virava dois chats.
    const key = result.data.key;
    const schemaAlvo = await resolveSchemaByInstance(result.instance);
    const jidNormalizado = await normalizarJid(key, schemaAlvo);

    const num = jidNormalizado.split('@')[0].split(':')[0];
    // NADA de remover dígito: o "9" do celular BR faz parte do número e a mutilação
    // quebrava o casamento com os contatos importados (e destruía LIDs/DDIs).
    const numberLimpo = num;
    const isGrupo = jidNormalizado.endsWith('@g.us');

    // Nome do chat:
    //  - grupo: nome do GRUPO (subject via Evolution, com cache em contacts) —
    //    antes usava o pushName de quem mandou a 1ª mensagem, e o grupo virava "pessoa"
    //  - 1:1: pushName só em mensagem RECEBIDA; senão o número (createChat melhora depois)
    let contact;
    if (isGrupo) {
      contact = await resolverNomeGrupo(jidNormalizado, result.instance, schemaAlvo);
    } else {
      contact = (result.data.pushName && !key.fromMe) ? result.data.pushName : numberLimpo;
      // Ainda sem nome real? Contas business (0800 etc.) não têm pushName —
      // o nome vem do PERFIL (verifiedName). Consulta 1x com cache local.
      if (contact === numberLimpo && schemaAlvo) {
        contact = await resolverNomeDoPerfil(numberLimpo, result.instance, schemaAlvo) || numberLimpo;
      }
    }

    try {
      const timestamp = getCurrentTimestamp()
      if (!result.data.key.remoteJid || !result.data.instanceId) {
        throw new Error('Dados obrigatórios ausentes: remoteJid ou instanceId');
      }

      const chat = new Chat(
        uuidv4(),
        jidNormalizado,          // jid NORMALIZADO (LID→telefone) — senão ida e volta viram 2 chats
        result.data.instanceId,
        null,
        isGrupo,                 // era key.fromMe aqui: isGroup no banco guardava "fromMe"
        contact,
        null,
        result.data.status,
        timestamp,
        []
      );

      let messageBody = '';
      let audioBase64 = null;
      let imageBase64 = null;
      
      const createChats = await createChat(chat, result.instance, result.data.message?.conversation, null, null);
      const chatDb = await getChatService(createChats.chat.id, createChats.chat.connection_id, createChats.schema);
      const schema = createChats.schema

      // Grupo NÃO entra na distribuição automática (grupo não é lead) — decisão do Luiz
      if(chatDb.assigned_user===null && !isGrupo){
        await setUserChat(chatDb.id, schema)
      }

      const baseChat = await getChatService(createChats.chat.id, createChats.chat.connection_id, createChats.schema)
      if(result.data.key.fromMe===false){
        await setMessageIsUnread(baseChat.id, schema)
        // Se a mensagem não é do sistema (fromMe = false), atualiza o status de 'disparo' para 'open'
        await updateChatStatusFromDisparo(baseChat.id, schema)
      }
      if (baseChat.assigned_user !== null) {
        // Chat já tem usuário atribuído - emitir para o usuário específico e para admins/técnicos
        const userChat = await getChatByUser(baseChat.assigned_user, baseChat.permission, schema)
        if (serverTest.io) {
          // Emitir para o usuário específico
          serverTest.io.to(`user_${baseChat.assigned_user}`).emit('chats_updated', userChat)
          
          // Emitir para admins e técnicos
          const adminUsersQuery = await pool.query(
            `SELECT id FROM ${schema}.users WHERE (permission = 'admin' OR permission = 'tecnico' OR permission = 'master') AND online = true AND id != $1`,
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
        // Chat na sala de espera - emitir considerando permissões
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
              `SELECT id FROM ${schema}.users WHERE (permission = 'admin' OR permission = 'tecnico' OR permission = 'master') AND online = true AND id != $1`,
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
                `SELECT id FROM ${schema}.users WHERE (permission = 'admin' OR permission = 'tecnico' OR permission = 'master') AND online = true AND id != $1`,
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
              `SELECT id FROM ${schema}.users WHERE (permission = 'admin' OR permission = 'tecnico' OR permission = 'master') AND online = true AND id != $1`,
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

        // Agente de IA (piloto automático) — responde apenas a mensagens do cliente.
        if (result.data.key.fromMe === false) {
          aiAgent
            .handleIncoming(schema, baseChat, num, result.instance, messageBody)
            .catch((err) => console.error('AiAgent hook erro:', err.message));
        }

      }
      if (!chat || !result.instance) {
        throw new Error('Dados obrigatórios ausentes para createChat');
      }

      const existingMessage = await pool.query(
        `SELECT id FROM ${schema}.messages WHERE id = $1`,
        [result.data.key.id]
      );

      if (existingMessage.rowCount === 0 && !result.data.message?.audioMessage?.base64) {
        // Autor real da mensagem (em grupo: quem falou; em 1:1 recebida: o contato)
        const participante = !result.data.key.fromMe
          ? { name: result.data.pushName || null, jid: key.participant || key.senderPn || null }
          : null;
        await saveMessage(
          chatDb.id,
          new Message(
            result.data.key.id,
            messageBody,
            result.data.key.fromMe,
            result.data.key.remoteJid,
            timestamp
          ),
          schema,
          undefined,
          participante
        );
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

      const queueById = chatDb.queue_id ? await getQueueById(chatDb.queue_id, schema) : [];

      if(queueById[0] && queueById[0].is_webhook_on === true && queueById[0].webhook_url !== null){
        try {
          await axios.post(queueById[0].webhook_url, data)
        } catch (error) {
          console.error(error);
        }
      }


      res.status(200).json({ result });

  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    // Responde SEMPRE — sem isso a Evolution fica em timeout/retry infinito
    if (!res.headersSent) res.sendStatus(200);
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