const pool = require('../db/queries');
const { v4: uuidv4 } = require('uuid');
const { getContactsInKanbanStage, changeContactInKanban } = require('./KanbanService');
const { sendTextMessage, fetchInstanceEvo } = require('../requests/evolution');
const { sendBlastMessage, sendMediaBlastMessage } = require('./MessageBlast');
const createRedisConnection = require('../config/Redis');
const { Queue, Worker } = require('bullmq');
const { saveMessage } = require('./MessageService');
const { Message } = require('../entities/Message');
const { getCurrentTimestamp, parseLocalDateTime } = require('./getCurrentTimestamp');
const {  createNewChat, updateQueue } = require('./ChatService');
const { fetchInstance } = require('./ConnectionService');

const bullConn = createRedisConnection();
const blastQueue = new Queue("Campanha", { connection: bullConn });

const worker = new Worker(
  'Campanha',
  async (job) => {
    try {
      const status = await fetchInstanceEvo()
      
      if(job.data.image){
        await sendMediaBlastMessage(
          job.data.instance,
          job.data.message,
          job.data.number,
          job.data.chat_id,
          job.data.image,
          job.data.schema
        )
      }else{
        await sendBlastMessage(
          job.data.instance,
          job.data.message,
          job.data.number,
          job.data.chat_id,
          job.data.schema
        );
      }
      if(job.data.stage){
        await changeContactInKanban(job.data.number, job.data.stage, job.data.schema);
      }
      if(job.data.queue){
        console.log('entrou if')
        await updateQueue(job.data.schema, job.data.chat_id, job.data.queue);
      }
      await insertCampaingChatTable(job.data.chat_id, job.data.campaing_id, job.data.schema);
      console.log(`Job ${job.id} processado com sucesso`);
    } catch (err) {
      console.error(`Erro ao enviar mensagem dentro do job ${job.id}:`, err.message);
      throw err; 
    }
      },
      {
        connection: bullConn,
        autorun: true,
      }
    );

worker.on('completed', (job) => {
  console.log(` Job ${job.id} concluído com sucesso.`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} falhou. Erro:`, err.message);
});

worker.on('error', (err) => {
  console.error('Erro geral no worker:', err.message);
});

const deleteAllConnectionsFromCampaing = async(campaing_id, schema)=>{
  await pool.query(`DELETE FROM ${schema}.campaing_connections where campaing_id=$1`,[campaing_id])
}

const insertConnectionsForCampaing = async(campaing_id, connections, schema)=>{
  // Normaliza: aceita array, string unica ou null.
  const list = Array.isArray(connections)
    ? connections.filter(Boolean)
    : (connections ? [connections] : []);
  if (list.length === 0) return;
  for (const connection of list) {
    await pool.query(
      `INSERT INTO ${schema}.campaing_connections(campaing_id, connection_id) VALUES ($1, $2)`,
      [campaing_id, connection]
    );
  }
}

const getAllCampaingConnections = async (campaing_id, schema) => {
  const result = await pool.query(`SELECT * FROM ${schema}.campaing_connections WHERE campaing_id=$1`, [campaing_id])
  return result.rows
}

// Converte um valor + unidade ('segundos'|'minutos'|'horas') em segundos.
// Retorna null se v nao for numero positivo.
const toSeconds = (v, unidade) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  switch (unidade) {
    case 'horas':   return n * 3600;
    case 'minutos': return n * 60;
    case 'segundos':
    default:        return n;
  }
};

// Normaliza o intervalo vindo do frontend para timer/min/max em segundos.
// Aceita qualquer combinacao: so timer fixo, so min, so max, min+max, ou nada.
// Default geral: timer = 30s se nada vier preenchido (evita undefined no INSERT).
const normalizeIntervalo = (intervalo) => {
  const i = intervalo || {};
  const timer = toSeconds(i.timer, i.unidade);
  const min   = toSeconds(i.min,   i.unidade_min);
  const max   = toSeconds(i.max,   i.unidade_max);

  if (timer && timer > 0) return { timer, min: null, max: null };
  if (min || max) {
    // se so um veio, usa o mesmo nos dois bounds — mantem intervalo "dinamico"
    // funcionando mesmo quando o usuario preencheu so um dos campos.
    return { timer: null, min: min ?? max, max: max ?? min };
  }
  return { timer: 30, min: null, max: null };
};

const createCampaing = async (campaing_id, campName, sector, kanbanStage, connectionId, startDate, schema, intervalo, init_time, end_time) => {
  try {
    const unixStartDate = parseLocalDateTime(startDate);
    const { timer, min, max } = normalizeIntervalo(intervalo);

    let result;
    let campaing;

    if (campaing_id) {
      result = await pool.query(
        `UPDATE ${schema}.campaing
            SET campaing_name=$1, sector=$2, kanban_stage=$3, start_date=$4,
                timer=$5, min=$6, max=$7, init_time=$8, end_time=$9
          WHERE id=$10 RETURNING *`,
        [campName, sector, kanbanStage, unixStartDate, timer, min, max, init_time, end_time, campaing_id]
      );
      campaing = result.rows[0];
      if (!campaing) throw new Error(`Campanha ${campaing_id} nao encontrada para update`);
      await deleteAllConnectionsFromCampaing(campaing.id, schema);
      await insertConnectionsForCampaing(campaing.id, connectionId, schema);
    } else {
      result = await pool.query(
        `INSERT INTO ${schema}.campaing
            (id, campaing_name, sector, kanban_stage, start_date,
             timer, min, max, init_time, end_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [uuidv4(), campName, sector, kanbanStage, unixStartDate, timer, min, max, init_time, end_time]
      );
      campaing = result.rows[0];
      await insertConnectionsForCampaing(campaing.id, connectionId, schema);
    }

    return campaing;
  } catch (error) {
    console.error('Erro ao criar/atualizar campanha:', error);
    throw error;
  }
};

const scheduleCampaingBlast = async (campaing, sector, schema, intervalo, new_stage, queue_id) => {

  try { 
    const startDate = Number(campaing.start_date);
    const now = Date.now();
    
    console.log('DEBUG - startDate timestamp:', startDate);
    console.log('DEBUG - startDate como Date:', new Date(startDate).toLocaleString());
    console.log('DEBUG - now timestamp:', now);
    console.log('DEBUG - now como Date:', new Date(now).toLocaleString());

    if (startDate < now) {
      console.log('Data de início já passou, não agendando campanha');
      return;
    }

    const kanban = await pool.query(
      `SELECT * FROM ${schema}.kanban_${sector} WHERE id=$1`, [campaing.kanban_stage]
    );
    if (kanban.rowCount === 0) {
      console.error(`Erro: Etapa Kanban com ID ${campaing.kanban_stage} não encontrada para o setor ${sector}.`);
      return; 
    }
    
    const contacts = await getContactsInKanbanStage(campaing.kanban_stage, schema);
    
    if (!contacts || contacts.length === 0) {
      console.log('Nenhum contato encontrado na etapa Kanban');
      return;
    }
    
    const messages = await pool.query(
      `SELECT * FROM ${schema}.message_blast WHERE campaing_id=$1`, [campaing.id]
    );
    if (messages.rowCount === 0) {
      console.error('Nenhuma mensagem encontrada para a campanha.');
      return;
    }
    const messageList = messages.rows;
    
    const baseDelay = Math.max(0, startDate - now);
    
    let intervalEmSegundos;
    if(!campaing.min){
      intervalEmSegundos = Number(campaing.timer) || 30;
    }
    
    const connections = await getAllCampaingConnections(campaing.id, schema);
    if (!connections || connections.length === 0) {
      console.error('Nenhuma conexão encontrada para a campanha.');
      return;
    }

    let jobCount = 0;
    const totalMessages = messageList.length;
    const totalContacts = contacts.length;
    const totalConnections = connections.length;
    
    // Calcula quantos grupos de contatos serão processados
    // Cada grupo tem o tamanho do número de conexões
    const totalGroups = Math.ceil(totalContacts / totalConnections);
    const totalJobs = totalContacts; // Um job para cada contato

    let accumulatedDelay = baseDelay;

    // --- NOVO BLOCO PARA RESPEITAR init_time e end_time ---
    let currentDate = new Date(startDate);
    let disparosAgendadosHoje = 0;
    let dailyWindowMs = null;
    let intervalMs = null;
    let maxDisparosPorDia = null;
    let contatosRestantes = totalContacts;
    let isFirstDay = true;
    let startTimeInMinutes = 0;
    let initTimeInMinutes = 0;
    let endTimeInMinutes = 0;

    if (campaing.init_time && campaing.end_time) {
      // Parse horários
      const [initHour, initMinute] = campaing.init_time.split(':').map(Number);
      const [endHour, endMinute] = campaing.end_time.split(':').map(Number);

      // Calcula janela diária completa em minutos
      const dailyWindowMinutes = (endHour * 60 + endMinute) - (initHour * 60 + initMinute);
      dailyWindowMs = dailyWindowMinutes * 60 * 1000;
      
      // Usa o timer configurado como intervalo (em segundos)
      intervalEmSegundos = Number(campaing.timer) || 30;
      intervalMs = intervalEmSegundos * 1000;
      
      // Calcula quantos contatos cabem no primeiro dia
      const startDateTime = new Date(startDate);
      const startHour = startDateTime.getHours();
      const startMinute = startDateTime.getMinutes();
      startTimeInMinutes = startHour * 60 + startMinute;
      initTimeInMinutes = initHour * 60 + initMinute;
      endTimeInMinutes = endHour * 60 + endMinute;
      
      let firstDayWindowMinutes = 0;
      
      if (startTimeInMinutes >= initTimeInMinutes && startTimeInMinutes < endTimeInMinutes) {
        // Start_date está dentro da janela de horário
        firstDayWindowMinutes = endTimeInMinutes - startTimeInMinutes;
        currentDate = new Date(startDate);
      } else if (startTimeInMinutes < initTimeInMinutes) {
        // Start_date é antes do init_time, aguarda até init_time
        firstDayWindowMinutes = dailyWindowMinutes;
        currentDate = new Date(startDate);
        currentDate.setHours(initHour, initMinute, 0, 0);
      } else {
        // Start_date é após end_time - respeita a data original do usuário
        firstDayWindowMinutes = 0;
        currentDate = new Date(startDate);
        // Não ajusta para o próximo dia, mantém a data original
      }
      
      console.log('DEBUG - startTimeInMinutes:', startTimeInMinutes);
      console.log('DEBUG - initTimeInMinutes:', initTimeInMinutes);
      console.log('DEBUG - endTimeInMinutes:', endTimeInMinutes);
      console.log('DEBUG - currentDate após ajuste:', currentDate.toLocaleString());
      
      // Calcula quantos contatos cabem no primeiro dia
      const contatosNoPrimeiroDia = Math.floor(firstDayWindowMinutes * 60 / intervalEmSegundos);
      maxDisparosPorDia = Math.min(contatosNoPrimeiroDia, contatosRestantes);
      
    }

    for (let jobIndex = 0; jobIndex < totalJobs; jobIndex++) {
      // --- NOVO BLOCO: calcula delay respeitando janela diária ---
      if (campaing.init_time && campaing.end_time) {
        if (disparosAgendadosHoje >= maxDisparosPorDia) {
          // Avança para o próximo dia útil no horário de início
          currentDate.setDate(currentDate.getDate() + 1);
          const [initHour, initMinute] = campaing.init_time.split(':').map(Number);
          currentDate.setHours(initHour, initMinute, 0, 0);
          disparosAgendadosHoje = 0;
          isFirstDay = false;
          
          // Recalcula quantos contatos cabem no dia atual
          const [initHourRecalc, initMinuteRecalc] = campaing.init_time.split(':').map(Number);
          const [endHourRecalc, endMinuteRecalc] = campaing.end_time.split(':').map(Number);
          const dailyWindowMinutes = (endHourRecalc * 60 + endMinuteRecalc) - (initHourRecalc * 60 + initMinuteRecalc);
          const contatosNoDia = Math.floor(dailyWindowMinutes * 60 / intervalEmSegundos);
          maxDisparosPorDia = Math.min(contatosNoDia, contatosRestantes);
          
        }
        
        // Se é o primeiro job e a data original está fora da janela, usa a data original
        if (jobIndex === 0 && startTimeInMinutes > endTimeInMinutes) {
          accumulatedDelay = startDate - Date.now();
          console.log('DEBUG - Usando data original (fora da janela):', new Date(startDate).toLocaleString());
        } else {
          accumulatedDelay = currentDate.getTime() - Date.now();
        }
        
        console.log('DEBUG - currentDate ajustado:', currentDate.toLocaleString());
        console.log('DEBUG - accumulatedDelay calculado:', accumulatedDelay);
        disparosAgendadosHoje++;
        contatosRestantes--;
      }
      // --- FIM DO NOVO BLOCO ---

      // Calcula o grupo atual e a posição dentro do grupo
      const groupIndex = Math.floor(jobIndex / totalConnections);
      const positionInGroup = jobIndex % totalConnections;
      const contactIndex = groupIndex * totalConnections + positionInGroup;

      if (contactIndex >= totalContacts) continue;

      const messageIndex = groupIndex % totalMessages;
      const connectionIdx = positionInGroup;
      const connection = connections[connectionIdx];
      const contact = contacts[contactIndex];
      const contactPhone = contact.number;
      const contactName = contact.contact_name;
      const message = messageList[messageIndex];

      if (campaing.min) {
        const min = Number(campaing.min);
        const max = Number(campaing.max);
        intervalEmSegundos = Math.floor(Math.random() * (max - min + 1)) + min;
        intervalMs = intervalEmSegundos * 1000;
      }

      // Buscar a instância da conexão
      const instance = await pool.query(
        `SELECT * FROM ${schema}.connections WHERE id=$1`, [connection.connection_id]
      );
      if (!instance.rows[0]) {
        console.error('Conexão não encontrada para a campanha');
        continue;
      }

      // Verificar se existe chat para o contato na conexão sorteada
      const existingChatQuery = await pool.query(
        `SELECT * FROM ${schema}.chats WHERE contact_phone=$1 AND connection_id=$2 AND status<>'closed' LIMIT 1`,
        [contactPhone, instance.rows[0].id]
      );

      let chatToUse = null;
      if (existingChatQuery.rowCount > 0) {
        chatToUse = existingChatQuery.rows[0];
      } else {
        try {
          chatToUse = await createNewChat(
            contactName,
            contactPhone,
            instance.rows[0].id,
            instance.rows[0].queue_id,
            null,
            schema,
            'disparo'
          );
        } catch (error) {
          console.error(`Erro ao criar chat para contato ${contactPhone}:`, error.message);
          continue;
        }
      }

      const job = await blastQueue.add('sendMessage', {
        instance: instance.rows[0].id,
        number: contactPhone,
        chat_id: chatToUse.id,
        campaing_id: campaing.id,
        message: message.value,
        image: message.image,
        schema: schema,
        stage: new_stage || null,
        queue: queue_id || null
      }, {
        delay: Math.max(0, accumulatedDelay),
        attempts: 1,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      });

      const scheduledTime = Date.now() + Math.max(0, accumulatedDelay);
      console.log(`DEBUG - accumulatedDelay:`, accumulatedDelay);
      console.log(`DEBUG - scheduledTime timestamp:`, scheduledTime);
      console.log(`DEBUG - scheduledTime como Date:`, new Date(scheduledTime).toLocaleString());
      console.log(`Agendando mensagem ${messageIndex + 1}/${totalMessages} para conexão ${connectionIdx + 1}/${connections.length} (contato ${contactPhone}) para:`, new Date(scheduledTime).toLocaleString());
      console.log(`Job ${job.id} agendado com sucesso, enviando pelo numero ${instance.rows[0].id}, para o ${contactPhone}`);

      jobCount++;

      // --- NOVO BLOCO: avança o horário do próximo disparo ---
      if (campaing.init_time && campaing.end_time) {
        currentDate = new Date(currentDate.getTime() + intervalMs);
        // Se passou do horário de fim, pula para o próximo dia útil
        const [endHour, endMinute] = campaing.end_time.split(':').map(Number);
        const endOfDay = new Date(currentDate);
        endOfDay.setHours(endHour, endMinute, 0, 0);
        if (currentDate > endOfDay) {
          currentDate.setDate(currentDate.getDate() + 1);
          const [initHour, initMinute] = campaing.init_time.split(':').map(Number);
          currentDate.setHours(initHour, initMinute, 0, 0);
          disparosAgendadosHoje = 0;
          isFirstDay = false;
        }
      } else {
        accumulatedDelay += intervalEmSegundos * 1000;
      }
    }
    console.log(`Campanha ${campaing.campaing_name} agendada com ${jobCount} mensagens`);
  } catch (error) {
    console.error('Erro ao agendar disparo da campanha:', error);
    throw error;
  }
};
const startCampaing = async (campaing_id, timer, schema) => {
  try {
    const campaing = await pool.query(
      `SELECT * FROM ${schema}.campaing WHERE id=$1`, [campaing_id]
    );
    
    if (campaing.rowCount === 0) {
      console.error('Campanha não encontrada');
      return;
    }
    
    const kanban = await pool.query(
      `SELECT * FROM ${schema}.kanban_${campaing.rows[0].sector} WHERE id=$1`, [campaing.rows[0].kanban_stage]
    );
    
    if (kanban.rowCount === 0) {
      console.error('Etapa Kanban não encontrada');
      return;
    }
    
    const contacts = await getContactsInKanbanStage(campaing.rows[0].kanban_stage, schema);
    
    if (!contacts || contacts.length === 0) {
      console.log('Nenhum contato encontrado na etapa Kanban');
      return;
    }
    
    const messages = await pool.query(
      `SELECT * FROM ${schema}.message_blast WHERE campaing_id=$1`, [campaing_id]
    );
    if (messages.rowCount === 0) {
      console.error('Nenhuma mensagem encontrada para a campanha.');
      return;
    }
    const messageList = messages.rows;
    let messageIndex = 0;
    
    // Usar o intervalo do banco de dados ou o timer passado como parâmetro
    const intervalEmSegundos = Number(campaing.rows[0].timer) || timer || 30;
    
    console.log(`Iniciando campanha ${campaing.rows[0].campaing_name} com ${contacts.length} contatos`);
    
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const contactPhone = contact.number;
      const contactName = contact.contact_name;
      
      // Buscar uma conexão disponível (round robin por grupo)
      const connections = await getAllCampaingConnections(campaing_id, schema);
      if (!connections || connections.length === 0) {
        console.error('Nenhuma conexão encontrada para a campanha');
        continue;
      }
      
      // Calcula qual conexão usar baseado no grupo
      const groupIndex = Math.floor(i / connections.length);
      const positionInGroup = i % connections.length;
      const connectionIndex = positionInGroup;
      const connection = connections[connectionIndex];
      
      const instance = await pool.query(
        `SELECT * FROM ${schema}.connections WHERE id=$1`, [connection.connection_id]
      );
      
      if (!instance.rows[0]) {
        console.warn(`Conexão não encontrada para connection_id ${connection.connection_id}`);
        continue;
      }
      
      // Procurar chat existente ou criar novo
      const existingChat = await pool.query(
        `SELECT * FROM ${schema}.chats WHERE contact_phone=$1 AND connection_id=$2 LIMIT 1`,
        [contactPhone, instance.rows[0].id]
      );
      
      let chatToUse = null;
      if (existingChat.rowCount > 0) {
        chatToUse = existingChat.rows[0];
      } else {
        // Chat não existe - cria um novo para o contato na conexão
        try {
          chatToUse = await createNewChat(
            contactName, 
            contactPhone, 
            instance.rows[0].id, 
            instance.rows[0].queue_id, 
            null, 
            schema,
            'disparo' // Status específico para chats criados por disparo
          );
        } catch (error) {
          console.error(`Erro ao criar chat para contato ${contactPhone}:`, error.message);
          continue;
        }
      }
      
      const message = messageList[messageIndex];
      messageIndex = (messageIndex + 1) % messageList.length;
      
      console.log(`Enviando mensagem ${i + 1}/${contacts.length} para ${contactPhone}`);
      
      // Verifica se a mensagem tem imagem
      if (message.image) {
        await sendMediaBlastMessage(
          instance.rows[0].id,
          message.value,
          contactPhone,
          chatToUse.id,
          message.image,
          schema
        );
      } else {
        await sendBlastMessage(
          instance.rows[0].id,
          message.value,
          contactPhone,
          chatToUse.id,
          schema
        );
      }
      
      if (i < contacts.length - 1) {
        console.log(`Aguardando ${intervalEmSegundos} segundos antes da próxima mensagem`);
        await sleep(intervalEmSegundos * 1000);
      }
    }
    
    console.log('Campanha finalizada com sucesso');
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error.message);
    throw error;
  }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getCampaings = async (schema) => {
  try {
    const result = await pool.query(
      `SELECT * FROM ${schema}.campaing`
    );
    return result.rows;
  } catch (error) {
    console.error('Erro ao buscar campanhas:', error.message);
    throw error;
  }
};

const getCampaingById = async (campaing_id, schema) => {
  try {
    const result = await pool.query(
      `SELECT * FROM ${schema}.campaing WHERE id=$1`, [campaing_id]
    );
    const connections = await getAllCampaingConnections(campaing_id, schema)
    return{
      result: result.rows[0],
      connections: connections
    };
  } catch (error) {
    console.error('Erro ao buscar campanha por ID:', error.message);
    throw error;
  }
};

const deleteCampaing = async(campaing_id, schema)=>{
  try {
    // Primeiro deleta as mensagens da campanha
    await pool.query(
      `DELETE FROM ${schema}.message_blast WHERE campaing_id=$1`, [campaing_id]
    );
    
    // Depois deleta a campanha
    const result = await pool.query(
      `DELETE FROM ${schema}.campaing WHERE id=$1 RETURNING *`, [campaing_id]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao deletar campanha:', error.message);
    throw error;
  }
}

const insertCampaingChatTable = async(chat_id, campaing_id, schema)=>{
  const result = await pool.query(`INSERT INTO ${schema}.campaing_chats(chat_id, campaing_id, created_at) VALUES ($1, $2, $3) RETURNING *`, [chat_id, campaing_id, getCurrentTimestamp()]);
  return result.rows[0];
}

const getCampaingChats = async(campaing_id, schema)=>{
  const chats = await pool.query(`SELECT cc.*, c.contact_name, c.contact_phone,c.status, c.id as chat_id FROM ${schema}.campaing_chats cc JOIN ${schema}.chats c ON cc.chat_id=c.id WHERE cc.campaing_id=$1 ORDER BY cc.created_at DESC`, [campaing_id]);
  console.log(chats.rows)
  return chats.rows;
}

const getCampaingsData = async (schema) => {
  const result = await pool.query(`SELECT * FROM ${schema}.campaing_chats`);
  return result.rows;
}


module.exports = {
  createCampaing,
  startCampaing,
  getCampaings,
  getCampaingById,
  deleteCampaing,
  scheduleCampaingBlast,
  getCampaingChats,
  getCampaingsData
};