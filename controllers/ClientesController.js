const ClientesService = require('../services/ClientesService');

const createCliente = async (req, res) => {
  try {
    const { nome, numero, email, idade} = req.body;
    const schema = req.schema
    if (!schema) {
      return res.status(400).json({ success: false, message: "Schema é obrigatório" });
    }
    const cliente = await ClientesService.createCliente({ nome, numero, email, idade }, schema);
    return res.status(201).json({ success: true, data: cliente });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getAllClientes = async (req, res) => {
  try {
    const schema = req.schema;
    const clientes = await ClientesService.getAllClientes(schema);
    return res.json({ success: true, data: clientes });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getClienteById = async (req, res) => {
  try {
    const { id} = req.params;
    const schema = req.schema
    const cliente = await ClientesService.getClienteById(id, schema);
    if (!cliente) return res.status(404).json({ success: false, message: "Cliente não encontrado" });
    return res.json({ success: true, data: cliente });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, numero, email, idade } = req.body;
    const schema = req.schema;
    if (!schema) {
      return res.status(400).json({ success: false, message: "Schema é obrigatório" });
    }
    const cliente = await ClientesService.updateCliente(id, { nome, numero, email, idade }, schema);
    return res.json({ success: true, data: cliente });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteCliente = async (req, res) => {
  try {
    const { id} = req.params;
    const schema = req.schema
    await ClientesService.deleteCliente(id, schema);
    return res.json({ success: true, message: "Cliente removido com sucesso" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createCliente,
  getAllClientes,
  getClienteById,
  updateCliente,
  deleteCliente
};