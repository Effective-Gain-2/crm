const express = require('express');
const { createConnectionController, setQueueController, getAllConnectionsController, deleteConnectionController, searchConnByIdController, getAllConnectionsWithStatusController, deleteApiOfcDataController } = require('../controllers/ConnectionController');
const router = express.Router();

router.get('/get-all-connections/:schema', getAllConnectionsController)
router.get('/get-all-connections-status/:schema', getAllConnectionsWithStatusController)
router.get('/search-conn-by-id/:connection_id/:schema', searchConnByIdController)
router.post('/create', createConnectionController)
router.post('/setConnQueue', setQueueController)
router.delete('/delete/:connection_id/:instanceName/:schema', deleteConnectionController)
router.delete('/delete-api-ofc-data/:phone_id/:schema', deleteApiOfcDataController)

module.exports = router;