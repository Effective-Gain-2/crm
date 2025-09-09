const express = require('express');
const {
  createTagController,
  getTagsController,
  deleteTagController,
  addTagToChatController,
  removeTagFromChatController,
  getTagsByChatController,
} = require('../controllers/TagController');
const { verifyToken } = require('../controllers/UserController');
const router = express.Router();

router.post('/', verifyToken, createTagController);
router.get('/:schema', verifyToken, getTagsController);
router.delete('/:schema/:tagId', verifyToken, deleteTagController);

router.post('/add-to-chat', verifyToken, addTagToChatController);
router.post('/remove-from-chat', verifyToken, removeTagFromChatController);
router.get('/by-chat/:schema/:chatId', verifyToken, getTagsByChatController);

module.exports = router;