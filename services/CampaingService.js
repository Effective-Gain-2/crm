const pool = require('../db/queries');
const { v4: uuidv4 } = require('uuid');
const { getContactsInKanbanStage, updateContactInKanban } = require('./KanbanService');
const { getContatosDaLista } = require('./ListaService');
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
      
      const confirmacao = job.data.image
        ? await sendMediaBlastMessage(
            job.data.instance,
            job.data.message,
            job.data.number,
            job.data.chat_id,
            job.data.image,
            job.data.schema
          )
        : await sendBlastMessage(
            job.data.instance,
            job.data.message,
            job.data.number,
            job.data.chat_id,
            job.data.schema
          );

      // Envio recusado nao vira excecao de proposito: repetir poderia entregar duas
      // vezes uma mensagem que talvez tenha saido. Registra a falha com o motivo e
      // encerra o job.
      if (!confirmacao?.ok) {
        await marcarDisparo(job.data, { status: 'falha', error: confirmacao?.motivo || 'falha desconhecida' });
        console.warn(`Job ${job.id} nao enviou para ${job.data.number}: ${confirmacao?.motivo}`);
        return;
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

// Tags do disparo. Substitui o conjunto inteiro: editar um disparo tirando uma tag
// tem de tirar mesmo, senao o alvo so cresce.
const setCampaingTags = async (campaing_id, tags, schema) => {
  await pool.query(`DELETE FROM ${schema}.campaing_tags WHERE campaing_id=$1`, [campaing_id]);
  for (const tagId of tags || []) {
    if (!tagId) continue;
    await pool.query(
      `INSERT INTO ${schema}.campaing_tags (campaing_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [campaing_id, tagId]
    );
  }
};

const getCampaingTags = async (campaing_id, schema) => {
  const result = await pool.query(
    `SELECT t.id, t.name, t.color
       FROM ${schema}.campaing_tags ct
       JOIN ${schema}.tag t ON t.id = ct.tag_id
      WHERE ct.campaing_id = $1
      ORDER BY t.name`,
    [campaing_id]
  );
  return result.rows;
};

// A tag vive no chat, nao no contato: quem tem a tag e o atendimento. O contato
// alvo e o dono do chat marcado. DISTINCT porque a mesma pessoa pode ter varios
// chats marcados (uma conexao cada) e nao pode receber a mensagem duas vezes.
const getContatosPorTags = async (campaing_id, schema) => {
  const result = await pool.query(
    `SELECT DISTINCT c.number, c.contact_name
       FROM ${schema}.campaing_tags ct
       JOIN ${schema}.chat_tag cht ON cht.tag_id = ct.tag_id
       JOIN ${schema}.chats ch ON ch.id = cht.chat_id
       JOIN ${schema}.contacts c ON c.number = ch.contact_phone
      WHERE ct.campaing_id = $1`,
    [campaing_id]
  );
  return result.rows;
};

// start_date, timer, min e max sao BIGINT: numero quebrado ou NaN chegando neles
// derruba o INSERT com "invalid input syntax for type bigint" — foi exatamente o
// que aconteceu com o delay sorteado do intervalo dinamico. Tudo que e computado
// antes de virar coluna inteira passa por aqui.
const inteiroOuNull = (v) => (Number.isFinite(v) ? Math.round(v) : null);

// ---------------------------------------------------------------------------
// Agenda por canal: dois disparos simultaneos no mesmo numero de WhatsApp e
// receita de banimento. Antes de agendar qualquer coisa, a janela do novo
// disparo e comparada com as janelas pendentes de cada canal envolvido.
// ---------------------------------------------------------------------------

const MARGEM_AGENDA_MS = 60_000;

// Quanto tempo o disparo ocupa o canal: n contatos x intervalo medio + margem.
const estimarDuracaoMs = (campaing, totalContatos) => {
  const min = Number(campaing.min) || 0;
  const max = Math.max(min, Number(campaing.max) || min);
  const medioSeg = min > 0 ? (min + max) / 2 : (Number(campaing.timer) || 30);
  return Math.round(Math.max(1, totalContatos) * medioSeg * 1000) + MARGEM_AGENDA_MS;
};

// Quantos contatos o alvo alcanca hoje — sem gravar nada. Usado pela checagem
// de agenda ANTES de qualquer escrita.
const contarAlvo = async ({ lista_id, kanban_stage, tags }, schema) => {
  safeSchema(schema);
  if (lista_id) {
    const r = await pool.query(
      `SELECT COUNT(*)::int AS total FROM ${schema}.lista_contatos WHERE lista_id = $1`, [lista_id]
    );
    return r.rows[0]?.total || 0;
  }
  if (Array.isArray(tags) && tags.length > 0) {
    const r = await pool.query(
      `SELECT COUNT(DISTINCT ch.contact_phone)::int AS total
         FROM ${schema}.chat_tag cht
         JOIN ${schema}.chats ch ON ch.id = cht.chat_id
        WHERE cht.tag_id = ANY($1::uuid[])`, [tags]
    );
    return r.rows[0]?.total || 0;
  }
  if (kanban_stage) {
    const r = await pool.query(
      `SELECT COUNT(*)::int AS total FROM ${schema}.contacts_stage WHERE stage = $1`, [kanban_stage]
    );
    return r.rows[0]?.total || 0;
  }
  return 0;
};

// Janela ocupada de um canal = MIN..MAX(scheduled_for) dos envios pendentes,
// por campanha. Sobreposicao com a janela nova (com margem) = conflito.
const verificarAgendaCanal = async (connectionIds, startMs, duracaoMs, schema, ignorarCampaingId = null) => {
  safeSchema(schema);
  const ids = (connectionIds || []).filter(Boolean).map(String);
  if (ids.length === 0) return { livre: true, conflitos: [], proximoLivre: null };

  const fimNovo = startMs + duracaoMs;
  const result = await pool.query(
    `SELECT cn.name AS canal, c.campaing_name AS disparo,
            MIN(cd.scheduled_for)::bigint AS ini, MAX(cd.scheduled_for)::bigint AS fim
       FROM ${schema}.campaing_dispatch cd
       JOIN ${schema}.connections cn ON cn.id = cd.connection_id
       JOIN ${schema}.campaing c ON c.id = cd.campaing_id
      WHERE cd.status = 'pendente'
        AND cd.connection_id = ANY($1::uuid[])
        AND ($2::uuid IS NULL OR cd.campaing_id <> $2::uuid)
      GROUP BY cn.name, c.campaing_name`,
    [ids, ignorarCampaingId]
  );

  const conflitos = result.rows.filter((j) =>
    Number(j.ini) - MARGEM_AGENDA_MS <= fimNovo && Number(j.fim) + MARGEM_AGENDA_MS >= startMs
  );
  if (conflitos.length === 0) return { livre: true, conflitos: [], proximoLivre: null };

  const proximoLivre = Math.max(...conflitos.map((j) => Number(j.fim))) + MARGEM_AGENDA_MS;
  return {
    livre: false,
    conflitos: conflitos.map((j) => ({ canal: j.canal, disparo: j.disparo, fim: Number(j.fim) })),
    proximoLivre,
  };
};

const horaBR = (ms) => new Date(ms).toLocaleString('pt-BR', {
  timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
});

// Usa um modelo: clona campanha + canais + mensagens numa EXECUCAO apontando para
// a lista, valida a agenda dos canais e agenda. O modelo nunca e alterado.
const executarModelo = async (modelo_id, lista_id, start_date, schema) => {
  safeSchema(schema);

  const modeloRes = await pool.query(
    `SELECT * FROM ${schema}.campaing WHERE id = $1 AND is_modelo = true`, [modelo_id]
  );
  const modelo = modeloRes.rows[0];
  if (!modelo) throw new Error('Modelo de disparo não encontrado');

  const listaRes = await pool.query(`SELECT * FROM ${schema}.listas WHERE id = $1`, [lista_id]);
  const lista = listaRes.rows[0];
  if (!lista) throw new Error('Lista não encontrada');

  const contatos = await getContatosDaLista(lista_id, schema);
  if (contatos.length === 0) throw new Error(`A lista "${lista.nome}" não tem nenhum contato`);

  const canais = await getAllCampaingConnections(modelo_id, schema);
  if (canais.length === 0) throw new Error(`O modelo "${modelo.campaing_name}" não tem canal configurado — edite o modelo e escolha o canal`);

  const mensagens = await pool.query(
    `SELECT * FROM ${schema}.message_blast WHERE campaing_id = $1`, [modelo_id]
  );
  if (mensagens.rowCount === 0) throw new Error(`O modelo "${modelo.campaing_name}" não tem mensagem cadastrada`);

  const inicio = parseLocalDateTime(start_date);
  if (!Number.isFinite(inicio)) throw new Error(`Data/hora de início inválida: "${start_date}"`);
  if (inicio < Date.now() - MARGEM_AGENDA_MS) {
    throw new Error(`A data/hora de início (${horaBR(inicio)}) já passou. Escolha um horário futuro.`);
  }

  const duracao = estimarDuracaoMs(modelo, contatos.length);
  const agenda = await verificarAgendaCanal(canais.map((c) => c.connection_id), inicio, duracao, schema, null);
  if (!agenda.livre) {
    const pior = agenda.conflitos.reduce((a, b) => (a.fim >= b.fim ? a : b));
    const err = new Error(
      `O canal "${pior.canal}" está ocupado pelo disparo "${pior.disparo}" até ${horaBR(pior.fim)}. ` +
      `Próximo horário livre: ${horaBR(agenda.proximoLivre)}.`
    );
    err.codigo = 'conflito_agenda';
    err.proximoLivre = agenda.proximoLivre;
    throw err;
  }

  // Clone: a execucao nasce independente — apagar ou editar o modelo depois nao a afeta.
  const execucaoId = uuidv4();
  const nomeExecucao = `${modelo.campaing_name} — ${lista.nome}`;
  const execRes = await pool.query(
    `INSERT INTO ${schema}.campaing
       (id, campaing_name, sector, kanban_stage, start_date, timer, min, max, lista_id, is_modelo, modelo_id)
     VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, $8, false, $9) RETURNING *`,
    [execucaoId, nomeExecucao, 'lista', inteiroOuNull(inicio),
     inteiroOuNull(Number(modelo.timer)), inteiroOuNull(Number(modelo.min)), inteiroOuNull(Number(modelo.max)),
     lista_id, modelo_id]
  );
  for (const canal of canais) {
    await pool.query(
      `INSERT INTO ${schema}.campaing_connections (campaing_id, connection_id) VALUES ($1, $2)`,
      [execucaoId, canal.connection_id]
    );
  }
  for (const msg of mensagens.rows) {
    await pool.query(
      `INSERT INTO ${schema}.message_blast (id, value, sector, campaing_id, image) VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), msg.value, 'lista', execucaoId, msg.image]
    );
  }

  const execucao = execRes.rows[0];
  await scheduleCampaingBlast(execucao, execucao.sector, schema, null, null);
  return execucao;
};

const createCampaing = async (campaing_id, campName, sector, kanbanStage, connectionId, startDate, schema, intervalo, listaId = null, isModelo = false) => {
  try {
    // Modelo nao agenda nada: guarda mensagens/canais/intervalo e dispensa data.
    const unixStartDate = isModelo ? null : parseLocalDateTime(startDate);
    // Data invalida vira NaN, e NaN em BIGINT viraria outro erro criptico de banco.
    // Melhor recusar aqui com uma frase que a tela consegue mostrar.
    if (!isModelo && !Number.isFinite(unixStartDate)) {
      throw new Error(`Data de início inválida: "${startDate}"`);
    }

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

    // Normaliza antes de gravar: timer/min/max fracionarios (ou invalidos) do corpo
    // da requisicao nao podem alcancar as colunas BIGINT.
    intervalEmSegundos = inteiroOuNull(Number(intervalEmSegundos));
    intervalMinEmSegundos = inteiroOuNull(Number(intervalMinEmSegundos));
    intervalMaxEmSegundos = inteiroOuNull(Number(intervalMaxEmSegundos));

    let result;
    let campaing;

    if (campaing_id) {
      if(intervalMinEmSegundos){
        result = await pool.query(
        `UPDATE ${schema}.campaing
         SET campaing_name=$1, sector=$2, kanban_stage=$3, start_date=$4, timer=$5, min=$7, max=$8, lista_id=$9, is_modelo=$10
         WHERE id=$6  RETURNING *`,
        [campName, sector, kanbanStage, unixStartDate, null, campaing_id, intervalMinEmSegundos, intervalMaxEmSegundos, listaId, isModelo]
      );
      campaing = result.rows[0];
      await deleteAllConnectionsFromCampaing(campaing.id, schema)
      await insertConnectionsForCampaing(campaing.id,connectionId, schema)
      }else{
         result = await pool.query(
        `UPDATE ${schema}.campaing
         SET campaing_name=$1, sector=$2, kanban_stage=$3, start_date=$4, timer=$5, min=$7, max=$8, lista_id=$9, is_modelo=$10
         WHERE id=$6 RETURNING *`,
        [campName, sector, kanbanStage, unixStartDate, intervalEmSegundos, campaing_id, null, null, listaId, isModelo]
      );
      campaing = result.rows[0];
      await deleteAllConnectionsFromCampaing(campaing.id, schema)
      await insertConnectionsForCampaing(campaing.id,connectionId, schema)
      }

    } else {
      if(intervalMinEmSegundos) {
        result = await pool.query(
          `INSERT INTO ${schema}.campaing (id, campaing_name, sector, kanban_stage, start_date, timer, min, max, lista_id, is_modelo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
          [uuidv4(), campName, sector, kanbanStage, unixStartDate, null, intervalMinEmSegundos, intervalMaxEmSegundos, listaId, isModelo]
        );
        campaing = result.rows[0];
        await insertConnectionsForCampaing(campaing.id,connectionId, schema)
      } else {
        result = await pool.query(
          `INSERT INTO ${schema}.campaing (id, campaing_name, sector, kanban_stage, start_date, timer, lista_id, is_modelo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [uuidv4(), campName, sector, kanbanStage, unixStartDate, intervalEmSegundos, listaId, isModelo]
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

// Salvar um disparo agenda um conjunto novo de jobs. Sem tirar o conjunto anterior
// da fila, salvar duas vezes fazia cada contato receber duas mensagens — e a metrica
// so enxergava o agendamento mais recente, entao o envio dobrado nem aparecia na tela.
const limparAgendamentoAnterior = async (campaing_id, schema) => {
  const pendentes = await pool.query(
    `SELECT id, job_id FROM ${schema}.campaing_dispatch
      WHERE campaing_id = $1 AND status = 'pendente'`,
    [campaing_id]
  );

  let removidos = 0;
  let presos = 0;

  for (const linha of pendentes.rows) {
    if (!linha.job_id) continue;
    try {
      const job = await blastQueue.getJob(linha.job_id);
      if (job) await job.remove();
      removidos++;
    } catch (e) {
      // Job em execucao nao sai da fila: a mensagem dele ainda vai sair.
      console.warn(`Reagendamento: job ${linha.job_id} nao pode ser removido: ${e.message}`);
      presos++;
    }
  }

  if (pendentes.rowCount > 0) {
    // Marca cancelado, nao apaga: contato que saiu do alvo fica com registro honesto
    // em vez de pendente eterno. Quem continua no alvo volta a 'pendente' no upsert.
    await pool.query(
      `UPDATE ${schema}.campaing_dispatch
          SET status = 'cancelado'
        WHERE campaing_id = $1 AND status = 'pendente'`,
      [campaing_id]
    );
    console.log(`Reagendamento da campanha ${campaing_id}: ${removidos} job(s) retirados da fila, ${presos} ja em execucao.`);
  }

  return { removidos, presos };
};

const scheduleCampaingBlast = async (campaing, sector, schema, intervalo, new_stage) => {
  try {
    // Modelo e so a receita (mensagens/canais/intervalo): quem agenda e a execucao
    // clonada por executarModelo, nunca o modelo em si.
    if (campaing.is_modelo) return;

    const startDate = Number(campaing.start_date);
    const now = Date.now();

    // Antes de qualquer coisa: o agendamento anterior deixa de valer no momento em que
    // este substitui. Vale inclusive quando nao vamos reagendar nada abaixo — salvar
    // com data no passado tem de parar o disparo antigo, nao conviver com ele.
    await limparAgendamentoAnterior(campaing.id, schema);

    if (startDate < now) {
      console.log('Data de início já passou, não agendando campanha');
      return;
    }

    // O alvo pode ser uma lista de contatos, um conjunto de tags ou uma etapa do funil.
    const tagsDoDisparo = await getCampaingTags(campaing.id, schema);

    let contacts;
    if (campaing.lista_id) {
      contacts = await getContatosDaLista(campaing.lista_id, schema);
      if (!contacts || contacts.length === 0) {
        console.log(`Nenhum contato na lista ${campaing.lista_id}`);
        return;
      }
    } else if (tagsDoDisparo.length > 0) {
      contacts = await getContatosPorTags(campaing.id, schema);
      if (!contacts || contacts.length === 0) {
        console.log(`Nenhum contato com as tags do disparo ${campaing.id}`);
        return;
      }
    } else {
      const kanban = await pool.query(
        `SELECT * FROM ${schema}.kanban_${sector} WHERE id=$1`, [campaing.kanban_stage]
      );
      if (kanban.rowCount === 0) {
        console.error(`Erro: Etapa Kanban com ID ${campaing.kanban_stage} não encontrada para o setor ${sector}.`);
        return;
      }

      contacts = await getContactsInKanbanStage(campaing.kanban_stage, schema);

      if (!contacts || contacts.length === 0) {
        console.log('Nenhum contato encontrado na etapa Kanban');
        return;
      }
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
    let primeiraFalha = null;
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
      
      // O delay é calculado por job. Math.round porque o intervalo dinâmico é
      // sorteado (Math.random) e produz fração de segundo — e scheduled_for é
      // BIGINT: o Postgres recusava "…749.3203" e derrubava o salvamento inteiro
      // do disparo com "invalid input syntax for type bigint".
      const messageDelay = accumulatedDelay;
      accumulatedDelay += Math.round(proximoIntervalo() * 1000);

      const dispatchId = uuidv4();
      try {
        // Registra o contato como pendente ANTES de enfileirar, para a tela de métricas
        // mostrar o total agendado mesmo antes de qualquer envio acontecer.
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
           chatToUse.id, message.id, Math.round(Date.now() + messageDelay)]
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
          delay: Math.round(messageDelay),
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
      } catch (error) {
        // Um contato problemático não pode abortar o agendamento dos outros: antes,
        // o erro estourava o laço no meio — quem já entrou na fila ficava, quem vinha
        // depois nunca era agendado, e a tela dizia que nada foi salvo.
        console.error(`Erro ao agendar disparo para ${contactPhone}:`, error.message);
        if (!primeiraFalha) primeiraFalha = error;
        await pool.query(
          `UPDATE ${schema}.campaing_dispatch SET status = 'falha', error = $1
            WHERE campaing_id = $2 AND contact_number = $3 AND status = 'pendente'`,
          [`Falha ao agendar: ${error.message}`, campaing.id, contactPhone]
        ).catch(() => {});
      }
    }
    // Falha total é erro de verdade: sem nenhum job na fila, o disparo não existe —
    // o motivo tem de subir até a tela em vez de fingir sucesso.
    if (jobCount === 0 && contacts.length > 0) {
      throw new Error(`Nenhum contato pôde ser agendado. Primeiro erro: ${primeiraFalha ? primeiraFalha.message : 'desconhecido'}`);
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
              l.nome AS lista_nome,
              COALESCE(tg.nomes, ARRAY[]::text[]) AS tag_nomes,
              COALESCE(lc.total, tg.total, cs.total, 0) AS previstos,
              COALESCE(d.total, 0) AS agendados,
              COALESCE(d.enviados, 0) AS enviados,
              COALESCE(d.falhas, 0) AS falhas,
              COALESCE(d.pendentes, 0) AS pendentes,
              CASE WHEN c.is_modelo THEN 'modelo' ELSE COALESCE(c.status, CASE
                WHEN COALESCE(d.total, 0) = 0 THEN 'nao agendado'
                WHEN d.pendentes > 0 AND d.enviados > 0 THEN 'em andamento'
                WHEN d.pendentes > 0 THEN 'agendado'
                ELSE 'concluido'
              END) END AS status
         FROM ${schema}.campaing c
         LEFT JOIN ${schema}.listas l ON l.id = c.lista_id
         LEFT JOIN (
           SELECT lista_id, COUNT(*)::int AS total
             FROM ${schema}.lista_contatos GROUP BY lista_id
         ) lc ON lc.lista_id = c.lista_id
         LEFT JOIN (
           SELECT stage, COUNT(*)::int AS total
             FROM ${schema}.contacts_stage GROUP BY stage
         ) cs ON cs.stage = c.kanban_stage
         LEFT JOIN (
           -- Nomes das tags e quantos contatos distintos elas alcancam hoje.
           SELECT ct.campaing_id,
                  array_agg(DISTINCT t.name) AS nomes,
                  COUNT(DISTINCT ch.contact_phone)::int AS total
             FROM ${schema}.campaing_tags ct
             JOIN ${schema}.tag t ON t.id = ct.tag_id
             LEFT JOIN ${schema}.chat_tag cht ON cht.tag_id = ct.tag_id
             LEFT JOIN ${schema}.chats ch ON ch.id = cht.chat_id
            GROUP BY ct.campaing_id
         ) tg ON tg.campaing_id = c.id
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
                  COUNT(*) FILTER (WHERE status = 'enviado')::int AS enviados,
                  COUNT(*) FILTER (WHERE status = 'falha')::int AS falhas
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
    const tags = await getCampaingTags(campaing_id, schema)
    return{
      result: result.rows[0],
      connections: connections,
      tags: tags
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

    // campaing_tags nao tem FK para campaing (a tabela e criada em outra ordem),
    // entao a limpeza e explicita — senao sobra lixo apontando para disparo morto.
    await pool.query(
      `DELETE FROM ${schema}.campaing_tags WHERE campaing_id=$1`, [campaing_id]
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

  // Alvo por lista: nem etapa nem contacts_stage entram na conta.
  if (campaing.lista_id) {
    const listaRes = await pool.query(
      `SELECT l.nome, COUNT(lc.contact_number)::int AS total
         FROM ${schema}.listas l
         LEFT JOIN ${schema}.lista_contatos lc ON lc.lista_id = l.id
        WHERE l.id = $1
        GROUP BY l.nome`,
      [campaing.lista_id]
    );
    const lista = listaRes.rows[0];
    return {
      campaing,
      canais: canais.rows,
      mensagens: mensagens.rows,
      etapa: null,
      lista: lista ? { id: campaing.lista_id, nome: lista.nome } : null,
      tags: [],
      total_contatos_alvo: lista?.total || 0,
    };
  }

  // Alvo por tag: quem manda sao as tags dos chats, nao a etapa do funil.
  const tags = await getCampaingTags(campaing_id, schema);
  if (tags.length > 0) {
    const alvoTags = await getContatosPorTags(campaing_id, schema);
    return {
      campaing,
      canais: canais.rows,
      mensagens: mensagens.rows,
      etapa: null,
      lista: null,
      tags,
      total_contatos_alvo: alvoTags.length,
    };
  }

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
    lista: null,
    tags: [],
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
  cancelCampaing,
  setCampaingTags,
  getCampaingTags,
  contarAlvo,
  estimarDuracaoMs,
  verificarAgendaCanal,
  executarModelo
};