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
const { verifyToken } = require('../controllers/UserController');
const { allowedRoles } = require('../middlewares/RequireUser');
const router = express.Router();

router.post('/create', verifyToken, allowedRoles('tec-admin', true, 'Tag criada'), createTagController);
router.get('/:schema', verifyToken, allowedRoles(), getTagsController);
router.delete('/:schema/:tagId', verifyToken, allowedRoles('tec-admin', true, 'Tag deletada'), deleteTagController);
router.post('/update-tag', verifyToken, allowedRoles(), updateTagsController);
router.post('/remove-from-chat', verifyToken, allowedRoles(), removeTagFromChatController);
router.get('/by-chat/:schema/:chatId', verifyToken, allowedRoles(), getTagsByChatController);

module.exports = router;