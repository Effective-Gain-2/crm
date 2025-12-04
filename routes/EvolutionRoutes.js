const express = require('express');
const router = express.Router();
const { createInstanceController, fetchInstanceController, sendTextMessageController, generateQrCodeController } = require('../controllers/EvolutionController');
const { allowedRoles } = require('../middlewares/RequireUser');

router.post('/instance', allowedRoles(), createInstanceController)
router.get('/fetchInstances', allowedRoles(), fetchInstanceController)
router.post('/sendText', allowedRoles(), sendTextMessageController)
router.get('/generate-qrcode/:instance', allowedRoles(), generateQrCodeController)

module.exports = router