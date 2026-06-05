const LeadIntakeService = require('../services/LeadIntakeService');

// POST público /api/leads/webhook/:schema — cria um lead.
// Auth: header x-lead-api-key validado contra a key do schema.
// Body: { number* , name?, tag?, kanban? } (tag/kanban = numeric_id ou uuid).
const webhookCreateLeadController = async (req, res) => {
  try {
    const { schema } = req.params;
    if (!schema) return res.status(400).json({ success: false, message: 'schema obrigatório' });

    const token = req.headers['x-lead-api-key'] || req.query.key;
    const ok = await LeadIntakeService.validateApiKey(schema, token);
    if (!ok) return res.status(401).json({ success: false, message: 'API key inválida' });

    const { number, name, tag, kanban } = req.body || {};
    if (!number || !String(number).trim()) {
      return res.status(400).json({ success: false, message: 'number é obrigatório' });
    }

    const result = await LeadIntakeService.createLead({ number, name, tag, kanban }, schema);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error('Erro ao criar lead via webhook:', err);
    res.status(500).json({ success: false, message: 'Erro ao criar lead' });
  }
};

const getApiKeyController = async (req, res) => {
  try {
    const schema = req.schema;
    const key = await LeadIntakeService.getApiKey(schema);
    res.status(200).json({ success: true, data: key });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erro ao buscar API key' });
  }
};

const regenerateApiKeyController = async (req, res) => {
  try {
    const schema = req.schema;
    const key = await LeadIntakeService.regenerateApiKey(schema);
    res.status(200).json({ success: true, data: key });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erro ao regenerar API key' });
  }
};

const listLeadsController = async (req, res) => {
  try {
    const data = await LeadIntakeService.listLeads(req.schema);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Erro ao listar leads:', err);
    res.status(500).json({ success: false, message: 'Erro ao listar leads' });
  }
};

const deleteLeadController = async (req, res) => {
  try {
    const { number } = req.params;
    const ok = await LeadIntakeService.deleteLead(number, req.schema);
    res.status(200).json({ success: true, deleted: ok });
  } catch (err) {
    console.error('Erro ao excluir lead:', err);
    res.status(500).json({ success: false, message: 'Erro ao excluir lead' });
  }
};

const deleteManyLeadsController = async (req, res) => {
  try {
    const { numbers } = req.body || {};
    if (!Array.isArray(numbers) || numbers.length === 0) {
      return res.status(400).json({ success: false, message: 'numbers (array) é obrigatório' });
    }
    const result = await LeadIntakeService.deleteLeads(numbers, req.schema);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error('Erro ao excluir leads:', err);
    res.status(500).json({ success: false, message: 'Erro ao excluir leads' });
  }
};

// Exclusão em massa — só effective_gain (a service rejeita outros schemas).
const deleteAllLeadsController = async (req, res) => {
  try {
    const counts = await LeadIntakeService.deleteAllLeads(req.schema);
    res.status(200).json({ success: true, counts });
  } catch (err) {
    console.error('Erro ao excluir todos os leads:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = {
  webhookCreateLeadController,
  getApiKeyController,
  regenerateApiKeyController,
  listLeadsController,
  deleteLeadController,
  deleteManyLeadsController,
  deleteAllLeadsController,
};
