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

// Schema entra interpolado nas queries (identificador nao e parametrizavel).
const SCHEMA_RE = /^[a-z][a-z0-9_]{1,40}$/;
const safeSchema = (schema) => {
  if (!SCHEMA_RE.test(schema || '')) throw new Error(`Nome de schema invalido: ${schema}`);
  return schema;
};

// Resultado de cada envio do disparo. Falha ao registrar nunca derruba o envio.
const marcarDisparo = async (data, campos) => {
  if (!data?.dispatch_id || !data?.schema) return;
  try {
    await pool.query(
      `UPDATE ${safeSchema(data.schema)}.campaing_dispatch
       SET status = $1, sent_at = $2, error = $3
       WHERE id = $4`,
      [campos.status, campos.sent_at || null, campos.error || null, data.dispatch_id]
    );
  } catch (e) {
    console.error('Erro ao registrar status do disparo:', e.message);
  }
};

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
      await marcarDisparo(job.data, { status: 'enviado', sent_at: Date.now() });
      console.log(`Job ${job.id} processado com sucesso`);
    } catch (err) {
      console.error(`Erro ao enviar mensagem dentro do job ${job.id}:`, err.message);
      // Ultima tentativa: fecha como falha. Antes disso segue 'pendente' porque o BullMQ vai repetir.
      // Na duvida (campo ausente) assume ultima tentativa: melhor mostrar falha do que
      // deixar um envio que morreu preso como "pendente" para sempre na tela de metricas.
      const tentativaAtual = Number(job.attemptsMade ?? 0) + 1;
      const maxTentativas = Number(job.opts?.attempts) || 1;
      const ultimaTentativa = !Number.isFinite(tentativaAtual) || tentativaAtual >= maxTentativas;
      await marcarDisparo(job.data, {
        status: ultimaTentativa ? 'falha' : 'pendente',
        error: err.message,
      });
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

      // Registra o contato como pendente ANTES de enfileirar, para a tela de métricas
      // mostrar o total agendado mesmo antes de qualquer envio acontecer.
      const dispatchId = uuidv4();
      await pool.query(
        `INSERT INTO ${schema}.campaing_dispatch
           (id, campaing_id, contact_number, contact_name, connection_id, chat_id, message_id, scheduled_for, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pendente')
         ON CONFLICT (campaing_id, contact_number) DO UPDATE SET
           contact_name = EXCLUDED.contact_name,
           connection_id = EXCLUDED.connection_id,
           chat_id = EXCLUDED.chat_id,
           message_id = EXCLUDED.message_id,
           scheduled_for = EXCLUDED.scheduled_for,
           status = 'pendente',
           sent_at = NULL,
           error = NULL`,
        [dispatchId, campaing.id, contactPhone, contactName, instance.rows[0].id,
         chatToUse.id, message.id, Date.now() + messageDelay]
      );

      const job = await blastQueue.add('sendMessage', {
        instance: instance.rows[0].id,
        number: contactPhone,
        chat_id: chatToUse.id,
        message: message.value,
        image: message.image,
        schema: schema,
        stage: new_stage || null,
        dispatch_id: dispatchId,
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

      await pool.query(
        `UPDATE ${schema}.campaing_dispatch SET job_id = $1 WHERE id = $2`,
        [String(job.id), dispatchId]
      );

      jobCount++;
    }
    // Reagendar limpa um cancelamento anterior: o status volta a ser deduzido dos envios.
    await pool.query(`UPDATE ${schema}.campaing SET status = NULL WHERE id = $1`, [campaing.id]);
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

// A coluna campaing.status nunca foi preenchida por lugar nenhum — o card exibia
// sempre vazio. Agora o status vem do que de fato aconteceu com os envios, e a
// coluna guarda apenas o cancelamento (unico estado que nao da para deduzir).
const getCampaings = async (schema) => {
  try {
    const result = await pool.query(
      `SELECT c.*,
              COALESCE(cx.canais, ARRAY[]::text[]) AS canais,
              COALESCE(c.status, CASE
                WHEN COALESCE(d.total, 0) = 0 THEN 'nao agendado'
                WHEN d.pendentes > 0 AND d.enviados > 0 THEN 'em andamento'
                WHEN d.pendentes > 0 THEN 'agendado'
                ELSE 'concluido'
              END) AS status
         FROM ${schema}.campaing c
         LEFT JOIN (
           SELECT cc.campaing_id, array_agg(cn.name ORDER BY cn.name) AS canais
             FROM ${schema}.campaing_connections cc
             JOIN ${schema}.connections cn ON cn.id = cc.connection_id
            GROUP BY cc.campaing_id
         ) cx ON cx.campaing_id = c.id
         LEFT JOIN (
           SELECT campaing_id,
                  COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE status = 'pendente')::int AS pendentes,
                  COUNT(*) FILTER (WHERE status = 'enviado')::int AS enviados
             FROM ${schema}.campaing_dispatch
            GROUP BY campaing_id
         ) d ON d.campaing_id = c.id`
    );
    return result.rows;
  } catch (error) {
    // Tenant sem a tabela de dispatch (migracao ainda nao rodou) nao pode derrubar
    // a tela inteira de Disparos: cai para a listagem simples, sem status deduzido.
    console.error('Erro ao buscar campanhas com status:', error.message);
    const result = await pool.query(`SELECT * FROM ${schema}.campaing`);
    return result.rows;
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


// Cancela o que ainda nao saiu: tira os jobs pendentes da fila do BullMQ e marca
// os registros como cancelados. Mensagem que ja saiu nao volta, e job que esta
// sendo processado neste instante nao pode ser removido — esses seguem o curso
// normal e o retorno diz quantos foram.
const cancelCampaing = async (campaing_id, schema) => {
  safeSchema(schema);

  const pendentes = await pool.query(
    `SELECT id, job_id FROM ${schema}.campaing_dispatch
      WHERE campaing_id = $1 AND status = 'pendente'`,
    [campaing_id]
  );

  const cancelados = [];
  const naoRemovidos = [];

  for (const linha of pendentes.rows) {
    if (!linha.job_id) {
      // Sem job na fila: nada para remover, o registro so nao deve seguir pendente.
      cancelados.push(linha.id);
      continue;
    }
    try {
      const job = await blastQueue.getJob(linha.job_id);
      if (!job) {
        cancelados.push(linha.id);
        continue;
      }
      await job.remove();
      cancelados.push(linha.id);
    } catch (e) {
      // Tipicamente job travado em execucao: a mensagem dele ainda vai sair.
      console.warn(`Job ${linha.job_id} nao pode ser removido: ${e.message}`);
      naoRemovidos.push(linha.id);
    }
  }

  if (cancelados.length > 0) {
    await pool.query(
      `UPDATE ${schema}.campaing_dispatch
          SET status = 'cancelado'
        WHERE id = ANY($1::uuid[])`,
      [cancelados]
    );
  }

  await pool.query(
    `UPDATE ${schema}.campaing SET status = 'cancelado' WHERE id = $1`,
    [campaing_id]
  );

  return {
    cancelados: cancelados.length,
    em_execucao: naoRemovidos.length,
    total_pendentes: pendentes.rows.length,
  };
};

// Tudo que define um disparo, em uma consulta: configuracao + canais + mensagens +
// etapa alvo. Alimenta a tela "Ver detalhes".
const getCampaingDetails = async (campaing_id, schema) => {
  safeSchema(schema);

  const campaingRes = await pool.query(
    `SELECT * FROM ${schema}.campaing WHERE id = $1`, [campaing_id]
  );
  const campaing = campaingRes.rows[0];
  if (!campaing) return null;

  const canais = await pool.query(
    `SELECT c.id, c.name, c.number, c.status
       FROM ${schema}.campaing_connections cc
       JOIN ${schema}.connections c ON c.id = cc.connection_id
      WHERE cc.campaing_id = $1
      ORDER BY c.name`,
    [campaing_id]
  );

  const mensagens = await pool.query(
    `SELECT id, value, image FROM ${schema}.message_blast WHERE campaing_id = $1`,
    [campaing_id]
  );

  // A etapa vive em kanban_<funil>; funil invalido nao pode virar SQL.
  let etapa = null;
  if (campaing.sector && /^[a-z0-9_]{1,40}$/i.test(campaing.sector)) {
    try {
      const etapaRes = await pool.query(
        `SELECT id, etapa, color FROM ${schema}.kanban_${campaing.sector} WHERE id = $1`,
        [campaing.kanban_stage]
      );
      etapa = etapaRes.rows[0] || null;
    } catch (e) {
      console.warn(`Etapa do disparo nao encontrada (funil "${campaing.sector}"): ${e.message}`);
    }
  }

  const alvo = await pool.query(
    `SELECT COUNT(*)::int AS total FROM ${schema}.contacts_stage WHERE stage = $1`,
    [campaing.kanban_stage]
  );

  return {
    campaing,
    canais: canais.rows,
    mensagens: mensagens.rows,
    etapa,
    total_contatos_alvo: alvo.rows[0]?.total || 0,
  };
};

// Metricas do que ja foi disparado. Honesto sobre o limite: o WhatsApp confirma
// entrega/leitura por ack, e o CRM ainda nao guarda ack de mensagem enviada —
// entao aqui medimos enviado/falha/pendente e resposta do contato.
const getCampaingMetrics = async (campaing_id, schema) => {
  safeSchema(schema);

  const resumo = await pool.query(
    `SELECT status, COUNT(*)::int AS total
       FROM ${schema}.campaing_dispatch
      WHERE campaing_id = $1
      GROUP BY status`,
    [campaing_id]
  );

  const janela = await pool.query(
    `SELECT MIN(sent_at) AS primeiro, MAX(sent_at) AS ultimo
       FROM ${schema}.campaing_dispatch
      WHERE campaing_id = $1 AND sent_at IS NOT NULL`,
    [campaing_id]
  );

  // Resposta = mensagem recebida no chat do contato depois do envio.
  const contatos = await pool.query(
    `SELECT d.contact_number,
            d.contact_name,
            d.status,
            d.sent_at,
            d.error,
            c.name AS canal,
            EXISTS (
              SELECT 1 FROM ${schema}.messages m
               WHERE m.chat_id = d.chat_id
                 AND m.from_me = false
                 AND d.sent_at IS NOT NULL
                 AND m.created_at > d.sent_at
            ) AS respondeu
       FROM ${schema}.campaing_dispatch d
       LEFT JOIN ${schema}.connections c ON c.id = d.connection_id
      WHERE d.campaing_id = $1
      ORDER BY d.sent_at NULLS LAST, d.contact_name`,
    [campaing_id]
  );

  const porStatus = resumo.rows.reduce((acc, r) => ({ ...acc, [r.status]: r.total }), {});
  const enviados = porStatus.enviado || 0;
  const respostas = contatos.rows.filter((c) => c.respondeu).length;

  return {
    total: contatos.rows.length,
    enviados,
    falhas: porStatus.falha || 0,
    pendentes: porStatus.pendente || 0,
    cancelados: porStatus.cancelado || 0,
    respostas,
    taxa_resposta: enviados > 0 ? Math.round((respostas / enviados) * 1000) / 10 : 0,
    primeiro_envio: janela.rows[0]?.primeiro ? Number(janela.rows[0].primeiro) : null,
    ultimo_envio: janela.rows[0]?.ultimo ? Number(janela.rows[0].ultimo) : null,
    contatos: contatos.rows,
  };
};

module.exports = {
  createCampaing,
  startCampaing,
  getCampaings,
  getCampaingById,
  deleteCampaing,
  scheduleCampaingBlast,
  getCampaingDetails,
  getCampaingMetrics,
  cancelCampaing
};