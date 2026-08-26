const { scheduleCampaingBlast, getCampaings, getCampaingById, createCampaing, startCampaing, deleteCampaing, getCampaingDetails, getCampaingMetrics, cancelCampaing, setCampaingTags } = require("../services/CampaingService");
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
  const {campaing_id, name, sector, kanban_stage, connection_id, start_date, schema, mensagem, intervalo, new_stage, lista_id, tags } = req.body;
  console.log(new_stage, 'new_stage');
  if (!schema) {
    return res.status(400).json({ erro: 'Schema não informado!' });
  }

  // Hora no passado era aceita em silêncio: o agendador cancelava os pendentes
  // antigos e retornava sem enfileirar nada — a tela dizia "salvo" e nada saía.
  // Recusar AQUI, antes de qualquer escrita, mantém o disparo anterior intacto.
  const inicio = parseLocalDateTime(start_date);
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

  try {
    let campaing;

    if(campaing_id){
      campaing = await createCampaing(campaing_id, name, sector, kanban_stage, connection_id, start_date, schema, intervalo, lista_id || null);
      console.log('Campanha atualizada:', campaing);
    } else {
      campaing = await createCampaing(null, name, sector, kanban_stage, connection_id, start_date, schema, intervalo, lista_id || null);
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

module.exports = {
  startCampaingController,
  getCampaingsController,
  getCampaingByIdController,
  createCampaingController,
  getAllBlastMessagesController,
  deleteCampaingController,
  getCampaingDetailsController,
  getCampaingMetricsController,
  cancelCampaingController
};