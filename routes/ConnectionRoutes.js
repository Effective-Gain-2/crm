const express = require('express');
const { createConnectionController, setQueueController, getAllConnectionsController, deleteConnectionController } = require('../controllers/ConnectionController');
const router = express.Router();

router.post('/create', createConnectionController)
router.post('/setConnQueue', setQueueController)
router.get('/get-all-connections/:schema', getAllConnectionsController)
router.delete('/delete/:connection_id/:instanceName/:schema', deleteConnectionController)

module.exports = router;