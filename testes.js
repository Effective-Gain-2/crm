const { generateQrCode, getConnectionHealth } = require("./requests/evolution");
const { sendApiWhatsappMessage, addTestMessage } = require("./services/ChatService");
const { replacePlaceholders } = require("./services/MessageBlast");
const { createTemplate, listTemplates, sendTemplateMessage } = require("./services/OfcCampaing");
const { messageAnAssistant, runOpenAi, getAssistantReply, listRuns, cancelRun } = require("./services/OpenAi");
const OpenAI = require('openai');

require('dotenv')

const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY
})

const token = process.env.WHATSAPP_API_TOKEN
console.log('TOKEN',token)

const test = async () => {
    const result = await sendTemplateMessage('722737154266393', token, 'template_teste', '557588821124')
};

test();