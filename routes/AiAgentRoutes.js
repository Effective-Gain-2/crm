const express = require('express');
const { getConfigController, updateConfigController } = require('../controllers/AiAgentController');

const router = express.Router();

router.get('/config/:schema', getConfigController);
router.put('/config', updateConfigController);

module.exports = router;
