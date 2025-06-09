const SocketServer = require("../server");
const { createKanbanStage, getFunis, getKanbanStages, getChatsInKanban, changeKanbanStage, updateStageName, updateStageIndex, createFunil, deleteEtapa } = require("../services/KanbanService");
const { createMessageForBlast } = require("../services/MessageBlast");
const io = SocketServer.io

const createKanbanStageController = async (req, res) => {
    try {
        const { name, pos, sector, color } = req.body;
        console.log(req.body)
        const schema = req.body.schema;
        const result = await createKanbanStage(name, pos, color, sector, schema);
        
        res.status(201).json(result);
    } catch (err) {
        console.error("Erro ao criar estágio do Kanban:", err);
        res.status(500).json({ error: 'Erro ao criar estágio do Kanban' });
    }
}

const createMessageForBlastController = async (req, res) => {
    try {
        const { messageValue, sector, campaingId } = req.body;
        const schema = req.body.schema || 'effective_gain';
        const result = await createMessageForBlast(messageValue, sector, campaingId, schema);
        
        res.status(201).json(result);
    } catch (err) {
        console.error("Erro ao criar mensagem para blast:", err.message);
        res.status(500).json({ error: 'Erro ao criar mensagem para blast' });
    }
}
const getFunisController = async (req, res) => {
    try{
        const schema = req.params.schema
        const funis = await getFunis(schema)
        res.status(200).json(funis);
    }catch (err) {
        console.error("Erro ao buscar funis:", err.message);
        res.status(500).json({ error: 'Erro ao buscar funis' });
}
}
const getKanbanStagesController = async (req, res) => {
    try {
        const funil = req.params.funil;
        const schema = req.params.schema
        
        const stages = await getKanbanStages(funil, schema);
        res.status(200).json(stages);
    } catch (err) {
        console.error("Erro ao buscar estágios do Kanban:", err);
        res.status(500).json({ error: 'Erro ao buscar estágios do Kanban' });
    }
}

const getChatsInKanbanController = async (req, res) => {
    try {
        const {sector, schema} = req.params
        const result = await getChatsInKanban(sector, schema)
        res.status(200).json(result)
    } catch (error) {
        console.error(error)
    }
}

const changeKanbanStageController = async (req, res) => {
    try {
        const { chat_id, stage_id } = req.body;
        const schema = req.body.schema;

        const result = await changeKanbanStage(chat_id, stage_id, schema);

        SocketServer.io.emit('leadMoved', { chat_id, stage_id });

        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao mudar estágio do Kanban:', error.message);
        res.status(500).json({ error: 'Erro ao mudar estágio do Kanban' });
    }
};

const updateStageNameController = async (req, res) => {
    const {etapa_id, etapa_nome, sector, color, schema, index} = req.body
    try {
        if(color){
            const result = await updateStageName(etapa_id, etapa_nome, color, sector, schema)
            res.status(200).json(result)

        }else{
            const result = await updateStageName(etapa_id, etapa_nome, null, sector, schema)
            res.status(200).json(result)

        }
    } catch (error) {
        console.error(error)
    }finally{
        updateStageIndex(etapa_id, index, sector, schema)
    }
}
const createFunilController = async (req, res) => {
    const {sector, schema} = req.body
    try {
        const result = await createFunil(sector, schema)
        res.status(200).json(result)

    } catch (error) {
        console.error(error)
    }
}
const deleteEtapaController = async (req, res) => {
    const {etapa_id, sector, schema} = req.body
    try {
        const result = await deleteEtapa(etapa_id, sector, schema)
        res.status(200).json(result)

    } catch (error) {
        console.error(error)
    }
}
module.exports = {
    createKanbanStageController,
    createMessageForBlastController,
    getFunisController,
    getKanbanStagesController,
    getChatsInKanbanController,
    changeKanbanStageController,
    updateStageNameController,
    createFunilController,
    deleteEtapaController
}