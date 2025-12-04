const express = require('express');
const {transferQueueController, createQueueController, addUserinQueueController, getUserQueuesController, getAllQueuesControllers, deleteQueueController, getQueueByIdController, updateUserQueuesController, toggleWebhookStatusController, updateWebhookUrlController, getUsersInQueueController, updateQueueController, updateAssistantController } = require('../controllers/QueueController');
const { verifyToken } = require('../controllers/UserController');
const { allowedRoles } = require('../middlewares/RequireUser');

const router = express.Router();

router.post('/create-queue', allowedRoles('tec-admin'), createQueueController)
router.post('/addUser', allowedRoles('tec-admin'), addUserinQueueController)
router.get('/get-user-queue/:userId/:schema', allowedRoles(), getUserQueuesController)
router.get('/get-all-queues/:schema', allowedRoles(), getAllQueuesControllers)
router.delete('/delete-queue/:queueId/:schema', allowedRoles('tec-admin'), deleteQueueController)
router.get('/get-conn-queues/:queue_id/:schema', allowedRoles(), getQueueByIdController)
router.post('/transfer-queue', allowedRoles(), transferQueueController)
router.post('/update-user-queues', allowedRoles('tec-admin'), updateUserQueuesController)
router.put('/update-queue', allowedRoles('tec-admin'), updateQueueController)
router.put('/update-webhook-url', allowedRoles('tec-admin'), updateWebhookUrlController)
router.put('/toggle-webhook-status', allowedRoles('tec-admin'), toggleWebhookStatusController)
router.put('/update-queue-assistant', verifyToken, allowedRoles('tec-admin'), updateAssistantController)
router.get('/get-users-in-queue/:queue_id/:schema', allowedRoles(), getUsersInQueueController)
module.exports = router 