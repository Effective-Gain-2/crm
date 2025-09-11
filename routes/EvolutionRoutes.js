const express = require('express');
const router = express.Router();
const { createInstanceController, fetchInstanceController, sendTextMessageController } = require('../controllers/EvolutionController');

router.post('/instance', createInstanceController)
router.get('/fetchInstances', fetchInstanceController)
router.post('/sendText', sendTextMessageController)

module.exports = router