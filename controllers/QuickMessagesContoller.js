const { createQuickMessage, getAllQuickMessages, getQuickMessageById, updateQuickMessage, deleteQuickMessage, getAllQuickMessagesByUser } = require('../services/QuickMessagesService');

const getAllQuickMessagesController = async (req, res) => {
  const { schema } = req.params;
  
  try {
    const result = await getAllQuickMessages(schema);
    res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error("Erro ao buscar mensagens rápidas:", error.message);
    res.status(500).json({ error: 'Erro ao buscar mensagens rápidas' });
  }
};

const getQuickMessageByIdController = async (req, res) => {
  const { quick_message_id, schema } = req.params;
  
  try {
    const result = await getQuickMessageById(quick_message_id, schema);
    
    if (!result) {
      return res.status(404).json({ error: 'Mensagem rápida não encontrada' });
    }
    
    res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error("Erro ao buscar mensagem rápida:", error.message);
    res.status(500).json({ error: 'Erro ao buscar mensagem rápida' });
  }
};

const createQuickMessageController = async (req, res) => {
  try {
    const { type, queue_id, user_id, message, is_command_on, shortcut, schema } = req.body;
    
    if (!type || !user_id || !message || !shortcut || !schema) {
      return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
    }
    
    const result = await createQuickMessage(type, queue_id, user_id, message, is_command_on, shortcut, schema);
    
    res.status(201).json({
      success: true,
      result: result
    });
  } catch (error) {
    console.error("Erro ao criar mensagem rápida:", error.message);
    res.status(500).json({ error: 'Erro ao criar mensagem rápida' });
  }
};

const updateQuickMessageController = async (req, res) => {
  try {
    const { quick_message_id, type, queue_id, message, shortcut, schema } = req.body;
    
    if (!quick_message_id || !message || !shortcut || !schema) {
      return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
    }
    
    const result = await updateQuickMessage(quick_message_id, type, queue_id, message, shortcut, schema);
    
    if (!result) {
      return res.status(404).json({ error: 'Mensagem rápida não encontrada' });
    }
    
    res.status(200).json({
      success: true,
      result: result
    });
  } catch (error) {
    console.error("Erro ao atualizar mensagem rápida:", error.message);
    res.status(500).json({ error: 'Erro ao atualizar mensagem rápida' });
  }
};

const deleteQuickMessageController = async (req, res) => {
  try {
    const { quick_message_id, schema } = req.params;
    
    if (!quick_message_id || !schema) {
      return res.status(400).json({ error: 'ID da mensagem e schema são obrigatórios' });
    }
    
    await deleteQuickMessage(quick_message_id, schema);
    
    res.status(200).json({
      success: true,
      message: 'Mensagem rápida excluída com sucesso'
    });
  } catch (error) {
    console.error("Erro ao excluir mensagem rápida:", error.message);
    res.status(500).json({ error: 'Erro ao excluir mensagem rápida' });
  }
};

const getAllQuickMessagesByUserController = async (req, res) => {
  try {
    const { user_id, schema } = req.params;
    
    if (!user_id || !schema) {
      return res.status(400).json({ error: 'ID do usuário e schema são obrigatórios' });
    }
    
    const result = await getAllQuickMessagesByUser(user_id, schema);
    
    res.status(200).json({
      success: true,
      result: result
    });
  } catch (error) {
    console.error("Erro ao buscar mensagens rápidas do usuário:", error.message);
    res.status(500).json({ error: 'Erro ao buscar mensagens rápidas do usuário' });
  }
};

module.exports = {
  getAllQuickMessagesController,
  getQuickMessageByIdController,
  createQuickMessageController,
  updateQuickMessageController,
  deleteQuickMessageController,
  getAllQuickMessagesByUserController
}; 