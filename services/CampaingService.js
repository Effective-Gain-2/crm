const pool = require('../db/queries');
const { v4: uuidv4 } = require('uuid');
const { getContactsInKanbanStage, updateContactInKanban } = require('./KanbanService');
const { sendTextMessage, fetchInstanceEvo } = require('../requests/evolution');
const { sendBlastMessage, sendMediaBlastMessage } = require('./MessageBlast');
const createRedisConnection = require('../config/Redis');
const { Queue, Worker } = require('bullmq');
const { saveMessage } = require('./MessageService');
const { Message } = require('../entities/Message');
const { getCurrentTimestamp, parseLocalDateTime } = require('./getCurrentTimestamp');
const { updateChatConnection, createNewChat } = require('./ChatService');
const { fetchInstance } = require('./ConnectionService');

const bullConn = createRedisConnection();
const blastQueue = new Queue("Campanha", { connection: bullConn });

const worker = new Worker(
  'Campanha',
  async (job) => {
    try {
      console.log(`Processando job ${job.id} para número ${job.data}`);

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
      if(job.data.stage!==null){
        await updateContactInKanban(job.data.number, job.data.stage, job.data.schema);
      }
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
  for(const connection of connections){
    await pool.query(`INSERT INTO ${schema}.campaing_connections(campaing_id, connection_id) VALUES ($1, $2)`, [campaing_id, connection])
  }
}

const getAllCampaingConnections = async (campaing_id, schema) => {
  const result = await pool.query(`SELECT * FROM ${schema}.campaing_connections WHERE campaing_id=$1`, [campaing_id])
  return result.rows
}

const createCampaing = async (campaing_id, campName, sector, kanbanStage, connectionId, startDate, schema, intervalo) => {
  try {
    const unixStartDate = parseLocalDateTime(startDate);

    // Converter o intervalo para segundos baseado na unidade
    let intervalEmSegundos;
    let intervalMinEmSegundos
    let intervalMaxEmSegundos

    if (intervalo && intervalo.unidade) {
      switch (intervalo.unidade) {
        case 'horas':
          intervalEmSegundos = intervalo.timer * 3600;
          break;
        case 'minutos':
          intervalEmSegundos = intervalo.timer * 60;
          break;
        case 'segundos':
        default:
          intervalEmSegundos = intervalo.timer;
          break;
      }
    } else if(intervalo.min && intervalo.max){
        switch(intervalo.unidade_min){
          case 'horas':
          intervalMinEmSegundos = intervalo.min * 3600;
          break;
        case 'minutos':
          intervalMinEmSegundos = intervalo.min * 60;
          break;
        case 'segundos':
        default:
          intervalMinEmSegundos = intervalo.min;
          break;
        }
        switch(intervalo.unidade_max){
          case 'horas':
          intervalMaxEmSegundos = intervalo.max * 3600;
          break;
        case 'minutos':
          intervalMaxEmSegundos = intervalo.max * 60;
          break;
        case 'segundos':
        default:
          intervalMaxEmSegundos = intervalo.max;
          break;
        }
    }

    let result;
    let campaing;

    if (campaing_id) {
      if(intervalMinEmSegundos){
        result = await pool.query(
        `UPDATE ${schema}.campaing 
         SET campaing_name=$1, sector=$2, kanban_stage=$3, start_date=$4, timer=$5, min=$7, max=$8
         WHERE id=$6  RETURNING *`,
        [campName, sector, kanbanStage, unixStartDate, null, campaing_id, intervalMinEmSegundos, intervalMaxEmSegundos]
      );
      campaing = result.rows[0];
      await deleteAllConnectionsFromCampaing(campaing.id, schema)
      await insertConnectionsForCampaing(campaing.id,connectionId, schema)
      }else{
         result = await pool.query(
        `UPDATE ${schema}.campaing 
         SET campaing_name=$1, sector=$2, kanban_stage=$3, start_date=$4, timer=$5, min=$7, max=$8
         WHERE id=$6 RETURNING *`,
        [campName, sector, kanbanStage, unixStartDate, intervalEmSegundos, campaing_id, null, null]
      );
      campaing = result.rows[0];
      await deleteAllConnectionsFromCampaing(campaing.id, schema)
      await insertConnectionsForCampaing(campaing.id,connectionId, schema)
      }
     
    } else {
      if(intervalMinEmSegundos) {
        result = await pool.query(
          `INSERT INTO ${schema}.campaing (id, campaing_name, sector, kanban_stage, start_date, timer, min, max) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [uuidv4(), campName, sector, kanbanStage, unixStartDate, null, intervalMinEmSegundos, intervalMaxEmSegundos]
        );
        campaing = result.rows[0];
        await insertConnectionsForCampaing(campaing.id,connectionId, schema)
      } else {
        result = await pool.query(
          `INSERT INTO ${schema}.campaing (id, campaing_name, sector, kanban_stage, start_date, timer) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [uuidv4(), campName, sector, kanbanStage, unixStartDate, intervalEmSegundos]
        );
        campaing = result.rows[0];
        await insertConnectionsForCampaing(campaing.id,connectionId, schema)
      }
    }

    return campaing;
  } catch (error) {
    console.error('Erro ao criar/atualizar campanha:', error);
    throw error;
  }
};

const scheduleCampaingBlast = async (campaing, sector, schema, intervalo, new_stage) => {
  try { 
    const startDate = Number(campaing.start_date);
    const now = Date.now();

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
    
    // Intervalo entre mensagens do disparo — sorteado POR MENSAGEM quando há min/max
    // (cadência irregular é o que não parece robô). O sorteio já existia dentro do laço;
    // aqui ele fica em um lugar só e à prova de NaN: min sem max, campo vazio ou valor
    // inválido resultariam em delay NaN, que a fila trata como "sem espera" — rajada
    // silenciosa e risco real de bloqueio da conta.
    const intervaloFixo = Number(campaing.timer) || 30;
    const intervaloMin = Number(campaing.min) || 0;
    const intervaloMax = Math.max(intervaloMin, Number(campaing.max) || intervaloMin);
    // Sorteia por MENSAGEM (não uma vez só): cadência irregular é o que não parece robô.
    const proximoIntervalo = () => {
      const s = intervaloMin > 0
        ? intervaloMin + Math.random() * (intervaloMax - intervaloMin)
        : intervaloFixo;
      // Piso de 1s: protege de configuração zerada/NaN virar rajada instantânea
      return Math.max(1, Number.isFinite(s) ? s : 30);
    };

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

    for (let jobIndex = 0; jobIndex < totalJobs; jobIndex++) {
      // Calcula o grupo atual e a posição dentro do grupo
      const groupIndex = Math.floor(jobIndex / totalConnections);
      const positionInGroup = jobIndex % totalConnections;
      
      // Calcula qual contato e qual conexão para este job
      const contactIndex = groupIndex * totalConnections + positionInGroup;
      
      // Se o contato não existe, pula
      if (contactIndex >= totalContacts) {
        continue;
      }
      
      const messageIndex = groupIndex % totalMessages; // Rotação de mensagens por grupo
      const connectionIdx = positionInGroup; // Cada conexão tem sua posição fixa no grupo
      
      const connection = connections[connectionIdx];
      const contact = contacts[contactIndex];
      const contactPhone = contact.number;
      const contactName = contact.contact_name;
      const message = messageList[messageIndex];

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
        // Chat existe - usa ele
        chatToUse = existingChatQuery.rows[0];
      } else {
        // Chat não existe - cria um novo para o contato na conexão sorteada
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
      
      // O delay é calculado por job
      const messageDelay = accumulatedDelay;
      accumulatedDelay += proximoIntervalo() * 1000;
      
      const job = await blastQueue.add('sendMessage', {
        instance: instance.rows[0].id,
        number: contactPhone,
        chat_id: chatToUse.id,
        message: message.value,
        image: message.image,
        schema: schema,
        stage: new_stage || null,
      }, { 
        delay: messageDelay, 
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }); 
        console.log(`Agendando mensagem ${messageIndex + 1}/${totalMessages} para conexão ${connectionIdx + 1}/${connections.length} (contato ${contactPhone}) para:`, new Date(Date.now() + messageDelay).toLocaleString());
        console.log(`Job ${job.id} agendado com sucesso, enviando pelo numero ${instance.rows[0].id}, para o ${contactPhone}`);

      jobCount++;
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


module.exports = {
  createCampaing,
  startCampaing,
  getCampaings,
  getCampaingById,
  deleteCampaing,
  scheduleCampaingBlast
};