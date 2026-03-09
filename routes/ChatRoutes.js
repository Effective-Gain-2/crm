const express = require('express');
const {
  processReceivedAudio, updateContactNameController, setUserChatController, sendImageController, getChatsController, getMessagesController, setQueueController, getChatDataController, getChatByUserController, updateQueueController, sendAudioController, uploadImage, uploadAudio,
  setMessageAsReadController,
  closeChatContoller,
  setSpecificUserController,
  scheduleMessageController,
  getScheduledMessagesController,
  deleteScheduledMessageController,
  disableBotController,
  getStatusController,
  createStatusController,
  getClosedChatsController,
  redistributeWaitingChatsController,
  getAverageTimeToCloseController,
  activeBotController,
  get20MoreMessagesController,
} = require('../controllers/ChatController'); 
const { updateContactName } = require('../services/ChatService');
const { verifyToken } = require('../controllers/UserController');
const { allowedRoles } = require('../middlewares/RequireUser');
const { getDailyCostController, getVoiceSummaryController } = require('../controllers/VoiceViewController');
const router = express.Router();

router.get('/get-daily-cost/:call_date', verifyToken, allowedRoles(), getDailyCostController);
router.get('/get-calls-summary/:days', verifyToken, allowedRoles(), getVoiceSummaryController);

router.get('/getChats/:schema',verifyToken, allowedRoles(), getChatsController);
router.get('/getChat/:userId/:schema/:role', verifyToken, allowedRoles(), getChatByUserController);
router.get('/getChatById/:chatId/:schema', verifyToken, allowedRoles(), getChatDataController);
router.get('/scheduled-messages/:chat_id/:schema', verifyToken, allowedRoles(), getScheduledMessagesController)
router.get('/get-status/:schema', verifyToken, allowedRoles(), getStatusController)
router.get('/get-closed-chats/:schema', verifyToken, allowedRoles(), getClosedChatsController)
router.get('/average-time-to-close/:schema', verifyToken, allowedRoles(), getAverageTimeToCloseController);
router.get('/:schema/:chatId', verifyToken, allowedRoles(), getChatDataController);
router.post('/create-status', verifyToken, allowedRoles(null, true, 'Status criado'), createStatusController)
router.post('/setChat', verifyToken, allowedRoles('tec-admin', true, 'Chat transferido'), setUserChatController);
router.post('/getMessages', verifyToken, allowedRoles(),  getMessagesController);
router.post('/setQueue', verifyToken, allowedRoles('tec-admin', true, 'Fila atualizada'), updateQueueController);
router.post('/sendAudio', uploadAudio.single('audio'), verifyToken, allowedRoles(), sendAudioController);
router.post('/chat/processReceivedAudio', verifyToken, allowedRoles(), processReceivedAudio);
router.post('/sendImage', uploadImage.single('image'), verifyToken, allowedRoles(), sendImageController); 
router.post('/setAsRead', verifyToken, allowedRoles(), setMessageAsReadController)
router.post('/close', verifyToken, allowedRoles(null, true, 'Chat fechado'), closeChatContoller)
router.post('/setUser', verifyToken, allowedRoles('tec-admin', 'Chat transferido para usuário específico'), setSpecificUserController)
router.post('/schedule-message', verifyToken, allowedRoles(null, true, 'Mensagem agendada'), scheduleMessageController)
router.post('/disable-bot', verifyToken, allowedRoles(), disableBotController)
router.post('/redistribute-waiting', verifyToken, allowedRoles('tec-admin', true, 'Todos os chats aguardando foram redistribuidos '), redistributeWaitingChatsController)
router.put('/active-bot', verifyToken, allowedRoles(), activeBotController)
router.delete('/scheduled-message/:id/:schema', verifyToken, allowedRoles(), deleteScheduledMessageController)
module.exports = router;