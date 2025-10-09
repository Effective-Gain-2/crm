const express = require('express');
const { verifyToken } = require('../controllers/UserController');
const { upsertAjudaTextosController, getAjudaMensagensController } = require('../controllers/AjudaController');
const router = express.Router()

router.get('/get-textos', verifyToken, getAjudaMensagensController)
router.post('/edit-texto', verifyToken, upsertAjudaTextosController)

module.exports = router