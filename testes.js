const { generateQrCode, getConnectionHealth } = require("./requests/evolution");
const { replacePlaceholders } = require("./services/MessageBlast");
const { messageAnAssistant, runOpenAi, getAssistantReply, listRuns, cancelRun } = require("./services/OpenAi");

const test = async () => {
    const result = await replacePlaceholders('olá, {{contact_name}}, sua consulta é as {{horario}}', '557588821124', 'effective_gain')
    console.log(result)
};

test();