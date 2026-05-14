const express = require('express');
const { createAssistantController, deleteAssistantController, getBotsController, getFunctionsController, insertBotFunctionsController, updateBotController, setTestModeController, getTestNumbersController, addTestNumberController, removeTestNumberController } = require('../controllers/BotController');
const { verifyToken } = require('../controllers/UserController');
const { allowedRoles } = require('../middlewares/RequireUser');
const router = express.Router()

router.get('/get-bots/:schema', verifyToken, allowedRoles(), getBotsController)
router.get('/get-functions/:schema', verifyToken, allowedRoles(), getFunctionsController)
router.post('/create', verifyToken, allowedRoles('tec-admin', true, 'Assistente criado'),createAssistantController)
router.post('/insert-functions', verifyToken, allowedRoles('tec-admin', true, 'Função inserida'), insertBotFunctionsController)
router.put('/update-assistant/:assistant_id', verifyToken, allowedRoles('tec-admin', true, 'Assistente atualizado'), updateBotController)
router.delete('/delete/:schema/:assistant_id', verifyToken, allowedRoles('tec-admin', true, 'Assistente deletado'), deleteAssistantController)

router.get('/:assistant_id/test-numbers', verifyToken, allowedRoles(), getTestNumbersController)
router.post('/:assistant_id/test-numbers', verifyToken, allowedRoles('tec-admin', true, 'Número de teste adicionado'), addTestNumberController)
router.delete('/:assistant_id/test-numbers/:id', verifyToken, allowedRoles('tec-admin', true, 'Número de teste removido'), removeTestNumberController)
router.put('/:assistant_id/test-mode', verifyToken, allowedRoles('tec-admin', true, 'Modo de teste do bot alterado'), setTestModeController)

module.exports = router