const express = require('express');
const { createKanbanStageController, createMessageForBlastController, getFunisController, getKanbanStagesController, getChatsInKanbanController, changeKanbanStageController, updateStageNameController, createFunilController, deleteEtapaController, getCustomFieldsController, transferAllChatsToStage, deleteFunilController, getContactsInKanbanStageController, transferAllContactsToStage, changeKanbanPreferenceController, getKanbanPreferenceController, transferChatToKanbanStageController } = require('../controllers/KanbanController');
const { allowedRoles } = require('../middlewares/RequireUser');
const router = express.Router();

router.post('/create-kanban', allowedRoles('tec-admin'), createKanbanStageController);
router.post('/message-blast', allowedRoles('tec-admin'), createMessageForBlastController)
router.get('/get-funis/:schema', allowedRoles(), getFunisController),
router.get('/get-stages/:funil/:schema', allowedRoles(), getKanbanStagesController)
router.get('/get-cards/:sector/:schema', allowedRoles(), getChatsInKanbanController)
router.get('/get-custom-fields/:schema', allowedRoles(), getCustomFieldsController)
router.put('/change-stage', allowedRoles(), changeKanbanStageController)
router.put('/update-stage-name', allowedRoles('tec-admin'), updateStageNameController)
router.put('/transfer-all-chats', allowedRoles('tec-admin'), transferAllChatsToStage)
router.put('/transfer-all-contacts', allowedRoles('tec-admin'), transferAllContactsToStage);
router.put('/change-preference', allowedRoles(), changeKanbanPreferenceController)
router.post('/create-funil', allowedRoles('tec-admin'), createFunilController)
router.delete('/delete-stage', allowedRoles('tec-admin'), deleteEtapaController)
router.delete('/delete-funil/:sector/:schema', allowedRoles('tec-admin'), deleteFunilController)
router.get('/get-contacts-in-stage/:stage/:schema', allowedRoles(), getContactsInKanbanStageController);
router.get('/get-preference/:sector/:schema', allowedRoles(), getKanbanPreferenceController)
router.post('/transfer-chat-to-stage', allowedRoles(), transferChatToKanbanStageController)
module.exports = router;