const { messageAnAssistant, runOpenAi, getAssistantReply } = require("./services/OpenAi");

const test = async () => {
    await messageAnAssistant("quero o menu", 'thread_NVlDJINI4bJwgfrrdngwvOTf');
    const resposta = await getAssistantReply('thread_NVlDJINI4bJwgfrrdngwvOTf', "quero o menu");
    console.log('Resposta do assistant:', resposta);
};

test();