const pool = require('../db/queries');
const { v4: uuidv4 } = require('uuid');
const { getChatsInKanbanStage } = require('./KanbanService');
const { sendTextMessage } = require('../requests/evolution');
const { sendBlastMessage } = require('./MessageBlast');
const createRedisConnection = require('../config/Redis');
const { Queue, Worker } = require('bullmq');

const bullConn = createRedisConnection();
const blastQueue = new Queue("Campanha", { connection: bullConn });

new Worker("Campanha", async (job) => {
  try {
    await sendBlastMessage(
      job.data.instance,
      job.data.message,
      job.data.number,
      job.data.schema
    );
    await sleep(30000);
    console.log('Mensagem enviada com sucesso!');
  } catch (err) {
    console.error('Erro ao enviar mensagem:', err.message);
  }
}, { connection: bullConn });

const createCampaing = async (campaing_id, campName, sector, kanbanStage, connectionId, startDate, schema) => {
  try {
    const unixStartDate = new Date(startDate).getTime();

    let result;
    let campaing;

    if (campaing_id) {
      result = await pool.query(
        `UPDATE ${schema}.campaing 
         SET campaing_name=$1, sector=$2, kanban_stage=$3, connection_id=$4, start_date=$5
         WHERE id=$6 RETURNING *`,
        [campName, sector, kanbanStage, connectionId, unixStartDate, campaing_id]
      );
      campaing = result.rows[0];
    } else {
      result = await pool.query(
        `INSERT INTO ${schema}.campaing (id, campaing_name, sector, kanban_stage, connection_id, start_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [uuidv4(), campName, sector, kanban_id.rows[0].id, connectionId, unixStartDate]
      );
      campaing = result.rows[0];
    }

    await scheduleCampaingBlast(campaing, schema);

    return campaing;
  } catch (error) {
    console.error('Erro ao criar/atualizar campanha:', error.message);
    throw error;
  }
};

const scheduleCampaingBlast = async (campaing, schema) => {
  try {
    const startDate = Number(campaing.start_date);
    const now = Date.now();

    if (startDate < now) {
      return;
    }

    const kanban = await pool.query(
      `SELECT * FROM ${schema}.kanban_vendas WHERE id=$1`, [campaing.kanban_stage]
    );
    const chatIds = await getChatsInKanbanStage(kanban.rows[0].etapa, schema);

    const messages = await pool.query(
      `SELECT * FROM ${schema}.message_blast WHERE campaing_id=$1`, [campaing.id]
    );
    if (messages.rowCount === 0) {
      console.error('Nenhuma mensagem encontrada para a campanha.');
      return;
    }
    const messageList = messages.rows;
    let messageIndex = 0;

    const baseDelay = Math.max(0, startDate - now);
    const timer = 30; 

    for (let i = 0; i < chatIds.length; i++) {
      const instanceId = await pool.query(
        `SELECT * FROM ${schema}.chats WHERE id=$1`, [chatIds[i].id]
      );
      const instance = await pool.query(
        `SELECT * FROM ${schema}.connections WHERE id=$1`, [campaing.connection_id]
      );
      const message = messageList[messageIndex];
      messageIndex = (messageIndex + 1) % messageList.length;

      const messageDelay = baseDelay + (i * (timer * 1000));

      await blastQueue.add('sendMessage', {
        instance: instance.rows[0].name,
        number: instanceId.rows[0].contact_phone,
        message: message.value,
        schema: schema
      }, { delay: messageDelay });
    }
  } catch (error) {
    console.error('Erro ao agendar disparo da campanha:', error);
  }
};

const startCampaing = async (campaing_id, timer, schema) => {
  try {
    const campaing = await pool.query(
      `SELECT * FROM ${schema}.campaing WHERE id=$1`, [campaing_id]
    );
    const kanban = await pool.query(
      `SELECT * FROM ${schema}.kanban_${campaing.rows[0].sector} WHERE id=$1`, [campaing.rows[0].kanban_stage]
    );
    const chatId = await getChatsInKanbanStage(kanban.rows[0].etapa,campaing.rows[0].sector, schema);
    const messages = await pool.query(
      `SELECT * FROM ${schema}.message_blast WHERE campaing_id=$1`, [campaing_id]
    );
    if (messages.rowCount === 0) {
      console.error('Nenhuma mensagem encontrada para a campanha.');
      return;
    }
    const messageList = messages.rows;
    let messageIndex = 0;
    for (let i = 0; i < chatId.length; i++) {
      const instanceId = await pool.query(
        `SELECT * FROM ${schema}.chats WHERE chat_id=$1`, [chatId[i].chat_id]
      );
      const instance = await pool.query(
        `SELECT * FROM ${schema}.connections WHERE id=$1`, [instanceId.rows[0].connection_id]
      );
      const message = messageList[messageIndex];
      messageIndex = (messageIndex + 1) % messageList.length;
      await sendBlastMessage(
        instance.rows[0].name,
        message.value,
        instanceId.rows[0].contact_phone,
        schema
      );
      await sleep(timer * 1000);
    }
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
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao buscar campanha por ID:', error.message);
    throw error;
  }
};

const deleteCampaing = async(campaing_id, schema)=>{

}


module.exports = {
  createCampaing,
  startCampaing,
  getCampaings,
  getCampaingById,
  scheduleCampaingBlast
};