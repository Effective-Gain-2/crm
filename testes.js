const { generateQrCode, getConnectionHealth } = require("./requests/evolution");
const { sendApiWhatsappMessage } = require("./services/ChatService");
const { replacePlaceholders } = require("./services/MessageBlast");
const { messageAnAssistant, runOpenAi, getAssistantReply, listRuns, cancelRun } = require("./services/OpenAi");

const test = async () => {
    const result = await sendApiWhatsappMessage('teste', '+55(75988040003')
    console.log(result)
};

test();