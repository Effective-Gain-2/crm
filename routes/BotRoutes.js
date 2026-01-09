const express = require('express');
const { createAssistantController, deleteAssistantController, getBotsController, getFunctionsController, insertBotFunctionsController, updateBotController } = require('../controllers/BotController');
const { verifyToken } = require('../controllers/UserController');
const { allowedRoles } = require('../middlewares/RequireUser');
const router = express.Router()

router.get('/get-bots/:schema', verifyToken, allowedRoles(), getBotsController)
router.get('/get-functions/:schema', verifyToken, allowedRoles(), getFunctionsController)
router.post('/create', verifyToken, allowedRoles('tec-admin', true, 'Assistente criado'),createAssistantController)
router.post('/insert-functions', verifyToken, allowedRoles('tec-admin', true, 'Função inserida'), insertBotFunctionsController)
router.put('/update-assistant/:assistant_id', verifyToken, allowedRoles('tec-admin', true, 'Assistente atualizado'), updateBotController)
router.delete('/delete/:schema/:assistant_id', verifyToken, allowedRoles('tec-admin', true, 'Assistente deletado'), deleteAssistantController)

module.exports = router