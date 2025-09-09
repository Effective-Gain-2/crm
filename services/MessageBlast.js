const { v4: uuidv4 } = require('uuid');
const pool = require("../db/queries");
const { sendTextMessage, sendMediaForBlast } = require('../requests/evolution');
const { searchConnById } = require('./ConnectionService');
const { Message } = require('../entities/Message');
const { getCurrentTimestamp } = require('./getCurrentTimestamp');
const { saveMessage } = require('./MessageService');

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

const createMessageForBlast = async (id, messageValue, sector, campaingId, schema, image = null) => {
  try {
    if (id) {
      // Se tem ID, atualiza
      const result = await pool.query(
        `UPDATE ${schema}.message_blast
         SET value = $1, sector = $2, image = $3
         WHERE id = $4 AND campaing_id = $5
         RETURNING *`,
        [messageValue, sector, image, id, campaingId]
      );
      return result.rows[0];
    } else {
      // Senão, insere nova mensagem
      const result = await pool.query(
        `INSERT INTO ${schema}.message_blast (id, value, sector, campaing_id, image)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [uuidv4(), messageValue, sector, campaingId, image]
      );
      return result.rows[0];
    }
  } catch (error) {
    console.error('Erro ao salvar mensagem:', error.message);
    throw error;
  }
};


const sendBlastMessage = async (instanceId, messageValue, number, chat_id, schema) => {
  try {
    const instance = await searchConnById(instanceId, schema);
    const processedMessage = await replacePlaceholders(messageValue, number, schema);

    const message = new Message(uuidv4(), processedMessage, true, chat_id, getCurrentTimestamp())
    await saveMessage(chat_id, message, schema)

    await sendTextMessage(instance.name, processedMessage, number);

  } catch (error) {
    console.error(`Erro ao enviar mensagem para ${number}:`, error.message);
    throw error;
  }
};

// const deleteBlastMessages = async (message_id, campaing_id, schema) => {
//   const messages = await pool.query(
//     `SELECT * FROM ${schema}.message_blast where campaing_id = $1`,[campaing_id]
//   )
//   for(message of messages){
//     if (message.id === message_id){
//     }else{
//       await pool.query(
//         `DELETE FROM ${schema}.message_blast where campaing_id=campaing_id and `
//       )
//     }
//   }
// }

const sendMediaBlastMessage = async (instanceId, text, number, chat_id, image, schema) => {
  try {
    const instance = await searchConnById(instanceId, schema)
    const processedMessage = await replacePlaceholders(text, number, schema)

    const message = new Message(uuidv4(), processedMessage, true, chat_id, getCurrentTimestamp())
    await saveMessage(chat_id, message, schema)
    
    await sendMediaForBlast(instance.name, processedMessage, image, number)
  } catch (error) {
    console.error(error)
  }
}
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

const deleteAllBlastMessages = async(campaing_id, schema)=>{
  try {
    const result = await pool.query(
      `DELETE FROM ${schema}.message_blast WHERE campaing_id = $1`,
      [campaing_id]
    )
    return result.rowCount
  } catch (error) {
    console.error('Erro ao deletar mensagens da campanha:', error)
    throw error
  }
}
module.exports = {
  createMessageForBlast,
  sendBlastMessage,
  getAllBlastMessages,
  sendMediaBlastMessage,
  deleteAllBlastMessages
};