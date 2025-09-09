const express = require('express');
const { createKanbanStageController, createMessageForBlastController, getFunisController, getKanbanStagesController, getChatsInKanbanController, changeKanbanStageController, updateStageNameController, createFunilController, deleteEtapaController, getCustomFieldsController, transferAllChatsToStage, deleteFunilController, getContactsInKanbanStageController, transferAllContactsToStage, changeKanbanPreferenceController, getKanbanPreferenceController } = require('../controllers/KanbanController');
const router = express.Router();

router.post('/create-kanban', createKanbanStageController);
router.post('/message-blast', createMessageForBlastController)
router.get('/get-funis/:schema', getFunisController),
router.get('/get-stages/:funil/:schema', getKanbanStagesController)
router.get('/get-cards/:sector/:schema', getChatsInKanbanController)
router.get('/get-custom-fields/:schema', getCustomFieldsController)
router.put('/change-stage', changeKanbanStageController)
router.put('/update-stage-name', updateStageNameController)
router.put('/transfer-all-chats', transferAllChatsToStage)
router.put('/transfer-all-contacts', transferAllContactsToStage);
router.put('/change-preference', changeKanbanPreferenceController)
router.post('/create-funil', createFunilController)
router.delete('/delete-stage', deleteEtapaController)
router.delete('/delete-funil/:sector/:schema', deleteFunilController)
router.get('/get-contacts-in-stage/:stage/:schema', getContactsInKanbanStageController);
router.get('/get-preference/:sector/:schema', getKanbanPreferenceController)
module.exports = router;