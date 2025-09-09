const express = require('express');
const {
  createTagController,
  getTagsController,
  deleteTagController,
  addTagToChatController,
  removeTagFromChatController,
  getTagsByChatController,
  updateTagsController,
} = require('../controllers/TagController');
const router = express.Router();

router.post('/create', createTagController);
router.get('/:schema', getTagsController);
router.delete('/:schema/:tagId', deleteTagController);
router.post('/update-tag', updateTagsController);
router.post('/remove-from-chat', removeTagFromChatController);
router.get('/by-chat/:schema/:chatId', getTagsByChatController);

module.exports = router;