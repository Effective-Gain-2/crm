const { scheduleCampaingBlast, getCampaings, getCampaingById, createCampaing, startCampaing, deleteCampaing, getCampaingDetails, getCampaingMetrics, cancelCampaing, setCampaingTags, contarAlvo, estimarDuracaoMs, verificarAgendaCanal, executarModelo } = require("../services/CampaingService");
const { createMessageForBlast, getAllBlastMessages, deleteAllBlastMessages } = require("../services/MessageBlast");
const { parseLocalDateTime } = require("../services/getCurrentTimestamp");

const startCampaingController = async (req, res) => {
  const { campaing_id } = req.body;
  const schema = req.body.schema;
  try {
    const result = await startCampaing(campaing_id, null, schema);
    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      erro: 'Não foi possível iniciar a campanha',
    });
  }
};

const getCampaingsController = async (req, res) => {
  const schema = req.params;
  try {
    const result = await getCampaings(schema.schema);
    res.status(201).json(result);
  } catch (error) {
    console.error('Erro ao buscar campanhas:', error);
    res.status(500).json({
      erro: 'Não foi possível buscar as campanhas',
    });
  }
};

const getCampaingByIdController = async (req, res) => {
  const { campaing_id, schema } = req.params;
  try {
    const result = await getCampaingById(campaing_id, schema);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
  }
};

const createCampaingController = async (req, res) => {
  const {campaing_id, name, sector, kanban_stage, connection_id, start_date, schema, mensagem, intervalo, new_stage, lista_id, tags, is_modelo } = req.body;
  console.log(new_stage, 'new_stage');
  if (!schema) {
    return res.status(400).json({ erro: 'Schema não informado!' });
  }

  const ehModelo = is_modelo === true;

  // Hora no passado era aceita em silêncio: o agendador cancelava os pendentes
  // antigos e retornava sem enfileirar nada — a tela dizia "salvo" e nada saía.
  // Recusar AQUI, antes de qualquer escrita, mantém o disparo anterior intacto.
  // Modelo não agenda, então dispensa data.
  const inicio = ehModelo ? null : parseLocalDateTime(start_date);
  if (!ehModelo) {
    if (!Number.isFinite(inicio)) {
      return res.status(400).json({
        erro: 'Não foi possível salvar o disparo',
        motivo: `Data/hora de início inválida: "${start_date}"`,
      });
    }
    const TOLERANCIA_MS = 60_000; // relógio do navegador vs. servidor
    if (inicio < Date.now() - TOLERANCIA_MS) {
      const quando = new Date(inicio).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      return res.status(400).json({
        erro: 'Não foi possível salvar o disparo',
        motivo: `A data/hora de início (${quando}) já passou. Escolha um horário futuro.`,
      });
    }

    // Agenda por canal: dois disparos ao mesmo tempo no mesmo numero de WhatsApp
    // e risco de banimento. Checa ANTES de qualquer escrita, com o intervalo medio
    // convertido do corpo (o banco ainda nao tem esta configuracao salva).
    try {
      const seg = (v, u) => (u === 'horas' ? v * 3600 : u === 'minutos' ? v * 60 : v);
      let medioSeg = 30;
      if (intervalo?.unidade) {
        medioSeg = seg(Number(intervalo.timer) || 30, intervalo.unidade);
      } else if (intervalo?.min && intervalo?.max) {
        medioSeg = (seg(Number(intervalo.min), intervalo.unidade_min) + seg(Number(intervalo.max), intervalo.unidade_max)) / 2;
      }
      const totalAlvo = await contarAlvo({ lista_id, kanban_stage, tags }, schema);
      const duracaoMs = Math.round(Math.max(1, totalAlvo) * medioSeg * 1000) + 60_000;
      const canais = Array.isArray(connection_id) ? connection_id : [connection_id];
      const agenda = await verificarAgendaCanal(canais, inicio, duracaoMs, schema, campaing_id || null);
      if (!agenda.livre) {
        const pior = agenda.conflitos.reduce((a, b) => (a.fim >= b.fim ? a : b));
        const quando = (ms) => new Date(ms).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        return res.status(409).json({
          erro: 'Canal ocupado nesse horário',
          motivo: `O canal "${pior.canal}" está ocupado pelo disparo "${pior.disparo}" até ${quando(pior.fim)}. Próximo horário livre: ${quando(agenda.proximoLivre)}.`,
          proximo_horario_livre: agenda.proximoLivre,
        });
      }
    } catch (agendaErr) {
      // A checagem de agenda protege, nao pode virar bloqueio: se ela mesma falhar
      // (ex.: tenant sem a tabela de dispatch), o salvamento segue e o erro fica no log.
      console.error('Falha na checagem de agenda do canal:', agendaErr.message);
    }
  }

  try {
    let campaing;

    if(campaing_id){
      campaing = await createCampaing(campaing_id, name, sector, kanban_stage, connection_id, start_date, schema, intervalo, lista_id || null, ehModelo);
      console.log('Campanha atualizada:', campaing);
    } else {
      campaing = await createCampaing(null, name, sector, kanban_stage, connection_id, start_date, schema, intervalo, lista_id || null, ehModelo);
      console.log('Campanha criada:', campaing);
    }

    // As tags precisam estar gravadas ANTES do agendamento: e delas que
    // scheduleCampaingBlast tira os contatos quando o alvo e por tag.
    await setCampaingTags(campaing.id, Array.isArray(tags) ? tags : [], schema);

    // Deletar todas as mensagens existentes da campanha antes de salvar as novas
    await deleteAllBlastMessages(campaing.id, schema);

    if (mensagem && Array.isArray(mensagem)) {
      for (const [index, item] of mensagem.entries()) {
        const texto = typeof item === 'object' ? item.text : item;
        const imagem = typeof item === 'object' ? item.image : null;
        
        await createMessageForBlast(null, texto, sector, campaing.id, schema, imagem);
      }
    }else if (mensagem) {
      const texto = typeof mensagem === 'object' ? mensagem.text : mensagem;
      const imagem = typeof mensagem === 'object' ? mensagem.image : null;
      await createMessageForBlast(null, texto, sector, campaing.id, schema, imagem);
    }

    await scheduleCampaingBlast(campaing, campaing.sector, schema, intervalo, new_stage);

    return res.status(201).json(campaing);
    
  } catch (error) {
    // O motivo real ficava so no log do servidor e a tela dizia "Erro ao salvar
    // disparo" — quem estava usando nao tinha como saber o que corrigir, e quem
    // dava suporte precisava do console do container para descobrir.
    console.error('Erro ao criar campanha:', error);
    res.status(500).json({
      erro: 'Não foi possível salvar o disparo',
      motivo: error.message || 'erro desconhecido',
    });
  }
};


const getAllBlastMessagesController = async(req, res)=>{
  try {
    const {campaing_id, schema} = req.params
    const result = await getAllBlastMessages(campaing_id, schema)
    res.status(200).json({
      result
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: 'Erro ao trazer mensagens do disparo'
    })
  }
}

const deleteCampaingController = async(req, res)=>{
  try {
    const {campaing_id, schema} = req.params
    const result = await deleteCampaing(campaing_id, schema)
    res.status(200).json({
      success: true,
      message: 'Campanha deletada com sucesso',
      result
    })
  } catch (error) {
    console.error('Erro ao deletar campanha:', error)
    res.status(500).json({
      error: 'Erro ao deletar campanha'
    })
  }
}

const getCampaingDetailsController = async(req, res)=>{
  try {
    const {campaing_id} = req.params
    const schema = req.auth?.schema || req.params.schema
    const result = await getCampaingDetails(campaing_id, schema)
    if (!result) {
      return res.status(404).json({ error: 'Disparo nao encontrado' })
    }
    res.status(200).json(result)
  } catch (error) {
    console.error('Erro ao buscar detalhes do disparo:', error)
    res.status(500).json({
      error: 'Erro ao buscar detalhes do disparo'
    })
  }
}

const getCampaingMetricsController = async(req, res)=>{
  try {
    const {campaing_id} = req.params
    const schema = req.auth?.schema || req.params.schema
    const result = await getCampaingMetrics(campaing_id, schema)
    res.status(200).json(result)
  } catch (error) {
    console.error('Erro ao buscar metricas do disparo:', error)
    res.status(500).json({
      error: 'Erro ao buscar metricas do disparo'
    })
  }
}

const cancelCampaingController = async(req, res)=>{
  try {
    const {campaing_id} = req.params
    const schema = req.auth?.schema || req.params.schema
    const result = await cancelCampaing(campaing_id, schema)
    res.status(200).json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error('Erro ao cancelar disparo:', error)
    res.status(500).json({
      error: 'Erro ao cancelar disparo'
    })
  }
}

// Usa um modelo pronto contra uma lista: o servico clona o modelo numa execucao,
// valida a agenda dos canais e agenda. Conflito de agenda vira 409 com o proximo
// horario livre, para a tela oferecer o ajuste com um clique.
const executarModeloController = async (req, res) => {
  const { modelo_id, lista_id, start_date, schema } = req.body;
  if (!schema) {
    return res.status(400).json({ erro: 'Schema não informado!' });
  }
  if (!modelo_id || !lista_id || !start_date) {
    return res.status(400).json({
      erro: 'Não foi possível agendar o disparo',
      motivo: 'Informe o modelo, a lista e a data/hora de início.',
    });
  }
  try {
    const execucao = await executarModelo(modelo_id, lista_id, start_date, schema);
    return res.status(201).json(execucao);
  } catch (error) {
    console.error('Erro ao executar modelo de disparo:', error);
    if (error.codigo === 'conflito_agenda') {
      return res.status(409).json({
        erro: 'Canal ocupado nesse horário',
        motivo: error.message,
        proximo_horario_livre: error.proximoLivre,
      });
    }
    return res.status(400).json({
      erro: 'Não foi possível agendar o disparo',
      motivo: error.message || 'erro desconhecido',
    });
  }
};

module.exports = {
  startCampaingController,
  getCampaingsController,
  getCampaingByIdController,
  createCampaingController,
  getAllBlastMessagesController,
  deleteCampaingController,
  getCampaingDetailsController,
  getCampaingMetricsController,
  cancelCampaingController,
  executarModeloController
};