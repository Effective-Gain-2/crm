const pool = require("../db/queries")
const { v4: uuid4 } = require('uuid');
const { createChatCompletion } = require("./OpenAi");
const { getMessages, getChatData } = require("../utils/getMessages");


const getGptResponse = async (chat_id, schema, status) => {
    const messages = await getMessages(chat_id, schema);
    
    if (messages.length === 0) {
        return null;
    }
    
    const formattedMessages = messages.map(m => {
        const sender = m.from_me ? 'Atendente' : 'Cliente';
        return `${sender}: ${m.body}`;
    }).join('\n');
    
    const gpt_response = await createChatCompletion(formattedMessages);
    
    if (!gpt_response) {
        return null;
    }
    
    const report = await createReport(chat_id, gpt_response, status, schema)
    return report;
}

const createReport = async(chat_id, gpt_response, status, schema)=>{
    const chatData = await getChatData(chat_id, schema);

    const report = await pool.query(`INSERT INTO ${schema}.reports(id, chat_id, user_id, queue_id, categoria, resumo, assertividade, status, proxima_etapa) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`, 
        [uuid4(), chatData.chat.id, chatData.chat.assigned_user, chatData.chat.queue_id, gpt_response.categoria, gpt_response.resumo_interacao || 'teste', gpt_response.assertividade_atendimento, status, gpt_response.proxima_etapa_recomendada]
    );
    return report.rows[0];
}

const getReports = async(schema, user_id, user_role)=>{
    if(user_role === 'user'){
        const result = await pool.query(`SELECT * FROM ${schema}.reports WHERE user_id=$1`, [user_id]);

        return result.rows;
    }else{
        const result = await pool.query(`SELECT * FROM ${schema}.reports`);
        return result.rows;
    }
}

module.exports={
    createReport,
    getGptResponse,
    getReports
}