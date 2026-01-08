const { generateQrCode, getConnectionHealth } = require("./requests/evolution");
const { createApiConnection } = require("./services/ApiConnection");
const { sendApiWhatsappMessage, addTestMessage } = require("./services/ChatService");
const { createCompanySelfService } = require("./services/CompanyService");
const { replacePlaceholders } = require("./services/MessageBlast");
const { createTemplate, listTemplates, sendTemplateMessage } = require("./services/OfcCampaing");
const { messageAnAssistant, runOpenAi, getAssistantReply, listRuns, cancelRun } = require("./services/OpenAi");
const OpenAI = require('openai');

require('dotenv')

// const openai = new OpenAI({
//     apiKey: process.env.OPENAI_KEY
// })

const test = async () => {
    await createCompanySelfService('Empresa de teste Ççãõóí', 'Nome do usuário', 'email@exemplo.com', 'senha123');
};

test();