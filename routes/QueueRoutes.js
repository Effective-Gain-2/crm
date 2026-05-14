const express = require('express');
const {transferQueueController, createQueueController, addUserinQueueController, getUserQueuesController, getAllQueuesControllers, deleteQueueController, getQueueByIdController, updateUserQueuesController, toggleWebhookStatusController, updateWebhookUrlController, getUsersInQueueController, updateQueueController, updateAssistantController } = require('../controllers/QueueController');
const { verifyToken } = require('../controllers/UserController');
const { allowedRoles } = require('../middlewares/RequireUser');

const router = express.Router();

router.post('/create-queue', verifyToken, allowedRoles('tec-admin', true, 'Fila criada'), createQueueController)
router.post('/addUser', verifyToken, allowedRoles('tec-admin', true, 'Usuário adicionado à fila'), addUserinQueueController)
router.get('/get-user-queue/:userId/:schema', verifyToken, allowedRoles(), getUserQueuesController)
router.get('/get-all-queues/:schema', verifyToken, allowedRoles(), getAllQueuesControllers)
router.delete('/delete-queue/:queueId/:schema', verifyToken, allowedRoles('tec-admin', true, 'Fila deletada'), deleteQueueController)
router.get('/get-conn-queues/:queue_id/:schema', verifyToken, allowedRoles(), getQueueByIdController)
router.post('/transfer-queue',verifyToken, allowedRoles(null, true, 'Chat transferido de fila'), transferQueueController)
router.post('/update-user-queues',verifyToken, allowedRoles('tec-admin', true, 'Usuário atualizado na fila'), updateUserQueuesController)
router.put('/update-queue', verifyToken, allowedRoles('tec-admin', true, 'Fila atualizada'), updateQueueController)
router.put('/update-webhook-url', verifyToken, allowedRoles('tec-admin', true, 'URL do webhook atualizada'), updateWebhookUrlController)
router.put('/toggle-webhook-status', verifyToken, allowedRoles('tec-admin', true, 'Status do webhook alterado'), toggleWebhookStatusController)
router.put('/update-queue-assistant', verifyToken, allowedRoles('tec-admin', true, 'Assistente da fila atualizado'), updateAssistantController)
router.get('/get-users-in-queue/:queue_id/:schema', verifyToken, allowedRoles(), getUsersInQueueController)
module.exports = router 