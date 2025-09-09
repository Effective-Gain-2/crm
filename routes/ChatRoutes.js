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
} = require('../controllers/ChatController'); 
const { updateContactName } = require('../services/ChatService');
const { verifyToken } = require('../controllers/UserController');
const router = express.Router();

router.get('/getChats/:schema',verifyToken,  getChatsController);
router.get('/getChat/:userId/:schema/:role', verifyToken, getChatByUserController);
router.get('/getChatById/:chatId/:schema', verifyToken, getChatDataController);
router.get('/scheduled-messages/:chat_id/:schema', verifyToken, getScheduledMessagesController)
router.get('/get-status/:schema', verifyToken,getStatusController)
router.get('/get-closed-chats/:schema', verifyToken, getClosedChatsController)
router.get('/average-time-to-close/:schema', verifyToken, getAverageTimeToCloseController);
router.post('/create-status', verifyToken, createStatusController)
router.get('/:schema/:chatId', verifyToken, getChatDataController);
router.post('/setChat', verifyToken, setUserChatController);
router.post('/getMessages', verifyToken, getMessagesController);
router.post('/setQueue', verifyToken, updateQueueController);
router.post('/sendAudio', uploadAudio.single('audio'), verifyToken, sendAudioController);
router.post('/chat/processReceivedAudio', verifyToken, processReceivedAudio);
router.post('/sendImage', uploadImage.single('image'), verifyToken, sendImageController); 
router.post('/setAsRead', verifyToken, setMessageAsReadController)
router.post('/close', verifyToken, closeChatContoller)
router.post('/setUser', verifyToken, setSpecificUserController)
router.post('/schedule-message', verifyToken, scheduleMessageController)
router.post('/disable-bot', verifyToken, disableBotController)
router.post('/redistribute-waiting', verifyToken, redistributeWaitingChatsController)
router.delete('/scheduled-message/:id/:schema', verifyToken, deleteScheduledMessageController)
module.exports = router;