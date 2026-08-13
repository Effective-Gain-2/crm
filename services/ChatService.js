const pool = require('../db/queries');
const { v4: uuid4 } = require('uuid');
const { getOnlineUsers, updateLastAssignedUser, getLastAssignedUser } = require('./UserService');
const { getCurrentTimestamp } = require('./getCurrentTimestamp');
const { Queue, Worker } = require('bullmq');
const createRedisConnection = require('../config/Redis');
const { sendTextMessage } = require('../requests/evolution');
const { saveMessage } = require('./MessageService');
const { Message } = require('../entities/Message');
const { createLembrete } = require('./LembreteService');
const { getGptResponse } = require('./ReportService');

const bullConn = createRedisConnection()
const messageQueue = new Queue('message', {connection: bullConn});

const worker = new Worker(
  'message',
  async (job) => {
        try {
          await sendTextMessage(
            job.data.instance,
            job.data.message,
            job.data.contact_phone
          )
          await saveMessage(job.data.chat_id, job.data.messageDB, job.data.schema)
          await deleteScheduledMessage(job.data.id, job.data.schema);
        } catch (error) {
          console.error(error)
        }
              },{
          connection: bullConn,
        }
      )

const createChat = async (chat, instance, message, etapa, io) => {
  let schema;

  const geralSchema = await pool.query(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'public')`
  );
  const schemaNames = geralSchema.rows.map(row => row.schema_name);

  for (const schemas of schemaNames) {
    try {
      const result = await pool.query(
        `SELECT * FROM ${schemas}.connections WHERE name=$1`, [instance]
      );
      if (result.rows.length > 0) {
        schema = schemas;
        break;
      }
    } catch (error) {
      console.error("Erro ao buscar conexão:", error.message);
    }
  }

  if (!schema) {
    throw new Error("Schema não encontrado para a instância fornecida.");
  }

  try {
    const existingChat = await pool.query(
      `SELECT * FROM ${schema}.chats WHERE contact_phone = $1 AND connection_id = $2 AND status <> 'closed' `,
      [chat.getChatId().split('@')[0], chat.getConnectionId()]
    );


    if (existingChat.rowCount > 0) {
      // Procura o chat mais recente que NÃO está 'closed'
      const chatValido = existingChat.rows.find(c => c.status !== 'closed');
      if (chatValido) {
        // Atualiza mensagens e retorna o chat válido
        const updated = await updateChatMessages(chat, schema, message);
        if(chatValido.queue_id===null){
          await setChatQueue(schema, chatValido.id)
        }
        return {
          chat: chatValido,
          schema: schema
        };
      }
    } 
    const contactNumber = chat.getChatId().split('@')[0];
    const contactQuery = await pool.query(
      `SELECT * FROM ${schema}.contacts WHERE number = $1`,
      [contactNumber]
    );

    let contactName;
    if (contactQuery.rowCount > 0) {
      contactName = contactQuery.rows[0].contact_name;
    } else {
      const newContact = await pool.query(
        `INSERT INTO ${schema}.contacts (number, contact_name) VALUES ($1, $2) RETURNING *`,
        [contactNumber, chat.getContact()]
      );
      contactName = newContact.rows[0].contact_name;
    }

    let values, query;
    if (etapa) {
      values = [
        chat.getId(),
        chat.getChatId(),
        chat.getConnectionId(),
        chat.getQueueId(),
        chat.getIsGroup(),
        contactName,
        chat.getAssignedUser(),
        chat.getStatus(),
        chat.getCreatedAt(),
        JSON.stringify([message]),
        contactNumber,
        etapa,
        getCurrentTimestamp()
      ];
      query = `INSERT INTO ${schema}.chats 
        (id, chat_id, connection_id, queue_id, isGroup, contact_name, assigned_user, status, created_at, messages, contact_phone, etapa_id, updated_time) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`;
    } else {
      values = [
        chat.getId(),
        chat.getChatId(),
        chat.getConnectionId(),
        chat.getQueueId(),
        chat.getIsGroup(),
        contactName,
        chat.getAssignedUser(),
        chat.getStatus(),
        chat.getCreatedAt(),
        JSON.stringify([message]),
        contactNumber,
        getCurrentTimestamp()
      ];
      query = `INSERT INTO ${schema}.chats 
        (id, chat_id, connection_id, queue_id, isGroup, contact_name, assigned_user, status, created_at, messages, contact_phone, updated_time) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`;
    }

    const result = await pool.query(query, values);
    console.log(`createChat: Novo chat criado - ID: ${result.rows[0].id}, Status: ${result.rows[0].status}`);
    if(result.rows[0].queue_id===null){
      await setChatQueue(schema, result.rows[0].id)
    }

    if (io) {
      io.to(schema).emit("chat:new-message", {
        chatId: chat.getChatId(),
        message,
        schema
      });
    }
    return {
      chat: result.rows[0],
      schema: schema
    };
  } catch (error) {
    console.error('Erro ao criar chat:', error);
    throw new Error('Erro ao criar chat');
  }
};

//redistribuir


// const redistributeLead = async (chatId, schema) => {
//   const chatDb = await pool.query(
//     `SELECT * FROM ${schema}.chats WHERE id=$1`, [chatId]
//   );
//   const chat = chatDb.rows[0];
//   if (!chat) return;

//   const queueId = chat.queue_id;
//   const isDistributionOn = await pool.query(
//     `SELECT * FROM ${schema}.queues WHERE id=$1`, [queueId]
//   );
//   if (!isDistributionOn.rows[0] || !isDistributionOn.rows[0].distribution) return;

//   const onlineUsers = await getOnlineUsers(schema);
//   const queueUsersQuery = await pool.query(
//     `SELECT user_id FROM ${schema}.queue_users WHERE queue_id=$1`,
//     [queueId]
//   );
//   const userIdsInQueue = queueUsersQuery.rows.map(row => row.user_id);
//   const eligibleUsers = onlineUsers.filter(user =>
//     user.permission === 'user' && userIdsInQueue.includes(user.id) && user.id !== chat.assigned_user
//   );
//   if (eligibleUsers.length === 0) return;

//   const lastAssigned = await getLastAssignedUser(queueId, schema);
//   let nextUser;
//   if (!lastAssigned) {
//     nextUser = eligibleUsers[0];
//   } else {
//     const lastIndex = eligibleUsers.findIndex(u => u.id === lastAssigned.user_id);
//     nextUser = eligibleUsers[(lastIndex + 1) % eligibleUsers.length];
//   }
//   await updateLastAssignedUser(queueId, nextUser.id, schema);

//   await pool.query(
//     `UPDATE ${schema}.chats SET assigned_user=$1 WHERE id=$2`,
//     [nextUser.id, chatId]
//   );
// };


// const leadRedistributionWorker = new Worker(
//   'lead-redistribution',
//   async () => {
//     const schemas = await pool.query(
//       `SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'public')`
//     );
//     for (const { schema_name } of schemas.rows) {
//       const chats = await pool.query(
//         `SELECT * FROM ${schema_name}.chats WHERE status='open' AND assigned_user IS NOT NULL`
//       );
//       for (const chat of chats.rows) {
//         const lastMsgTime = chat.updated_time || chat.created_at;
//         if (Date.now() - new Date(lastMsgTime).getTime() > 1 * 60 * 1000) {
//           await redistributeLead(chat.id, schema_name);
//         }
//       }
//     }
//   },
//   { connection: bullConn }
// );

// const leadRedistributionQueue = new Queue('lead-redistribution', { connection: bullConn });
// setInterval(() => {
//   leadRedistributionQueue.add('check-leads', {});
// }, 5 * 60 * 1000);

// //final

const updateChatMessages = async (chat, schema, message) => {
  try {
    const result = await pool.query(
      `UPDATE ${schema}.chats 
       SET messages = messages || $1::jsonb, updated_time=$2
       WHERE chat_id = $3 
       RETURNING *`,
      [JSON.stringify([message]), getCurrentTimestamp(), chat.getChatId()]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao atualizar mensagens do chat:', error.message);
    throw new Error('Erro ao atualizar mensagens do chat');
  }
};

const getMessages = async(chat_Id, schema)=>{
    const result = await pool.query(
      `SELECT * FROM ${schema}.messages WHERE chat_id=$1 ORDER BY created_at ASC`,
      [chat_Id]
    );
    return result.rows
}

const getChatService = async(chat_id, connection_id, schema)=>{
    const result = await pool.query(
      `SELECT * FROM ${schema}.chats WHERE id=$1 AND connection_id=$2`,
      [chat_id, connection_id]
    );
    if (result.rows.length > 0) {
      return result.rows[0];
    }
}

const putChatInWaiting = async(chat_id, schema)=>{
  const result = await pool.query(
    `UPDATE ${schema}.chats SET status='waiting' WHERE id=$1 RETURNING *`,
    [chat_id]
  );
  return result.rows[0];
}

const setUserChat = async (chatId, schema) => {
    const chatDb = await pool.query(
      `SELECT * FROM ${schema}.chats WHERE id=$1`,
      [chatId]
    );
    const queueId = chatDb.rows[0].queue_id;
    const isDistributionOn = await pool.query(
      `SELECT * FROM ${schema}.queues WHERE id=$1 `, [queueId]
    )
    if (isDistributionOn.rows[0].distribution === true) {
      const onlineUsers = await getOnlineUsers(schema);
      if(onlineUsers.length === 0) {
        await putChatInWaiting(chatId, schema);
        return;
      }
      const queueUsersQuery = await pool.query(
        `SELECT user_id FROM ${schema}.queue_users WHERE queue_id=$1`,
        [queueId]
      );
      const userIdsInQueue = queueUsersQuery.rows.map(row => row.user_id);
      const eligibleUsers = onlineUsers.filter(user =>
        user.permission === 'user' && userIdsInQueue.includes(user.id)
      );
      if (eligibleUsers.length === 0){
        await putChatInWaiting(chatId, schema);
        return;
      } 
      const lastAssigned = await getLastAssignedUser(queueId, schema);
      let nextUser;
      if (!lastAssigned) {
        nextUser = eligibleUsers[0];
      } else {
        const lastIndex = eligibleUsers.findIndex(u => u.id === lastAssigned.user_id);
        nextUser = eligibleUsers[(lastIndex + 1) % eligibleUsers.length];
      }
      await updateLastAssignedUser(queueId, nextUser.id, schema);
     const result =  await pool.query(
        `UPDATE ${schema}.chats SET assigned_user=$1 WHERE id=$2 RETURNING *`,
        [nextUser.id, chatId]
      );
      return result.rows[0]
    }else{
      const result = await pool.query(
        `UPDATE ${schema}.chats SET status='waiting' WHERE id=$1 RETURNING *`,
        [chatId]
      )
      return result.rows[0]
    }

};

const getChats = async (schema) => {
    const { rows } = await pool.query(
      `SELECT * FROM ${schema}.chats ORDER BY created_at ASC`
    );
    return rows;
};

const setChatQueue = async (schema, chatId) => {
  const chatConn = await pool.query(
    `SELECT * FROM ${schema}.chats WHERE id=$1`, [chatId]
  );
  if (!chatConn.rows[0]) {
    console.error('Chat não encontrado ao tentar setar queue.');
    return null;
  }
  const connQueue = await pool.query(
    `SELECT * FROM ${schema}.connections WHERE id=$1`, [chatConn.rows[0].connection_id]
  );
  if (!connQueue.rows[0]) {
    console.error('Connection não encontrada ao tentar setar queue.');
    return null;
  }
  if (chatConn.rows[0].queue_id === null) {
    const firstQueue = await pool.query(
      `UPDATE ${schema}.chats SET queue_id=$1 WHERE id=$2`, [connQueue.rows[0].queue_id, chatId]
    );
    return firstQueue.rows[0];
  }
  return null;
};

const updateQueue = async(schema, chatId, queueId)=>{
  const result = await pool.query(
    `UPDATE ${schema}.chats SET queue_id=$1 WHERE id=$2`,[queueId, chatId]
  )
  return result.rows[0]
}

const getChatData = async(id, schema)=>{
  const chat = await pool.query(
    `SELECT * FROM ${schema}.chats WHERE id=$1`, [id]
  )
  const connection = await pool.query(
    `SELECT * FROM ${schema}.connections WHERE id=$1`, [chat.rows[0].connection_id]
  )
  const queue = await pool.query(
    `SELECT * FROM ${schema}.queues WHERE id=$1`, [chat.rows[0].queue_id]
  )
  const user = await pool.query(
    `SELECT * FROM ${schema}.users WHERE id=$1`, [chat.rows[0].assigned_user]
  )

  return {
    chat: chat.rows[0],
    connection: connection.rows[0],
    queue: queue.rows[0],
    user: user.rows[0],
  }
}

const getChatByUser = async (userId, role, schema) => {
  try {
    // master/tecnico (e legado admin) → todos os chats do tenant
    if (role === 'admin' || role === 'tecnico' || role === 'master') {
      const result = await pool.query(
        `SELECT * FROM ${schema}.chats where status <> 'closed' ORDER BY (updated_time IS NULL) , updated_time DESC`
      );
      return result.rows;
    }

    // lider → TODOS os chats das filas que ele lidera (equipe inteira),
    // mais o comportamento de operacional nas filas em que é apenas membro
    if (role === 'lider') {
      const { getLedQueues } = require('./QueueService');
      const ledQueues = await getLedQueues(userId, schema);
      let chats = [];
      if (ledQueues.length > 0) {
        const led = await pool.query(
          `SELECT * FROM ${schema}.chats
            WHERE queue_id = ANY($1::uuid[]) AND status <> 'closed'
            ORDER BY (updated_time IS NULL), updated_time DESC`,
          [ledQueues]
        );
        chats = led.rows;
      }
      const member = await pool.query(
        `SELECT c.* FROM ${schema}.chats c
           JOIN ${schema}.queue_users qu ON qu.queue_id = c.queue_id AND qu.user_id = $1
          WHERE (c.assigned_user = $1 OR c.assigned_user IS NULL)
            AND c.status <> 'closed'
            AND NOT (c.queue_id = ANY($2::uuid[]))
          ORDER BY (c.updated_time IS NULL), c.updated_time DESC`,
        [userId, ledQueues.length ? ledQueues : ['00000000-0000-0000-0000-000000000000']]
      );
      return chats.concat(member.rows);
    }

    // operacional → próprios atendimentos + não atribuídos das suas filas
    const queues = await pool.query(
      `SELECT * FROM ${schema}.queue_users WHERE user_id=$1`, [userId]
    );
    let allChats = [];
    for (let i = 0; i < queues.rowCount; i++) {
      const queueId = queues.rows[i].queue_id;
      const result = await pool.query(
        `SELECT * FROM ${schema}.chats WHERE (assigned_user = $1 OR assigned_user IS NULL) AND status <> 'closed' AND queue_id=$2 ORDER BY (updated_time IS NULL), updated_time DESC`,
        [userId, queueId]
      );
      allChats = allChats.concat(result.rows);
    }
    return allChats;
  } catch (error) {
    console.error('Erro ao buscar chats do usuário:', error.message);
    throw new Error('Erro ao buscar chats do usuário');
  }
};
const getChatIfUserIsNull = async(connection, permission, schema, userQueues = null)=>{
  try{
     if (permission === 'admin' || permission ==='tecnico' || permission === 'master') {
      const result = await pool.query(
        `SELECT * FROM ${schema}.chats where status <> 'closed' ORDER BY (updated_time IS NULL) , updated_time DESC`
      );
      return result.rows;
    }else{
      let query;
      let params = [];
      
      if (userQueues && userQueues.length > 0) {
        // Se o usuário tem filas específicas, filtrar apenas por essas filas
        const queueIds = userQueues.map(queue => queue.id || queue);
        query = `SELECT * FROM ${schema}.chats WHERE connection_id=$1 AND assigned_user IS NULL AND status='waiting' AND queue_id = ANY($2) ORDER BY (updated_time IS NULL) , updated_time DESC`;
        params = [connection, queueIds];
      } else {
        // Se não tem filas específicas, retornar vazio
        return [];
      }
      
      const result = await pool.query(query, params);
      return result.rows;
    }
  }catch (error) {
    console.error('Erro ao buscar chats do usuário:', error.message);
    throw new Error('Erro ao buscar chats do usuário');
  }
}

const getChatById = async (chatId, connection_id, schema) => {
  try {
      
    const result = await pool.query(
      `SELECT * FROM ${schema}.chats WHERE id = $1 and connection_id = $2`,
      [chatId, connection_id]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Erro ao buscar chat pelo ID:', error.message);
    throw new Error('Erro ao buscar chat pelo ID');
  }
}

const saveMediaMessage = async (id,fromMe, chat_id, createdAt, message_type, audioBase64, schema) => {
  try {
    const result = await pool.query(
      `INSERT INTO ${schema}.messages (id, from_me, chat_id, created_at, message_type, base64) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, fromMe, chat_id, createdAt, message_type, audioBase64]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao salvar mensagem de áudio:', error.message);
    throw new Error('Erro ao salvar mensagem de áudio');
  }
};

const createNewChat = async(name, number, connectionId, queueId, user_id, schema, status = 'open') => {
  try {
    const { v4: uuidv4 } = require('uuid');
    const timestamp = getCurrentTimestamp();
    
    const result = await pool.query(
      `INSERT INTO ${schema}.chats (id, chat_id, connection_id, queue_id, isGroup, contact_name, assigned_user, status, created_at, messages, contact_phone, updated_time, unreadmessages) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        uuidv4(), 
        number + '@c.us', 
        connectionId, 
        queueId, 
        false, 
        name, 
        user_id, 
        status, 
        timestamp, 
        JSON.stringify([]),
        number,
        timestamp,
        false
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao criar novo chat:', error.message);
    throw new Error('Erro ao criar novo chat');
  }
}

const setMessageIsUnread = async(chat_id, schema)=>{
  try {
    await pool.query(
      `UPDATE ${schema}.chats SET unreadmessages = $2 WHERE id=$1`,
      [chat_id, true]
    );
  } catch (error) {
    console.error(error)
  }
}

const setMessageAsRead = async(chat_id, schema)=>{
  try {
    await pool.query(
      `UPDATE ${schema}.chats SET unreadmessages = $2 WHERE id=$1`,
      [chat_id, false]
    );
  } catch (error) {
    console.error(error)
  }
}

const closeChat = async(chat_id, schema)=>{
  try {
    const result = await pool.query(`UPDATE ${schema}.chats set status=$1 where id=$2 RETURNING *`,
      ['closed', chat_id]
    )
    return result.rows[0]
  } catch (error) {
    console.error(error)
  }
}

const closeChatContact = async (chat_id, status, schema) => {
  try {
    const number = await pool.query(`SELECT * FROM ${schema}.chats where id=$1`, [chat_id])
    const result = await pool.query(`
      INSERT INTO ${schema}.chat_contact(id, chat_id, contact_number, status, user_id) VALUES($1,$2,$3,$4,$5) RETURNING *  
    `, [uuid4(), chat_id, number.rows[0].contact_phone, status, number.rows[0].assigned_user || null])

    try {
      const report = await getGptResponse(chat_id, schema, status)
    } catch (gptError) {
      console.error('Erro ao gerar relatório GPT:', gptError.message);
    }
    
    return result.rows[0]
  } catch (error) {
    console.error(' Erro ao fechar chat:', error);
    throw error;
  }
}

const setSpecificUser = async(chat_id, user_id, schema)=>{
  try{
    const result = await pool.query(
      `update ${schema}.chats set assigned_user=$1, status='open' where id=$2 RETURNING *`,
      [user_id, chat_id]
    )
    return result.rows[0]
  } catch (error) {
    console.error(error)
  }
}

const updateChatNameByNumber = async(number, newName, user_id, schema)=>{
  try {
    await pool.query(
      `UPDATE ${schema}.chats set contact_name = $1 where contact_phone=$2 and assigned_user=$3` ,[newName, number, user_id]
    )
  } catch (error) {
    console.error(error)
  }
}

const scheduleMessage = async (chat_id, connection, message, contact_phone, timestamp, user, schema) => {
  try{
   if (typeof timestamp !== 'number' || isNaN(timestamp)) {
      console.error('Timestamp inválido:', timestamp);
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    let delay = (timestamp - now) * 1000;
    if (isNaN(delay) || delay < 0) {
      console.error('A data de agendamento deve ser futura e válida');
      return;
    }

    

    const chat = await getChatById(chat_id, connection.id, schema)

    const messageDB = new Message(uuid4(), message, true, chat_id, timestamp )

    const job = await messageQueue.add('sendMessage',{
      instance: connection.name,
      chat_id: chat_id,
      message: message,
      messageDB: messageDB,
      contact_phone: contact_phone,
      schema:schema
    }, {delay: delay});

    const result = await pool.query(`
      INSERT INTO ${schema}.scheduled_message(id, message, chat_id, scheduled_date, bull_job_id) VALUES ($1, $2, $3, $4, $5) RETURNING *
      `, [uuid4(), message, chat_id, timestamp, job.id]
    )

    await createLembrete(
      `Mensagem agendada para ${chat.contact_name}`,
      'pessoal',
      `Mensagem: ${message}`,
      timestamp,
      'bi-alarm',
      chat.assigned_user || user,
      schema,
    )
    
    
    return result.rows[0]

  }catch(error){
    console.error(error)
  }
}

const getScheduledMessages = async (chat_id, schema) => {
  try {
    const result = await pool.query(
      `SELECT * FROM ${schema}.scheduled_message WHERE chat_id=$1 ORDER BY scheduled_date ASC`,
      [chat_id]
    );
    return result.rows;
  } catch (error) {
    console.error(error);
    throw new Error('Erro ao buscar mensagens agendadas');
  }
};

const deleteScheduledMessage = async (id, schema) => {
  try {
    const result = await pool.query(
      `SELECT bull_job_id FROM ${schema}.scheduled_message WHERE id = $1`,
      [id]
    );
    const bullJobId = result.rows[0]?.bull_job_id;

    await pool.query(
      `DELETE FROM ${schema}.scheduled_message WHERE id = $1`,
      [id]
    );

    if (bullJobId) {
      await messageQueue.remove(bullJobId);
    }
  } catch (error) {
    console.error(error);
  }
}

const disableBot = async(chat_id, schema)=>{
  try{
    const result = await pool.query(
      `UPDATE ${schema}.chats SET isboton = $1 where id = $2`,[false, chat_id]
    )
    return result.rows[0];
  }catch(error){
    console.error(error)
  }
}

const updateChatConnection = async (chat_id, connection_id, schema) => {
    const result = await pool.query(`UPDATE ${schema}.chats set connection_id=$1 where id=$2 RETURNING *`, [connection_id, chat_id])
    return result.rows[0]
}

const createStatus = async(text, success, schema) => {
  const result = await pool.query(`INSERT INTO ${schema}.status(id, value, success) VALUES($1, $2, $3) RETURNING *`, [uuid4(), text, success])
  return result.rows[0]
}

const getStatus = async(schema)=>{
  const result = await pool.query(`SELECT * FROM ${schema}.status`)
  return result.rows
}

const getClosedChats = async(schema)=>{
  const result = await pool.query(
    `SELECT cc.*, c.created_at as created_at, c.connection_id as connection_id FROM ${schema}.chat_contact cc 
     LEFT JOIN ${schema}.chats c ON cc.chat_id = c.id`
  )
  return result.rows
}

const getAverageTimeToClose = async(schema)=>{
  const closed_chats = await pool.query(`
    SELECT * FROM ${schema}.chat_contact
    `)
  if (closed_chats.rowCount === 0) return 0;
  
  let totalTime = 0;
  let validChats = 0;
  
  for (const chat of closed_chats.rows) {
    if (chat.created_at && chat.closed_at) {
      // created_at está em Unix timestamp, converter para milissegundos
      const createdTime = chat.created_at * 1000; // Converter de segundos para milissegundos
      // closed_at está em formato ISO string, converter para milissegundos
      const closedTime = new Date(chat.closed_at).getTime();
      const timeDiff = closedTime - createdTime;
      if (timeDiff > 0) {
        totalTime += timeDiff;
        validChats++;
      }
    }
  }
  
  return validChats > 0 ? Math.floor(totalTime / validChats / (1000 * 60)) : 0; // Retorna em minutos
}





module.exports = {
  createChat,
  updateChatMessages,
  getMessages,
  getChatService,
  setUserChat,
  getChats,
  setChatQueue,
  updateQueue,
  getChatData,
  getChatByUser,
  saveMediaMessage,
  getChatById,
  createNewChat,
  setMessageIsUnread,
  setMessageAsRead, 
  closeChat,
  setSpecificUser,
  getChatIfUserIsNull,
  updateChatNameByNumber,
  scheduleMessage,
  getScheduledMessages,
  deleteScheduledMessage,
  disableBot,
  updateChatConnection,
  closeChatContact,
  createStatus,
  getStatus,
  getClosedChats,
  getAverageTimeToClose
};
