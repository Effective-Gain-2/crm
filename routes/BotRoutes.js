const express = require('express');
const { createAssistantController, deleteAssistantController, getBotsController } = require('../controllers/BotController');
const { verifyToken } = require('../controllers/UserController');
const router = express.Router()

router.get('/get-bots/:schema', verifyToken, getBotsController)
router.post('/create', verifyToken, createAssistantController)
router.delete('/delete/:schema/:assistant_id', verifyToken, deleteAssistantController)

module.exports = router