const express = require('express');
const { verifyToken } = require('../controllers/UserController');
const { listTemplatesController, createTemplateController, sendTemplateMessageController, deleteTemplateController, editTemplateController } = require('../controllers/OfcCampaingController');
const { allowedRoles } = require('../middlewares/RequireUser');
const router = express.Router()

router.get('/get-templates/:wa_id/:schema', verifyToken, allowedRoles(), listTemplatesController)
router.post('/create-template', verifyToken, allowedRoles('tec-admin', true, 'Template criado'), createTemplateController)
router.post('/send-template-message', verifyToken, allowedRoles('tec-admin', true, 'Mensagem de template enviada'), sendTemplateMessageController)
router.put('/edit-template', verifyToken, allowedRoles('tec-admin', true, 'Template editado'), editTemplateController)
router.delete('/delete-template/:wa_id/:template_name', verifyToken, allowedRoles('tec-admin', true, 'Template deletado'), deleteTemplateController)

module.exports = router