const pool = require("./db/queries");
const { runMigrations } = require("./db/runMigrations");
const { generateQrCode, getConnectionHealth } = require("./requests/evolution");
const { createApiConnection } = require("./services/ApiConnection");
const { initiateVAPICall } = require("./services/CallService");
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

const initiateCall = async()=>{
    const res = await initiateVAPICall({phone:'+5575988040003', schema:'effective_gain'})
}


initiateCall()