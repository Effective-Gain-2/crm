const express = require('express');
const {transferQueueController, createQueueController, getUserQueuesController, getAllQueuesControllers, deleteQueueController, getQueueByIdController, updateQueueController, updateUserQueuesController, setQueueUsersController, getQueueConnectionsController, setQueueConnectionsController, toggleWebhookStatusController, updateWebhookUrlController, getUsersInQueueController } = require('../controllers/QueueController');
const { requireRole } = require('../middlewares/requireRole');

const router = express.Router();

// Configurar fila é trabalho de gestão: líder, master e técnico (hierarquia em auth.js:
// tecnico 4 > master 3 > lider 2). Operacional e visualizador só LEEM as filas — as rotas
// GET ficam abertas porque Chats, transferência e Kanban dependem delas para funcionar.
const gestorDeFila = requireRole('lider');

router.post('/create-queue', gestorDeFila, createQueueController)
router.get('/get-user-queue/:userId/:schema', getUserQueuesController)
router.get('/get-all-queues/:schema', getAllQueuesControllers)
router.delete('/delete-queue/:queueId/:schema', gestorDeFila, deleteQueueController)
router.get('/get-conn-queues/:queue_id/:schema', getQueueByIdController)
router.post('/transfer-queue', transferQueueController)
router.put('/update-queue', gestorDeFila, updateQueueController)
router.post('/update-user-queues', gestorDeFila, updateUserQueuesController)
router.put('/set-queue-users', gestorDeFila, setQueueUsersController)
router.get('/get-queue-connections/:queue_id/:schema', getQueueConnectionsController)
router.put('/set-queue-connections', gestorDeFila, setQueueConnectionsController)
router.put('/update-webhook-url', gestorDeFila, updateWebhookUrlController)
router.put('/toggle-webhook-status', gestorDeFila, toggleWebhookStatusController)
router.get('/get-users-in-queue/:queue_id/:schema', getUsersInQueueController)
module.exports = router 