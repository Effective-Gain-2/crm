const {
    createOpportunity,
    getOpportunitiesByFunnel,
    getOpportunitiesByStage,
    getOpportunityById,
    moveOpportunityStage,
    updateOpportunity,
    deleteOpportunity,
    getForecastByFunnel,
} = require('../services/OpportunityService');

const createOpportunityController = async (req, res) => {
    try {
        const { schema, ...data } = req.body;
        if (!schema || !data.funnel) {
            return res.status(400).json({ error: 'schema e funnel são obrigatórios' });
        }
        const opportunity = await createOpportunity(data, schema);
        res.status(201).json({ opportunity });
    } catch (error) {
        console.error('Erro ao criar oportunidade:', error);
        res.status(500).json({ error: 'Erro ao criar oportunidade' });
    }
};

const getOpportunitiesByFunnelController = async (req, res) => {
    try {
        const { funnel, schema } = req.params;
        const opportunities = await getOpportunitiesByFunnel(funnel, schema);
        res.status(200).json({ opportunities });
    } catch (error) {
        console.error('Erro ao buscar oportunidades:', error);
        res.status(500).json({ error: 'Erro ao buscar oportunidades' });
    }
};

const getOpportunitiesByStageController = async (req, res) => {
    try {
        const { stage_id, schema } = req.params;
        const opportunities = await getOpportunitiesByStage(stage_id, schema);
        res.status(200).json({ opportunities });
    } catch (error) {
        console.error('Erro ao buscar oportunidades da etapa:', error);
        res.status(500).json({ error: 'Erro ao buscar oportunidades da etapa' });
    }
};

const getOpportunityByIdController = async (req, res) => {
    try {
        const { id, schema } = req.params;
        const opportunity = await getOpportunityById(id, schema);
        if (!opportunity) return res.status(404).json({ error: 'Oportunidade não encontrada' });
        res.status(200).json({ opportunity });
    } catch (error) {
        console.error('Erro ao buscar oportunidade:', error);
        res.status(500).json({ error: 'Erro ao buscar oportunidade' });
    }
};

const moveOpportunityStageController = async (req, res) => {
    try {
        const { id, stage_id, schema } = req.body;
        if (!id || !schema) return res.status(400).json({ error: 'id e schema são obrigatórios' });
        const opportunity = await moveOpportunityStage(id, stage_id, schema);
        // Notifica os clientes em tempo real (mesmo padrão do leadMoved do Kanban).
        if (global.socketIoServer) {
            global.socketIoServer.emit('opportunityMoved', { schema, opportunity });
        }
        res.status(200).json({ opportunity });
    } catch (error) {
        console.error('Erro ao mover oportunidade:', error);
        res.status(500).json({ error: 'Erro ao mover oportunidade' });
    }
};

const updateOpportunityController = async (req, res) => {
    try {
        const { id, schema, ...fields } = req.body;
        if (!id || !schema) return res.status(400).json({ error: 'id e schema são obrigatórios' });
        const opportunity = await updateOpportunity(id, fields, schema);
        res.status(200).json({ opportunity });
    } catch (error) {
        console.error('Erro ao atualizar oportunidade:', error);
        res.status(500).json({ error: 'Erro ao atualizar oportunidade' });
    }
};

const deleteOpportunityController = async (req, res) => {
    try {
        const { id, schema } = req.params;
        await deleteOpportunity(id, schema);
        res.status(200).json({ deleted: true, id });
    } catch (error) {
        console.error('Erro ao deletar oportunidade:', error);
        res.status(500).json({ error: 'Erro ao deletar oportunidade' });
    }
};

const getForecastController = async (req, res) => {
    try {
        const { funnel, schema } = req.params;
        const forecast = await getForecastByFunnel(funnel, schema);
        res.status(200).json({ forecast });
    } catch (error) {
        console.error('Erro ao gerar forecast:', error);
        res.status(500).json({ error: 'Erro ao gerar forecast' });
    }
};

module.exports = {
    createOpportunityController,
    getOpportunitiesByFunnelController,
    getOpportunitiesByStageController,
    getOpportunityByIdController,
    moveOpportunityStageController,
    updateOpportunityController,
    deleteOpportunityController,
    getForecastController,
};
