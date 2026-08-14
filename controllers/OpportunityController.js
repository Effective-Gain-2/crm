const {
    createOpportunity,
    getOpportunitiesByFunnel,
    getOpportunitiesByStage,
    getOpportunityById,
    moveOpportunityStage,
    updateOpportunity,
    deleteOpportunity,
    getForecastByFunnel,
    importLeads,
} = require('../services/OpportunityService');
const {
    listRules,
    createRule,
    deleteRule,
    recomputeAll,
} = require('../services/LeadScoreService');

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
        const { limit, offset } = req.query;
        const opportunities = await getOpportunitiesByFunnel(funnel, schema, { limit, offset });
        res.status(200).json({ opportunities, limit: Number(limit) || 200, offset: Number(offset) || 0 });
    } catch (error) {
        console.error('Erro ao buscar oportunidades:', error);
        res.status(500).json({ error: 'Erro ao buscar oportunidades' });
    }
};

const getOpportunitiesByStageController = async (req, res) => {
    try {
        const { stage_id, schema } = req.params;
        const { limit, offset } = req.query;
        const opportunities = await getOpportunitiesByStage(stage_id, schema, { limit, offset });
        res.status(200).json({ opportunities, limit: Number(limit) || 50, offset: Number(offset) || 0 });
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

// ---- Lead scoring ----
const listScoreRulesController = async (req, res) => {
    try {
        const { schema } = req.params;
        const rules = await listRules(schema);
        res.status(200).json({ rules });
    } catch (error) {
        console.error('Erro ao listar regras de score:', error);
        res.status(500).json({ error: 'Erro ao listar regras de score' });
    }
};

const createScoreRuleController = async (req, res) => {
    try {
        const { schema, ...rule } = req.body;
        if (!schema || !rule.name || !rule.field || !rule.operator) {
            return res.status(400).json({ error: 'schema, name, field e operator são obrigatórios' });
        }
        const created = await createRule(schema, rule);
        res.status(201).json({ rule: created });
    } catch (error) {
        console.error('Erro ao criar regra de score:', error);
        res.status(500).json({ error: 'Erro ao criar regra de score' });
    }
};

const deleteScoreRuleController = async (req, res) => {
    try {
        const { id, schema } = req.params;
        await deleteRule(schema, id);
        res.status(200).json({ deleted: true, id });
    } catch (error) {
        console.error('Erro ao excluir regra de score:', error);
        res.status(500).json({ error: 'Erro ao excluir regra de score' });
    }
};

const recomputeScoresController = async (req, res) => {
    try {
        const { schema } = req.body;
        if (!schema) return res.status(400).json({ error: 'schema é obrigatório' });
        const result = await recomputeAll(schema);
        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao recalcular scores:', error);
        res.status(500).json({ error: 'Erro ao recalcular scores' });
    }
};

// POST /opportunity/import — carga de histórico (master/técnico)
const importLeadsController = async (req, res) => {
    try {
        const { funnel, stages, leads } = req.body;
        if (!Array.isArray(leads) || leads.length === 0) {
            return res.status(400).json({ error: 'leads é obrigatório' });
        }
        const result = await importLeads({ funnel, stages, leads }, req.auth.schema);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        console.error('Erro no import de leads:', error);
        res.status(500).json({ error: 'Erro no import de leads' });
    }
};

module.exports = {
    importLeadsController,
    createOpportunityController,
    getOpportunitiesByFunnelController,
    getOpportunitiesByStageController,
    getOpportunityByIdController,
    moveOpportunityStageController,
    updateOpportunityController,
    deleteOpportunityController,
    getForecastController,
    listScoreRulesController,
    createScoreRuleController,
    deleteScoreRuleController,
    recomputeScoresController,
};
