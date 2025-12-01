const express = require('express');
const router = express.Router();
const AjudaController = require('../controllers/AjudaController');

router.get('/textos', AjudaController.getAjudaTextos);
router.post('/texto', AjudaController.updateAjudaTexto);

module.exports = router;