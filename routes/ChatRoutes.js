const express = require('express');
const {
  processReceivedAudio, updateContactNameController, setUserChatController, sendImageController, getChatsController, getMessagesController, setQueueController, getChatDataController, getChatByUserController, updateQueueController, sendAudioController, uploadImage, uploadAudio,
  setMessageAsReadController,
  closeChatContoller,
  setSpecificUserController,
} = require('../controllers/ChatController'); 
const { updateContactName } = require('../services/ChatService');
const router = express.Router();

router.post('/setChat', setUserChatController);
router.get('/getChats/:schema', getChatsController);
router.post('/getMessages', getMessagesController);
router.post('/setQueue', updateQueueController);
router.get('/:schema/:chatId', getChatDataController);
router.get('/getChat/:userId/:schema/:role', getChatByUserController);
router.post('/sendAudio', uploadAudio.single('audio'), sendAudioController);
router.post('/chat/processReceivedAudio', processReceivedAudio);
router.post('/sendImage', uploadImage.single('image'), sendImageController); 
router.post('/setAsRead', setMessageAsReadController)
router.post('/close', closeChatContoller)
router.post('/setUser', setSpecificUserController)
module.exports = router;