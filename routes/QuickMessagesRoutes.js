const express = require('express');
const { getAllQuickMessagesController, getQuickMessageByIdController, createQuickMessageController, updateQuickMessageController, deleteQuickMessageController, getAllQuickMessagesByUserController } = require('../controllers/QuickMessagesContoller');
const { verifyToken } = require('../controllers/UserController');
const { allowedRoles } = require('../middlewares/RequireUser');

const router = express.Router();

router.get('/get-all-q-messages/:schema', verifyToken, allowedRoles(), getAllQuickMessagesController)
router.get('/get-q-message-by-id/:quick_message_id/:schema', verifyToken, allowedRoles(), getQuickMessageByIdController)
router.get('/get-q-messages-by-user/:user_id/:schema', verifyToken, allowedRoles(), getAllQuickMessagesByUserController)
router.post('/create-q-message', verifyToken, allowedRoles(null), createQuickMessageController)
router.put('/update-q-message', verifyToken, allowedRoles(null), updateQuickMessageController)
router.delete('/delete-q-message/:quick_message_id/:schema', verifyToken, allowedRoles(null, true, 'Mensagem rápida deletada'), deleteQuickMessageController)

module.exports=router