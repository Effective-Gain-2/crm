const express = require('express');
const router = express.Router();
const { createInstanceController, fetchInstanceController, sendTextMessageController, generateQrCodeController } = require('../controllers/EvolutionController');

router.post('/instance', createInstanceController)
router.get('/fetchInstances', fetchInstanceController)
router.post('/sendText', sendTextMessageController)
router.get('/generate-qrcode/:instance', generateQrCodeController)

module.exports = router