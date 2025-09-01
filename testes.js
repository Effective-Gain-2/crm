const { messageAnAssistant, runOpenAi, getAssistantReply, listRuns, cancelRun } = require("./services/OpenAi");

const test = async () => {
    await cancelRun('thread_Mv6QSj4ykV1ZJExWMqQP8hH2')
};

test();