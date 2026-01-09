const express = require('express');
const router = express.Router();
const { createCliente, getAllClientes, getClienteById, updateCliente, deleteCliente } = require('../controllers/ClientesController');
const { verifyToken } = require('../controllers/UserController');
const { allowedRoles } = require('../middlewares/RequireUser');

router.post('/', verifyToken, allowedRoles('tec-admin', true, 'Cliente criado'), createCliente);
router.get('/get-all/:schema', verifyToken, allowedRoles(), getAllClientes);
router.get('/get/:id/:schema', verifyToken, allowedRoles(),getClienteById);
router.put('/:id', verifyToken, allowedRoles('tec-admin', true, 'Cliente atualizado'), updateCliente);
router.delete('/:id/:schema', verifyToken, allowedRoles('tec-admin', true, 'Cliente deletado'), deleteCliente);

module.exports = router;