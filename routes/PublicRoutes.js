const express = require('express');
const { verifyAPIKey } = require('../config/ApiKey');
const router = express.Router();
const { createReceitaController, getReceitasController } = require('../controllers/ReceitaController');

router.post('/create-receita', verifyAPIKey, createReceitaController)
router.get('/get-receita/:schema', verifyAPIKey, getReceitasController)
module.exports = router;    