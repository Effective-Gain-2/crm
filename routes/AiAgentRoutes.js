const express = require('express');
const multer = require('multer');
const {
    getConfigController,
    updateConfigController,
    uploadDocumentController,
    listDocumentsController,
    deleteDocumentController,
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

module.exports = router;
