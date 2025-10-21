const { generateQrCode, getConnectionHealth } = require("./requests/evolution");
const { sendApiWhatsappMessage, addTestMessage } = require("./services/ChatService");
const { replacePlaceholders } = require("./services/MessageBlast");
const { createTemplate, listTemplates } = require("./services/OfcCampaing");
const { messageAnAssistant, runOpenAi, getAssistantReply, listRuns, cancelRun } = require("./services/OpenAi");
const OpenAI = require('openai');

require('dotenv')

const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY
})

const test = async () => {
    const result = await listTemplates('1355873329598482', process.env.WHATSAPP_API_TOKEN)
    console.log(result.data)
};

test();