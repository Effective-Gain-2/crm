const pool = require("./db/queries");
const { runMigrations } = require("./db/runMigrations");
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

const test = async (schema) => {
const client = await pool.connect()
await runMigrations(client, schema)
};

test('effective_gain');