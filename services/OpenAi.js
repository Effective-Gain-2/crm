const OpenAI = require('openai');
const dotenv = require('dotenv');
const { content } = require('googleapis/build/src/apis/content');
const pool = require('../db/queries');
const { sendTextMessage } = require('../requests/evolution');
const { createReceita } = require('./ReceitaService');
const { insertExpenseItens } = require('./ExpensesService');
const { disableBott } = require('../utils/DisableBot');
dotenv.config();

let openai = null;

const getOpenAIClient = () => {
  if (!openai && process.env.OPENAI_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_KEY
    });
  }
  return openai;
}

const createChatCompletion = async (message) => {
  const client = getOpenAIClient();
  if (!client) {
    console.error('OpenAI não configurado. Variável OPENAI_KEY não encontrada.');
    return null;
  }
  const run = await client.beta.threads.createAndRun({
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
    runResult = await client.beta.threads.runs.retrieve(run.id, { thread_id: run.thread_id });
    status = runResult.status;
  }

  const threadMessages = await client.beta.threads.messages.list(thread_id);
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


const getRun = async (thread) => {
  const client = getOpenAIClient();
  if (!client) return null;
  const threadMessages = await client.beta.threads.messages.list(
    thread
  );
  for (message of threadMessages.data) {

  }
}

// Cria uma thread vazia e persiste o thread_id no chat. NÃO envia
// mensagem nem inicia run — quem faz o polling + handling de
// function-calls é getAssistantReply, chamado em seguida pelo worker.
// Assim a primeira mensagem do cliente passa pelo mesmo caminho das
// subsequentes, evitando bug onde createAndRun retornava o objeto run
// e o worker o ignorava (não era string).
const createThread = async (assistant_id, chat_id, schema) => {
  const client = getOpenAIClient();
  if (!client) {
    console.error('OpenAI não configurado. Variável OPENAI_KEY não encontrada.');
    return null;
  }
  const thread = await client.beta.threads.create();
  if (chat_id) {
    await pool.query(`UPDATE ${schema}.chats SET thread_id=$1 WHERE id=$2`, [thread.id, chat_id]);
  }
  return thread.id;
}

const getAssistantMessageWithoutThreadId = async (message, assistant_id) => {
  const response = await openai.beta.threads.createAndRun({
    assistant_id,
    thread: {
      messages: [
        { role: 'user', content: message }
      ]
    }
  });

  // Aguarda o run ser concluído
  let status = response.status;
  let runResult = response;
  while (status !== 'completed' && status !== 'failed' && status !== 'cancelled') {
    await new Promise(res => setTimeout(res, 1000));
    runResult = await openai.beta.threads.runs.retrieve(response.id, { thread_id: response.thread_id });
    status = runResult.status;
  }

  const threadMessages = await openai.beta.threads.messages.list(response.thread_id);
  const assistantMsg = threadMessages.data.find(m => m.role === 'assistant');

  if (assistantMsg && assistantMsg.content && assistantMsg.content.length > 0) {
    const textContent = assistantMsg.content.find(content => content.type === 'text');
    if (textContent && textContent.text) {
      return textContent.text.value;
    }
  }
  return null;
}
const messageAnAssistant = async (message, thread_id) => {
  const client = getOpenAIClient();
  if (!client) {
    console.error('OpenAI não configurado. Variável OPENAI_KEY não encontrada.');
    return null;
  }
  const response = await client.beta.threads.messages.create(thread_id, {
    role: 'user',
    content: message
  })
}

const runOpenAi = async (thread_id) => {
  const client = getOpenAIClient();
  if (!client) {
    console.error('OpenAI não configurado. Variável OPENAI_KEY não encontrada.');
    return null;
  }
  const run = await client.beta.threads.runs.create(thread_id, { assistant_id: 'asst_Lt7WO4INpumjlucxpMUAb3BG' });
}

const cancelRun = async (thread_id) => {
  const client = getOpenAIClient();
  if (!client) return null;
  const runs = await client.beta.threads.runs.list(thread_id)
  for (const run of runs.data) {
    if (run.status === 'in_progress' || run.status === 'requires_action') {
      await client.beta.threads.runs.cancel(run.id, { thread_id: thread_id })
    }
  }
}
const listRuns = async (thread_id) => {
  const client = getOpenAIClient();
  if (!client) return null;
  const runs = await client.beta.threads.runs.list(thread_id);
  return runs.data;
}
const getAssistantReply = async (thread_id, userMessage, assistant_id, chat_id, schema) => {
  const client = getOpenAIClient();
  if (!client) {
    console.error('OpenAI não configurado. Variável OPENAI_KEY não encontrada.');
    return null;
  }
  if (!thread_id) {
    console.error('thread_id é undefined ou null');
    return null;
  }

  await cancelRun(thread_id)

  await client.beta.threads.messages.create(thread_id, {
    role: 'user',
    content: userMessage
  });

  const run = await client.beta.threads.runs.create(thread_id, { assistant_id: assistant_id });

  let status = run.status;
  let runResult = run;

  while (status !== 'completed' && status !== 'failed' && status !== 'cancelled') {
    await new Promise(res => setTimeout(res, 1000));
    runResult = await client.beta.threads.runs.retrieve(run.id, { thread_id });
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
            const receita = await createReceita(`Pedido de ${functionArgs.cliente}`, null, null, functionArgs.valor, new Date().toISOString(), functionArgs.metodo_pagamento, 'pago', schema);
            for (const item of functionArgs.pedido) {
              await insertExpenseItens(receita.id, item.item, 'descrição', item.quantidade, item.preco_unitario, false, schema);
            }
            return
          } else if (functionName === 'passar_atendente') {
            await disableBott(chat_id, schema)
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
        await client.beta.threads.runs.submitToolOutputs(thread_id, runResult.id, {
          tool_outputs: toolOutputs
        });
      }
    }
  }

  // Buscar a mensagem final do assistente
  const threadMessages = await client.beta.threads.messages.list(thread_id);
  const assistantMsg = threadMessages.data.find(m => m.role === 'assistant');

  // Verificar se há tool calls na mensagem final (apenas para retornar os dados, sem executar novamente)
  if (assistantMsg && assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
    for (const toolCall of assistantMsg.tool_calls) {
      if (toolCall.function) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        // Retorna apenas os dados da função, sem executar novamente
        return { functionName, functionArgs, executed: true };
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
  const client = getOpenAIClient();
  if (!client) {
    console.error('OpenAI não configurado. Variável OPENAI_KEY não encontrada.');
    return null;
  }
  const result = await client.beta.assistants.create({
    instructions: instructions,
    name: name,
    tools: [{ type: 'code_interpreter' }],
    model: model
  })
  return result;
}
const updateAssistant = async (assistant_id, name, instructions, model, functions) => {
  const client = getOpenAIClient();
  if (!client) {
    console.error('OpenAI não configurado. Variável OPENAI_KEY não encontrada.');
    return null;
  }

  // Caller passa tools no formato { type: 'function', function: {...} }.
  // Aceita esse formato OU array de funcoes cruas — normaliza.
  const tools = Array.isArray(functions)
    ? functions
        .map((f) => {
          if (!f) return null;
          if (f.type === 'function' && f.function) return f;
          if (f.name) return { type: 'function', function: f };
          return null;
        })
        .filter(Boolean)
    : [];

  // Timeout de 25s — em prod nginx geralmente derruba em 60s e devolve 502;
  // se a API OpenAI travar, prefereimos estourar aqui e tratar no controller
  // do que deixar o nginx matar a conexao.
  const updatePromise = client.beta.assistants.update(assistant_id, {
    instructions,
    name,
    tools,
    model,
  });
  const timeoutMs = 25000;
  const response = await Promise.race([
    updatePromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('OpenAI assistants.update timeout')), timeoutMs)),
  ]);
  return response;
}
const deleteAssistant = async (assistant_id) => {
  const client = getOpenAIClient();
  if (!client) {
    console.error('OpenAI não configurado. Variável OPENAI_KEY não encontrada.');
    return null;
  }
  await client.beta.assistants.delete(assistant_id)
}

const getSummary = async (message) => {
  const client = getOpenAIClient();
  if (!client) {
    console.error('OpenAI não configurado. Variável OPENAI_KEY não encontrada.');
    return null;
  }
  const run = await client.beta.threads.createAndRun({
    assistant_id: 'asst_nkgN6f8smJsBJxZyAAWu5bEe',
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
    runResult = await client.beta.threads.runs.retrieve(run.id, { thread_id: run.thread_id });
    status = runResult.status;
  }

  const threadMessages = await client.beta.threads.messages.list(thread_id);
  const resposta = threadMessages.data.reverse().find(m => m.role === 'assistant');
  if (resposta && resposta.content && resposta.content[0] && resposta.content[0].text) {
    const dados = resposta.content[0].text.value;
    return dados
  } else {
    console.log('Nenhuma resposta encontrada.');
    return null;
  }
}
const speechToText = async (file) => {
  const client = getOpenAIClient();
  if (!client) {
    console.error('OpenAI não configurado. Variável OPENAI_KEY não encontrada.');
    return null;
  }

  const response = await client.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'pt'
  });

  return response.text;
};

// Gera um resumo + sugestao de proxima etapa a partir das mensagens da
// conversa. Usa chat.completions diretamente (mais barato/rapido que
// assistente com thread) e pede resposta JSON. Devolve { summary, next_step }
// ou null em caso de falha.
const generateLeadSummary = async (messages, contactName) => {
  const client = getOpenAIClient();
  if (!client) return null;
  if (!Array.isArray(messages) || messages.length === 0) return null;

  const transcript = messages
    .map((m) => `${m.from_me ? 'Atendente' : (contactName || 'Cliente')}: ${m.body || '[midia/sem texto]'}`)
    .join('\n');

  const prompt = `Voce e um assistente que analisa conversas comerciais via WhatsApp e gera um resumo objetivo para o time comercial.

Receba a transcricao abaixo e responda APENAS com um JSON valido contendo dois campos:
- "summary": resumo de 2 a 4 frases sobre o que o cliente quer, dores e contexto relevante.
- "next_step": uma sugestao clara e acionavel do proximo passo que o atendente deve tomar.

Sem markdown, sem texto fora do JSON.

Transcricao:
${transcript}`;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Voce gera resumos objetivos de conversas de vendas.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });
    const raw = response.choices?.[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      summary: parsed.summary || parsed.resumo || null,
      next_step: parsed.next_step || parsed.proxima_etapa || null,
    };
  } catch (err) {
    console.error('Falha em generateLeadSummary:', err.message || err);
    return null;
  }
};

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
  deleteAssistant,
  getSummary,
  getAssistantMessageWithoutThreadId,
  speechToText,
  generateLeadSummary,
}