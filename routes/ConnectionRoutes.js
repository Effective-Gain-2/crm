const express = require('express');
const { createConnectionController, setQueueController, getAllConnectionsController, deleteConnectionController, searchConnByIdController } = require('../controllers/ConnectionController');
const router = express.Router();

router.get('/get-all-connections/:schema', getAllConnectionsController)
router.get('/search-conn-by-id/:connection_id/:schema', searchConnByIdController)
router.post('/create', createConnectionController)
router.post('/setConnQueue', setQueueController)
router.delete('/delete/:connection_id/:instanceName/:schema', deleteConnectionController)

module.exports = router;