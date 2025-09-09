const express = require('express');
const { getAllQuickMessagesController, getQuickMessageByIdController, createQuickMessageController, updateQuickMessageController, deleteQuickMessageController, getAllQuickMessagesByUserController } = require('../controllers/QuickMessagesContoller');
const { verifyToken } = require('../controllers/UserController');
const router = express.Router();

router.get('/get-all-q-messages/:schema',getAllQuickMessagesController)
router.get('/get-q-message-by-id/:quick_message_id/:schema', getQuickMessageByIdController)
router.get('/get-q-messages-by-user/:user_id/:schema', getAllQuickMessagesByUserController)
router.post('/create-q-message', createQuickMessageController)
router.put('/update-q-message', updateQuickMessageController)
router.delete('/delete-q-message/:quick_message_id/:schema', deleteQuickMessageController)

module.exports=router