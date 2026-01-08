const express = require('express');
const {transferQueueController, createQueueController, addUserinQueueController, getUserQueuesController, getAllQueuesControllers, deleteQueueController, getQueueByIdController, updateUserQueuesController, toggleWebhookStatusController, updateWebhookUrlController, getUsersInQueueController, updateQueueController, updateAssistantController } = require('../controllers/QueueController');
const { verifyToken } = require('../controllers/UserController');
const { allowedRoles } = require('../middlewares/RequireUser');

const router = express.Router();

router.post('/create-queue', verifyToken, allowedRoles('tec-admin'), createQueueController)
router.post('/addUser', allowedRoles('tec-admin'), addUserinQueueController)
router.get('/get-user-queue/:userId/:schema', verifyToken, allowedRoles(), getUserQueuesController)
router.get('/get-all-queues/:schema', verifyToken, allowedRoles(), getAllQueuesControllers)
router.delete('/delete-queue/:queueId/:schema', verifyToken, allowedRoles('tec-admin'), deleteQueueController)
router.get('/get-conn-queues/:queue_id/:schema', verifyToken, allowedRoles(), getQueueByIdController)
router.post('/transfer-queue',verifyToken, allowedRoles(), transferQueueController)
router.post('/update-user-queues',verifyToken, allowedRoles('tec-admin'), updateUserQueuesController)
router.put('/update-queue', verifyToken, allowedRoles('tec-admin'), updateQueueController)
router.put('/update-webhook-url', verifyToken, allowedRoles('tec-admin'), updateWebhookUrlController)
router.put('/toggle-webhook-status', verifyToken, allowedRoles('tec-admin'), toggleWebhookStatusController)
router.put('/update-queue-assistant', verifyToken, allowedRoles('tec-admin'), updateAssistantController)
router.get('/get-users-in-queue/:queue_id/:schema', verifyToken, allowedRoles(), getUsersInQueueController)
module.exports = router 