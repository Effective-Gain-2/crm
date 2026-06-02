const express = require('express');
const { signupController } = require('../controllers/SignupController');
const router = express.Router();

// Público (autenticado por x-crm-service-key, não por JWT)
router.post('/', signupController);

module.exports = router;
