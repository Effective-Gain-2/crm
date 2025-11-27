const express = require('express');
const router = express.Router();
const { createCliente, getAllClientes, getClienteById, updateCliente, deleteCliente } = require('../controllers/ClientesController');
const { verifyToken } = require('../controllers/UserController');

router.post('/', verifyToken, createCliente);
router.get('/get-all/:schema', verifyToken, getAllClientes);
router.get('/get/:id/:schema', verifyToken, getClienteById);
router.put('/:id', verifyToken, updateCliente);
router.delete('/:id/:schema', verifyToken, deleteCliente);

module.exports = router;