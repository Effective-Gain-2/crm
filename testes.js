const { generateQrCode, getConnectionHealth } = require("./requests/evolution");
const { sendApiWhatsappMessage, addTestMessage } = require("./services/ChatService");
const { replacePlaceholders } = require("./services/MessageBlast");
const { messageAnAssistant, runOpenAi, getAssistantReply, listRuns, cancelRun } = require("./services/OpenAi");
const OpenAI = require('openai');
require('dotenv')

const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY
})

const test = async () => {
    const result = await openai.beta.threads.messages.list('thread_Ro7yN9JJr28JFvm40Fo53nnH')
    console.log(result)
};

test();