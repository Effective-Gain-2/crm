const express = require('express');
const router = express.Router();
const AjudaController = require('../controllers/AjudaController');
const { verifyToken } = require('../controllers/UserController');
const { allowedRoles } = require('../middlewares/RequireUser');

router.get('/textos', verifyToken, allowedRoles(), AjudaController.getAjudaTextos);
router.post('/texto', verifyToken, allowedRoles('tec-admin', true, 'Texto de ajuda atualizado'), AjudaController.updateAjudaTexto);

module.exports = router;