const OpenAI = require('openai');
const dotenv = require('dotenv');
const { content } = require('googleapis/build/src/apis/content');
const pool = require('../db/queries');
const { sendTextMessage } = require('../requests/evolution');
const { createReceita } = require('./ReceitaService');
const { insertExpenseItens } = require('./ExpensesService');
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

const cancelRun = async(thread_id) => {
    const runs = await openai.beta.threads.runs.list(thread_id)
    for(const run of runs.data){
        if(run.status!=='completed' && run.status!=='expired' && run.status!=='cancelled'){
            console.log('Cancelando run', run)
            await openai.beta.threads.runs.cancel(run.id, {thread_id: thread_id})
        }
    }
}
const listRuns = async (thread_id) => {
    const runs = await openai.beta.threads.runs.list(thread_id);
    console.log('Runs:', runs);
    return runs.data;
}
const getAssistantReply = async (thread_id, userMessage, assistant_id, schema) => {
    if (!thread_id) {
      console.error('thread_id é undefined ou null');
      return null;
    }
    
  await openai.beta.threads.messages.create(thread_id, {
    role: 'user',
    content: userMessage
  });

  const run = await openai.beta.threads.runs.create(thread_id, { assistant_id: assistant_id });

  let status = run.status;
  let runResult = run;
  
  while (status !== 'completed' && status !== 'failed' && status !== 'cancelled') {
    await new Promise(res => setTimeout(res, 1000));
    runResult = await openai.beta.threads.runs.retrieve(run.id, { thread_id });
    status = runResult.status;
    
    // Se o run requer ação (tool calls), processe-os
    if (status === 'requires_action' && runResult.required_action) {
      const toolCalls = runResult.required_action.submit_tool_outputs.tool_calls;
      const toolOutputs = [];
      
      for (const toolCall of toolCalls) {
        if (toolCall.function) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          
          // Processar as funções específicas
          let output = '';
          if (functionName === 'job_finished') {
              output = 'Pedido finalizado com sucesso!';
              const receita = await createReceita(`Pedido de ${functionArgs.cliente}`, null, null, functionArgs.valor_total, new Date().toISOString(), functionArgs.metodo_pagamento, 'pago', schema);
              for(const item of functionArgs.pedido){
                await insertExpenseItens(receita.id, item.item, 'descrição', item.quantidade, item.preco_unitario, false, schema);
              }
          } else if (functionName === 'passar_atendente') {
            output = 'Transferindo para atendente humano...';
          }
          
          toolOutputs.push({
            tool_call_id: toolCall.id,
            output: output
          });
        }
      }
      
             // Submeter os outputs das funções
       if (toolOutputs.length > 0) {
       }
    }
  }

  // Buscar a mensagem final do assistente
  const threadMessages = await openai.beta.threads.messages.list(thread_id);
  const assistantMsg = threadMessages.data.find(m => m.role === 'assistant');
  
  // Verificar se há tool calls na mensagem final
  if (assistantMsg && assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
    for (const toolCall of assistantMsg.tool_calls) {
      if (toolCall.function) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        return { functionName, functionArgs };
      }
    }
  }

  // Se não for function call, retorna resposta normal
  if (assistantMsg && assistantMsg.content && assistantMsg.content.length > 0) {
    const textContent = assistantMsg.content.find(content => content.type === 'text');
    if (textContent && textContent.text) {
      return textContent.text.value;
    }
  }
  
  console.log('Nenhuma resposta válida encontrada');
  return null;
};

const createAssistant = async (name, instructions, model) => {
    const result = await openai.beta.assistants.create({
        instructions: instructions,
        name: name,
        tools:[{type:'code_interpreter'}],
        model: model
    })
    return result;
}
const updateAssistant = async (assistant_id, name, instructions, model) => {
    await openai.beta.assistants.update(assistant_id, {
        instructions: instructions,
        name: name,
        tools:[{type:'code_interpreter'}],
        model: model
    })
}
const deleteAssistant = async (assistant_id) => {
    await openai.beta.assistants.delete(assistant_id)
}
module.exports = {
    createChatCompletion,
    getRun,
    createThread,
    messageAnAssistant,
    getAssistantReply,
    runOpenAi,
    listRuns,
    cancelRun,
    createAssistant,
    updateAssistant,
    deleteAssistant

}