const OpenAI = require('openai');
const dotenv = require('dotenv');
const { content } = require('googleapis/build/src/apis/content');
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY
})

const createChatCompletion = async (message) => {
    const run = await openai.beta.threads.createAndRun({
        assistant_id: 'asst_Lt7WO4INpumjlucxpMUAb3BG',
        thread: {
            messages: [
                { role: 'user', content: message }
            ]
        }
    });

    // Pega os ids corretos
    const thread_id = run.thread_id || (run.thread && run.thread.id);
    const run_id = run.id;

    if (!thread_id || !run_id) {
        console.error('thread_id ou run_id indefinido:', { thread_id, run_id, run });
        return;
    }

    // Espera o run terminar
    let status = run.status;
    let runResult = run;
    while (status !== 'completed' && status !== 'failed' && status !== 'cancelled') {
        await new Promise(res => setTimeout(res, 1000));
        runResult = await openai.beta.threads.runs.retrieve(run.id, {thread_id:run.thread_id});
        status = runResult.status;
    }

    // Busca as mensagens do thread
    const threadMessages = await openai.beta.threads.messages.list(thread_id);
    const resposta = threadMessages.data.reverse().find(m => m.role === 'assistant');
    if (resposta && resposta.content && resposta.content[0] && resposta.content[0].text) {
        const jsonString = resposta.content[0].text.value;
        const dados = JSON.parse(jsonString);
        console.log(dados)
        return dados.individual_analysis;
    } else {
        console.log('Nenhuma resposta encontrada.');
        return null;
    }

}


const getRun = async(thread)=>{
    const threadMessages = await openai.beta.threads.messages.list(
    thread
  );
  console.log(threadMessages);


}

// Gera resposta conversacional para o Agente de IA (piloto automático).
// systemPrompt: persona + contexto do negócio + base de conhecimento.
// history: [{ role: 'user'|'assistant', content }], userText: mensagem recebida.
const generateConversationalReply = async (systemPrompt, history = [], userText = '') => {
    try {
        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.slice(-10),
        ];
        if (userText) messages.push({ role: 'user', content: userText });

        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_AGENT_MODEL || 'gpt-4o-mini',
            messages,
            temperature: 0.6,
            max_tokens: 500,
        });
        return completion.choices?.[0]?.message?.content?.trim() || null;
    } catch (error) {
        console.error('Erro ao gerar resposta do agente:', error.message);
        return null;
    }
};

module.exports = {
    createChatCompletion,
    getRun,
    generateConversationalReply,
}