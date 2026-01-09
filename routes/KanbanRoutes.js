const express = require('express');
const { createKanbanStageController, createMessageForBlastController, getFunisController, getKanbanStagesController, getChatsInKanbanController, changeKanbanStageController, updateStageNameController, createFunilController, deleteEtapaController, getCustomFieldsController, transferAllChatsToStage, deleteFunilController, getContactsInKanbanStageController, transferAllContactsToStage, changeKanbanPreferenceController, getKanbanPreferenceController, transferChatToKanbanStageController } = require('../controllers/KanbanController');
const { allowedRoles } = require('../middlewares/RequireUser');
const { verifyToken } = require('../controllers/UserController');
const router = express.Router();

router.post('/create-kanban', verifyToken, allowedRoles('tec-admin', true, 'Etapa criada no kanban'), createKanbanStageController);
router.post('/message-blast', verifyToken, allowedRoles('tec-admin'), createMessageForBlastController)
router.get('/get-funis/:schema', verifyToken, allowedRoles(), getFunisController),
router.get('/get-stages/:funil/:schema', verifyToken, allowedRoles(), getKanbanStagesController)
router.get('/get-cards/:sector/:schema', verifyToken, allowedRoles(), getChatsInKanbanController)
router.get('/get-custom-fields/:schema', verifyToken, allowedRoles(), getCustomFieldsController)
router.put('/change-stage', verifyToken, allowedRoles(null, true, 'Etapa do kanban alterada'), changeKanbanStageController)
router.put('/update-stage-name', verifyToken, allowedRoles('tec-admin', true, 'Nome da etapa atualizado'), updateStageNameController)
router.put('/transfer-all-chats', verifyToken, allowedRoles('tec-admin', true, 'Todos os chats transferidos para outra etapa'), transferAllChatsToStage)
router.put('/transfer-all-contacts', verifyToken, allowedRoles('tec-admin', true, 'Todos os contatos transferidos para outra etapa'), transferAllContactsToStage);
router.put('/change-preference', verifyToken, allowedRoles(), changeKanbanPreferenceController)
router.post('/create-funil', verifyToken, allowedRoles('tec-admin', true, 'Funil criado'), createFunilController)
router.delete('/delete-stage', verifyToken, allowedRoles('tec-admin', true, 'Etapa deletada'), deleteEtapaController)
router.delete('/delete-funil/:sector/:schema', verifyToken, allowedRoles('tec-admin', true, 'Funil deletado'), deleteFunilController)
router.get('/get-contacts-in-stage/:stage/:schema', verifyToken, allowedRoles(), getContactsInKanbanStageController);
router.get('/get-preference/:sector/:schema', verifyToken, allowedRoles(), getKanbanPreferenceController)
router.post('/transfer-chat-to-stage', verifyToken, allowedRoles(), transferChatToKanbanStageController)
module.exports = router;