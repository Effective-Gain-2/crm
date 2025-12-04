const { generateQrCode, getConnectionHealth } = require("./requests/evolution");
const { createApiConnection } = require("./services/ApiConnection");
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
    await createApiConnection('557588888888', '722737154266393', 'EAAiJWRJb1lgBQB4BZBpYcIayRnxJhWFG413ZCkxl6SllM6lV6mIZATaMLKIbSY4LnDIQcFIObZAHrEvXxgnvGqttbqDafUPrnDpaHsHnIZBML9YoTEQ4HQlRM1CTKFRXdngCGHWvVvNPlJ8ANdPSTNLaoB8MrnZCarhWSZAPCPSvYdaZCSv2UtnYr1i60FtLpsKkmDoaYoB48IRF5gZCA9nC4JnUAMRXgp2RY86sp7ZBFXTU4CZAgbx7RX80jll2nZBoYl8qdnPZAWiFhu2a8yLnBhUV17QZDZD', 'api_conn', 'effective_gain', '1355873329598482')
};

test();