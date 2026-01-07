const express = require('express');
const { verifyToken } = require('../controllers/UserController');
const { listTemplatesController, createTemplateController, sendTemplateMessageController, deleteTemplateController, editTemplateController } = require('../controllers/OfcCampaingController');
const { allowedRoles } = require('../middlewares/RequireUser');
const router = express.Router()

router.get('/get-templates/:wa_id/:schema', verifyToken, allowedRoles(), listTemplatesController)
router.post('/create-template', verifyToken, allowedRoles('tec-admin'), createTemplateController)
router.post('/send-template-message', verifyToken, allowedRoles('tec-admin'), sendTemplateMessageController)
router.put('/edit-template', verifyToken, allowedRoles('tec-admin'), editTemplateController)
router.delete('/delete-template/:wa_id/:template_name', verifyToken, allowedRoles('tec-admin'), deleteTemplateController)

module.exports = router