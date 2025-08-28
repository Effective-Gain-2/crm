const OpenAI = require('openai');
const dotenv = require('dotenv');
const { content } = require('googleapis/build/src/apis/content');
const pool = require('../db/queries');
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

    const thread_id = run.thread_id || (run.thread && run.thread.id);
    const run_id = run.id;

    if (!thread_id || !run_id) {
        console.error('thread_id ou run_id indefinido:', { thread_id, run_id, run });
        return;
    }

    let status = run.status;
    let runResult = run;
    while (status !== 'completed' && status !== 'failed' && status !== 'cancelled') {
        await new Promise(res => setTimeout(res, 1000));
        runResult = await openai.beta.threads.runs.retrieve(run.id, {thread_id:run.thread_id});
        status = runResult.status;
    }

    const threadMessages = await openai.beta.threads.messages.list(thread_id);
    const resposta = threadMessages.data.reverse().find(m => m.role === 'assistant');
    if (resposta && resposta.content && resposta.content[0] && resposta.content[0].text) {
        const jsonString = resposta.content[0].text.value;
        const dados = JSON.parse(jsonString);
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
  for(message of threadMessages.data){
      console.log(message.content)
  
}
}

const createThread = async (message, assistant_id, chat_id, schema) => {
    const response = await openai.beta.threads.createAndRun({
        assistant_id,
        thread: {
            messages: [
                { role: 'user', content: message }
            ]
        }
    });
    await pool.query(`UPDATE ${schema}.chats SET thread_id=$1 WHERE id=$2`, [response.thread_id, chat_id]);
    return response;
}
const messageAnAssistant = async (message, thread_id) => {
    const response = await openai.beta.threads.messages.create(thread_id,{
        role: 'user',
        content: message
    })
    console.log(response.content)
}

const runOpenAi = async (thread_id) => {
    const run = await openai.beta.threads.runs.create(thread_id,{assistant_id: 'asst_Lt7WO4INpumjlucxpMUAb3BG'});
    console.log(run);
}
const getAssistantReply = async (thread_id, userMessage) => {
  await openai.beta.threads.messages.create(thread_id, {
    role: 'user',
    content: userMessage
  });

  const run = await openai.beta.threads.runs.create(thread_id, { assistant_id: 'asst_baus9UgM0ByVi3v2fICzDsu9' });

  let status = run.status;
  let runResult = run;
  while (status !== 'completed' && status !== 'failed' && status !== 'cancelled') {
    await new Promise(res => setTimeout(res, 1000));
    runResult = await openai.beta.threads.runs.retrieve(run.id, { thread_id });
    status = runResult.status;
  }

  const threadMessages = await openai.beta.threads.messages.list(thread_id);
  const assistantMsg = threadMessages.data.find(m => m.role === 'assistant');

  // Verifica se há chamada de função
  if (assistantMsg && assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
    for (const toolCall of assistantMsg.tool_calls) {
      if (toolCall.function) {
        // Aqui você pode executar a função correspondente no seu backend
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        // Exemplo: chamar uma função local
        if (functionName === '') {
          return await suaFuncao(functionArgs);
        }
        // Retorne ou trate conforme necessário
        return { functionName, functionArgs };
      }
    }
  }

  // Se não for function call, retorna resposta normal
  if (assistantMsg && assistantMsg.content && assistantMsg.content[0] && assistantMsg.content[0].text) {
    return assistantMsg.content[0].text.value;
  } else {
    return null;
  }
};
module.exports = {
    createChatCompletion,
    getRun,
    createThread,
    messageAnAssistant,
    getAssistantReply,
    runOpenAi
}