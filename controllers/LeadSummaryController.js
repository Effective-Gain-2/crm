const { getLeadSummaries, markSummaryRead } = require('../services/LeadSummaryService');

const listLeadSummariesController = async (req, res) => {
  try {
    const schema = req.schema;
    const unreadOnly = req.query.unread === 'true';
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const data = await getLeadSummaries(schema, { unreadOnly, limit });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Erro em listLeadSummaries:', err);
    res.status(500).json({ success: false, message: 'Erro ao buscar resumos' });
  }
};

const markLeadSummaryReadController = async (req, res) => {
  try {
    const schema = req.schema;
    const { id } = req.params;
    const updated = await markSummaryRead(schema, id);
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error('Erro em markLeadSummaryRead:', err);
    res.status(500).json({ success: false, message: 'Erro ao marcar como lido' });
  }
};

module.exports = {
  listLeadSummariesController,
  markLeadSummaryReadController,
};
