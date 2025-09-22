const { generateQrCode, getConnectionHealth } = require("./requests/evolution");
const { sendApiWhatsappMessage, addTestMessage } = require("./services/ChatService");
const { replacePlaceholders } = require("./services/MessageBlast");
const { messageAnAssistant, runOpenAi, getAssistantReply, listRuns, cancelRun } = require("./services/OpenAi");

const test = async () => {
    const result = await addTestMessage('38c77f3c-263a-4a6e-9fc0-b59b0316a7b8', 'BLZ')
    console.log(result)
};

test();