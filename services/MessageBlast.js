const { v4: uuidv4 } = require('uuid');
const pool = require("../db/queries");
const { sendTextMessage, sendMediaForBlast } = require('../requests/evolution');
const { searchConnById } = require('./ConnectionService');
const { Message } = require('../entities/Message');
const { getCurrentTimestamp } = require('./getCurrentTimestamp');
const { saveMessage } = require('./MessageService');
const { primeiroNome } = require('./MessageTemplates');

const replacePlaceholders = async (message, number, schema) => {
  try {
    const placeholders = message.match(/{{\s*[\w]+\s*}}/g);

    if (!placeholders) {
      return message;
    }

    let updatedMessage = message;

    for (const placeholder of placeholders) {
      const key = placeholder.replace(/{{\s*|\s*}}/g, '');

      // Token especial: {{primeiro_nome}} = só o primeiro nome, capitalizado
      // ("MARIA DE FATIMA" -> "Maria"). Lê de contact_name, não de uma coluna homônima.
      if (key === 'primeiro_nome') {
        const r = await pool.query(
          `SELECT contact_name FROM ${schema}.contacts WHERE number = $1`, [number]
        );
        const nome = r.rows[0] && r.rows[0].contact_name;
        updatedMessage = updatedMessage.replace(placeholder, nome ? primeiroNome(nome) : '');
        continue;
      }

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


// A Evolution nao lanca erro quando recusa o envio: devolve o corpo do erro com
// status 400/500. O compliance devolve { blocked: true }. E a falha de rede era
// engolida por um catch. Sem olhar o retorno, TODO envio virava "enviado" na tela
// de metricas — inclusive os que nunca chegaram em ninguem.
const confirmarEnvio = (resultado) => {
  if (resultado?.blocked) {
    return { ok: false, motivo: `Bloqueado pelo compliance: ${resultado.motivo || 'sem motivo informado'}` };
  }
  if (resultado?.key?.id) {
    return { ok: true, id: resultado.key.id };
  }
  const detalhe = resultado?.response?.message || resultado?.error || resultado?.message;
  const texto = detalhe
    ? (typeof detalhe === 'string' ? detalhe : JSON.stringify(detalhe))
    : 'a API nao devolveu confirmacao';
  return { ok: false, motivo: `WhatsApp nao confirmou o envio: ${texto}` };
};

const sendBlastMessage = async (instanceId, messageValue, number, chat_id, schema) => {
  try {
    const instance = await searchConnById(instanceId, schema);
    const processedMessage = await replacePlaceholders(messageValue, number, schema);

    const resultado = await sendTextMessage(instance.name, processedMessage, number, null, 'disparo');
    const confirmacao = confirmarEnvio(resultado);

    // So entra no historico do chat o que o WhatsApp confirmou: mensagem que nao
    // saiu aparecendo na conversa engana o atendente.
    if (confirmacao.ok) {
      const message = new Message(uuidv4(), processedMessage, true, chat_id, getCurrentTimestamp())
      await saveMessage(chat_id, message, schema)
    }

    return confirmacao;
  } catch (error) {
    console.error(`Erro ao enviar mensagem para ${number}:`, error.message);
    return { ok: false, motivo: error.message };
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

    const resultado = await sendMediaForBlast(instance.name, processedMessage, image, number)
    const confirmacao = confirmarEnvio(resultado);

    if (confirmacao.ok) {
      const message = new Message(uuidv4(), processedMessage, true, chat_id, getCurrentTimestamp())
      await saveMessage(chat_id, message, schema)
    }

    return confirmacao;
  } catch (error) {
    console.error(error)
    return { ok: false, motivo: error.message };
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