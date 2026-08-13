const express = require('express');
const multer = require('multer');
const {
    getConfigController,
    updateConfigController,
    uploadDocumentController,
    listDocumentsController,
    deleteDocumentController,
    getIntegrationsController,
    setIntegrationController,
    deleteIntegrationController,
} = require('../controllers/AiAgentController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const { enforceSchema } = require('../middlewares/enforceSchema');
const router = express.Router();

router.get('/config/:schema', getConfigController);
router.put('/config', updateConfigController);

// Base de conhecimento — documentos
router.post('/documents', upload.single('file'), enforceSchema, uploadDocumentController);
router.get('/documents/:schema', listDocumentsController);
router.delete('/documents/:id/:schema', deleteDocumentController);

// Chaves de API por cliente (write-only) + uso de IA no mês
router.get('/integrations/:schema', getIntegrationsController);
router.put('/integrations', setIntegrationController);
router.delete('/integrations/:key/:schema', deleteIntegrationController);

module.exports = router;

