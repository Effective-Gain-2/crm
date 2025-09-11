const express = require('express');
const { createAssistantController, deleteAssistantController, getBotsController, getFunctionsController, insertBotFunctionsController, updateBotController } = require('../controllers/BotController');
const { verifyToken } = require('../controllers/UserController');
const router = express.Router()

router.get('/get-bots/:schema', verifyToken, getBotsController)
router.get('/get-functions/:schema', verifyToken, getFunctionsController)
router.post('/create', verifyToken, createAssistantController)
router.post('/insert-functions', verifyToken, insertBotFunctionsController)
router.put('/update-assistant/:assistant_id', verifyToken, updateBotController)
router.delete('/delete/:schema/:assistant_id', verifyToken, deleteAssistantController)

module.exports = router