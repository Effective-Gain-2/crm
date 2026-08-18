const express = require('express');
const router = express.Router();
const { createInstanceController, getQrController, sendTextMessageController } = require('../controllers/EvolutionController');
const { blockAttendance } = require('../middlewares/blockAttendance');

router.post('/instance', createInstanceController);
router.get('/qr/:connectionId', getQrController);
router.post('/sendText', blockAttendance, sendTextMessageController);

module.exports = router;
