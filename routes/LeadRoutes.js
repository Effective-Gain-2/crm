const express = require('express');
const router = express.Router();
const {
  webhookCreateLeadController,
  getApiKeyController,
  regenerateApiKeyController,
  listLeadsController,
  deleteLeadController,
  deleteManyLeadsController,
  deleteAllLeadsController,
} = require('../controllers/LeadIntakeController');
const { verifyToken } = require('../controllers/UserController');
const { allowedRoles } = require('../middlewares/RequireUser');

// Endpoint PÚBLICO (sem JWT) — sistemas externos criam leads via webhook.
// Protegido por API key (header x-lead-api-key). Mantido antes do verifyToken.
router.post('/webhook/:schema', webhookCreateLeadController);

// Gestão da API key (autenticado, tec-admin)
router.get('/api-key', verifyToken, allowedRoles(), getApiKeyController);
router.post('/api-key/regenerate', verifyToken, allowedRoles('tec-admin', true, 'API key de leads regenerada'), regenerateApiKeyController);

// Lista e exclusão de leads (autenticado)
router.get('/list', verifyToken, allowedRoles(), listLeadsController);
router.post('/delete-many', verifyToken, allowedRoles('tec-admin', true, 'Leads excluídos'), deleteManyLeadsController);
router.post('/delete-all', verifyToken, allowedRoles('tec-admin', true, 'Todos os leads excluídos'), deleteAllLeadsController);
router.delete('/contact/:number', verifyToken, allowedRoles('tec-admin', true, 'Lead excluído'), deleteLeadController);

module.exports = router;
