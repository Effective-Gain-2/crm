const { scheduleCampaingBlast, getCampaings, getCampaingById, createCampaing } = require("../services/CampaingService");
const { createMessageForBlast, getAllBlastMessages } = require("../services/MessageBlast");

const startCampaingController = async (req, res) => {
  const { campaing_id, timer } = req.body;
  const schema = req.body.schema;
  try {
    const result = await startCampaingRedis(campaing_id, timer, schema);
    res.status(201).json(result);
  } catch (error) {
    console.log(error);
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
    const result = await getCampaingById(campaing_id, schema.schema);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
  }
};

const createCampaingController = async (req, res) => {
  const {campaing_id, name, sector, kanban_stage, connection_id, start_date, schema, mensagem } = req.body;
  try {
    if(campaing_id){
      const campaing = await createCampaing(campaing_id, name, sector, kanban_stage, connection_id, start_date, schema);
      return campaing
    }
      const campaing = await createCampaing(name, sector, kanban_stage, connection_id, start_date, schema);

    if (mensagem && Array.isArray(mensagem)) {
      for (const msg of mensagem) {
        await createMessageForBlast(msg, sector, campaing.id, schema);
      }
    } else if (mensagem) {
      await createMessageForBlast(msg, sector, campaing.id, schema);
    }

    await scheduleCampaingBlast(campaing, schema);

    res.status(201).json(campaing);
  } catch (error) {
    console.error('Erro ao criar campanha:', error);
    res.status(500).json({
      erro: 'Não foi possível criar a campanha',
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

module.exports = {
  startCampaingController,
  getCampaingsController,
  getCampaingByIdController,
  createCampaingController,
  getAllBlastMessagesController
};