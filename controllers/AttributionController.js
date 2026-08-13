const { report, summary } = require('../services/AttributionService');

const reportController = async (req, res) => {
    try {
        const { schema } = req.params;
        const { dimension, funnel, from, to } = req.query;
        const rows = await report(schema, { dimension, funnel, from, to });
        res.status(200).json({ rows });
    } catch (error) {
        console.error('Erro no relatório de atribuição:', error);
        res.status(500).json({ error: 'Erro ao gerar relatório de atribuição' });
    }
};

const summaryController = async (req, res) => {
    try {
        const { schema } = req.params;
        const { funnel, from, to } = req.query;
        const data = await summary(schema, { funnel, from, to });
        res.status(200).json({ summary: data });
    } catch (error) {
        console.error('Erro no resumo de atribuição:', error);
        res.status(500).json({ error: 'Erro ao gerar resumo de atribuição' });
    }
};

module.exports = { reportController, summaryController };
