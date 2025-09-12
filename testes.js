const { generateQrCode, getConnectionHealth } = require("./requests/evolution");
const { messageAnAssistant, runOpenAi, getAssistantReply, listRuns, cancelRun } = require("./services/OpenAi");

const test = async () => {
    const result = await getConnectionHealth('cauan teste')
    console.log(result[0].connectionStatus)
};

test();