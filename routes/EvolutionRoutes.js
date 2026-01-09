const express = require('express');
const router = express.Router();
const { createInstanceController, fetchInstanceController, sendTextMessageController, generateQrCodeController } = require('../controllers/EvolutionController');
const { allowedRoles } = require('../middlewares/RequireUser');
const { verifyToken } = require('../controllers/UserController');

router.post('/instance', verifyToken, allowedRoles(null, true, 'Conexão criada'), createInstanceController)
router.get('/fetchInstances', verifyToken, allowedRoles(), fetchInstanceController)
router.post('/sendText', verifyToken, allowedRoles(), sendTextMessageController)
router.get('/generate-qrcode/:instance', verifyToken, allowedRoles(null, true, 'Gerou QrCode de conexão'), generateQrCodeController)

module.exports = router