const WorkflowService = require('../services/WorkflowService');
const { startRun } = require('../services/WorkflowExecutor');

const listWorkflowsController = async (req, res) => {
  try {
    const schema = req.schema;
    const data = await WorkflowService.listWorkflows(schema);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erro ao listar workflows' });
  }
};

const getWorkflowController = async (req, res) => {
  try {
    const schema = req.schema;
    const wf = await WorkflowService.getWorkflow(schema, req.params.id);
    if (!wf) return res.status(404).json({ success: false, message: 'Workflow não encontrado' });
    res.status(200).json({ success: true, data: wf });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erro ao buscar workflow' });
  }
};

const createWorkflowController = async (req, res) => {
  try {
    const schema = req.schema;
    const wf = await WorkflowService.createWorkflow(schema, req.body);
    res.status(201).json({ success: true, data: wf });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

const updateWorkflowController = async (req, res) => {
  try {
    const schema = req.schema;
    const wf = await WorkflowService.updateWorkflow(schema, req.params.id, req.body);
    res.status(200).json({ success: true, data: wf });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

const deleteWorkflowController = async (req, res) => {
  try {
    const schema = req.schema;
    await WorkflowService.deleteWorkflow(schema, req.params.id);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erro ao deletar workflow' });
  }
};

const regenerateWebhookTokenController = async (req, res) => {
  try {
    const schema = req.schema;
    const wf = await WorkflowService.regenerateWebhookToken(schema, req.params.id);
    res.status(200).json({ success: true, data: wf });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erro ao regenerar token' });
  }
};

const triggerManuallyController = async (req, res) => {
  // Dispara manualmente (para teste). Body pode trazer context.
  try {
    const schema = req.schema;
    const wf = await WorkflowService.getWorkflow(schema, req.params.id);
    if (!wf) return res.status(404).json({ success: false, message: 'Workflow não encontrado' });
    const context = req.body?.context || {};
    const payload = req.body?.payload || { trigger: 'manual' };
    const run = await startRun(schema, wf, payload, context);
    res.status(202).json({ success: true, run_id: run?.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const listRunsController = async (req, res) => {
  try {
    const schema = req.schema;
    const runs = await WorkflowService.listRecentRuns(schema, req.params.id, parseInt(req.query.limit, 10) || 25);
    res.status(200).json({ success: true, data: runs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erro ao listar execucoes' });
  }
};

const listRunStepsController = async (req, res) => {
  try {
    const schema = req.schema;
    const steps = await WorkflowService.listRunSteps(schema, req.params.run_id);
    res.status(200).json({ success: true, data: steps });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erro ao listar passos' });
  }
};

// Recursos do schema (tags/filas/atendentes/etapas) p/ os dropdowns do builder.
const getResourcesController = async (req, res) => {
  try {
    const schema = req.schema;
    const data = await WorkflowService.getResources(schema);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erro ao buscar recursos' });
  }
};

// Endpoint público (sem JWT) acionado por sistemas externos via webhook.
// URL: POST /api/workflow/hook/:schema/:token
// O body inteiro vira context.payload para uso nos nós.
const publicWebhookController = async (req, res) => {
  try {
    const { schema, token } = req.params;
    if (!schema || !token) return res.status(400).json({ success: false });
    const wf = await WorkflowService.findByWebhookToken(schema, token);
    if (!wf) return res.status(404).json({ success: false, message: 'Webhook não encontrado' });
    const context = { trigger: 'webhook', payload: req.body || {} };
    const run = await startRun(schema, wf, { trigger: 'webhook', body: req.body || {} }, context);
    res.status(202).json({ success: true, run_id: run?.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erro ao processar webhook' });
  }
};

module.exports = {
  listWorkflowsController,
  getWorkflowController,
  createWorkflowController,
  updateWorkflowController,
  deleteWorkflowController,
  regenerateWebhookTokenController,
  triggerManuallyController,
  listRunsController,
  listRunStepsController,
  getResourcesController,
  publicWebhookController,
};
