const { v4: uuidv4 } = require('uuid');
const pool = require("../db/queries");
const { sendTextMessage } = require('../requests/evolution');
const { searchConnById } = require('./ConnectionService');

const replacePlaceholders = async (message, number, schema) => {
  try {
    const placeholders = message.match(/{{\s*[\w]+\s*}}/g);

    if (!placeholders) {
      return message;
    }

    let updatedMessage = message;

    for (const placeholder of placeholders) {
      const key = placeholder.replace(/{{\s*|\s*}}/g, '');

      const result = await pool.query(
        `SELECT ${key} FROM ${schema}.contacts WHERE number = $1`,
        [number]
      );

      if (result.rows.length > 0 && result.rows[0][key]) {
        updatedMessage = updatedMessage.replace(placeholder, result.rows[0][key]);
      } else {
        console.warn(`Valor para o placeholder "${placeholder}" não encontrado.`);
        updatedMessage = updatedMessage.replace(placeholder, ''); // Substituir por vazio se não encontrado
      }
    }

    return updatedMessage;
  } catch (error) {
    console.error('Erro ao substituir placeholders:', error.message);
    throw error;
  }
};

const createMessageForBlast = async (messageValue, sector, campaingId, schema) => {
  try {
    const result = await pool.query(
      `INSERT INTO ${schema}.message_blast (id, value, sector, campaing_id) VALUES ($1, $2, $3, $4) RETURNING *`,
      [uuidv4(), messageValue, sector, campaingId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Erro ao criar mensagem:', error.message);
    throw error;
  }
};

const sendBlastMessage = async (instanceId,messageValue, number, schema) => {
  try {
    const instance = await searchConnById(instanceId, schema);
    const processedMessage = await replacePlaceholders(messageValue, number, schema);

    await sendTextMessage(instance.name, processedMessage, number);

    console.log(`Mensagem enviada para ${number}: ${processedMessage}`);
  } catch (error) {
    console.error(`Erro ao enviar mensagem para ${number}:`, error.message);
    throw error;
  }
};
const getAllBlastMessages = async(campaing_id, schema)=>{
  try {
    const result = await pool.query(
      `SELECT * FROM ${schema}.message_blast where campaing_id=$1`, [campaing_id]
    )
    return result.rows
  } catch (error) {
    console.error(error)
  }
}
module.exports = {
  createMessageForBlast,
  sendBlastMessage,
  getAllBlastMessages
};