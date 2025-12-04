const express = require('express');
const { createAssistantController, deleteAssistantController, getBotsController, getFunctionsController, insertBotFunctionsController, updateBotController } = require('../controllers/BotController');
const { verifyToken } = require('../controllers/UserController');
const { allowedRoles } = require('../middlewares/RequireUser');
const router = express.Router()

router.get('/get-bots/:schema', verifyToken, allowedRoles(), getBotsController)
router.get('/get-functions/:schema', verifyToken, allowedRoles(), getFunctionsController)
router.post('/create', verifyToken, allowedRoles('tec-admin'),createAssistantController)
router.post('/insert-functions', verifyToken, allowedRoles('tec-admin'), insertBotFunctionsController)
router.put('/update-assistant/:assistant_id', verifyToken, allowedRoles('tec-admin'), updateBotController)
router.delete('/delete/:schema/:assistant_id', verifyToken, allowedRoles('tec-admin'), deleteAssistantController)

module.exports = router