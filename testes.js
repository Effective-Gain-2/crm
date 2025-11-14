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
    await createApiConnection('557588888888', '722737154266393', 'EAAiJWRJb1lgBPzrQskg33Qh59FIHe9kAQlsuHNuziOtE97a1rGVZAlGRy5ZAUMqZB6HCVKD2iMxMGhZBtTFnXPZAJDqG4Kk1vZAWEy5RvSoZCjhbphhxvkUdZCsuZAOH8ZCZB8CH6yfDE025Fc943RWRSDleK8J9VKXNbglzBiWiYER2i8ZArLacWOZCwN1iDPqoUQQYYitxINyllntzptNB3itFtc5ZB807pVEMBYryZBZBLGM0fe7LdgZDZD', 'api_conn', 'effective_gain')
};

test();