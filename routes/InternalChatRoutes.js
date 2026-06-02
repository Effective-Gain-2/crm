const express = require('express')
const { verifyToken } = require('../controllers/UserController')
const { allowedRoles } = require('../middlewares/RequireUser')
const {
    upload,
    sendMessageController,
    getContactsController,
    getDirectMessagesController,
    getQueueMessagesController,
    uploadFileController,
    serveFileController,
} = require('../controllers/InternalChatController')

const router = express.Router()

router.get('/contacts', verifyToken, allowedRoles(), getContactsController)
router.get('/messages/user/:otherUserId', verifyToken, allowedRoles(), getDirectMessagesController)
router.get('/messages/queue/:queueId', verifyToken, allowedRoles(), getQueueMessagesController)
router.post('/send', verifyToken, allowedRoles(), sendMessageController)
router.post('/upload', verifyToken, allowedRoles(), upload.single('file'), uploadFileController)
// Sem auth: o <img>/download abre o arquivo direto. O nome tem prefixo uuid
// não-adivinhável e o controller bloqueia path traversal.
router.get('/file/:filename', serveFileController)

module.exports = router
