const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/WorkflowController');
const { verifyToken } = require('../controllers/UserController');
const { allowedRoles } = require('../middlewares/RequireUser');

// Endpoint PÚBLICO (sem JWT) — usado por sistemas externos para disparar
// workflows. Mantido antes do verifyToken.
router.post('/hook/:schema/:token', publicWebhookController);

// Recursos do schema p/ dropdowns do builder
router.get('/resources', verifyToken, allowedRoles(), getResourcesController);

// CRUD autenticado
router.get('/', verifyToken, allowedRoles(), listWorkflowsController);
router.get('/:id', verifyToken, allowedRoles(), getWorkflowController);
router.post('/', verifyToken, allowedRoles('tec-admin', true, 'Workflow criado'), createWorkflowController);
router.put('/:id', verifyToken, allowedRoles('tec-admin', true, 'Workflow atualizado'), updateWorkflowController);
router.delete('/:id', verifyToken, allowedRoles('tec-admin', true, 'Workflow deletado'), deleteWorkflowController);
router.post('/:id/regenerate-token', verifyToken, allowedRoles('tec-admin', true, 'Token webhook regenerado'), regenerateWebhookTokenController);
router.post('/:id/trigger', verifyToken, allowedRoles('tec-admin'), triggerManuallyController);
router.get('/:id/runs', verifyToken, allowedRoles(), listRunsController);
router.get('/runs/:run_id/steps', verifyToken, allowedRoles(), listRunStepsController);

module.exports = router;
