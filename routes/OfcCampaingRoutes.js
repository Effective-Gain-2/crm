const express = require('express');
const { verifyToken } = require('../controllers/UserController');
const { listTemplatesController, createTemplateController, sendTemplateMessageController, deleteTemplateController, editTemplateController } = require('../controllers/OfcCampaingController');
const router = express.Router()

router.get('/get-templates/:wa_id', verifyToken, listTemplatesController)
router.post('/create-template', verifyToken, createTemplateController)
router.post('/send-template-message', verifyToken, sendTemplateMessageController)
router.put('/edit-template', verifyToken, editTemplateController)
router.delete('/delete-template/:wa_id/:template_name', verifyToken, deleteTemplateController)

module.exports = router