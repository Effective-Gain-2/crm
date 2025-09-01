const express = require('express');
const { createAssistantController } = require('../controllers/BotController');
const router = express.Router()

router.post('/create', createAssistantController)

module.exports = router