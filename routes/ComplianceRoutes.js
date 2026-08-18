const express = require('express');
const { statusController, bloqueiosController, configurarController } = require('../controllers/ComplianceController');
const { verifyToken } = require('../controllers/UserController');
const router = express.Router();

router.get('/status/:schema', verifyToken, statusController);
router.get('/bloqueios/:schema', verifyToken, bloqueiosController);
router.post('/configurar', verifyToken, configurarController);

module.exports = router;
