const { getConfig, upsertConfig } = require('../services/AiAgentService');

const VALID_STATUS = ['disabled', 'suggestive', 'autopilot'];

const getConfigController = async (req, res) => {
    try {
        const { schema } = req.params;
        const config = await getConfig(schema);
        res.status(200).json({ config });
    } catch (error) {
        console.error('Erro ao buscar config do agente:', error);
        res.status(500).json({ error: 'Erro ao buscar configuração do agente' });
    }
};

const updateConfigController = async (req, res) => {
    try {
        const { schema, ...fields } = req.body;
        if (!schema) return res.status(400).json({ error: 'schema é obrigatório' });
        if (fields.status && !VALID_STATUS.includes(fields.status)) {
            return res.status(400).json({ error: `status inválido (use: ${VALID_STATUS.join(', ')})` });
        }
        const config = await upsertConfig(schema, fields);
        res.status(200).json({ config });
    } catch (error) {
        console.error('Erro ao salvar config do agente:', error);
        res.status(500).json({ error: 'Erro ao salvar configuração do agente' });
    }
};

module.exports = { getConfigController, updateConfigController };
