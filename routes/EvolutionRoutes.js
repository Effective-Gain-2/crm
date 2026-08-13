const express = require('express');
const router = express.Router();
const { createInstanceController, getQrController, sendTextMessageController } = require('../controllers/EvolutionController');

router.post('/instance', createInstanceController);
router.get('/qr/:connectionId', getQrController);
router.post('/sendText', sendTextMessageController);

module.exports = router;
