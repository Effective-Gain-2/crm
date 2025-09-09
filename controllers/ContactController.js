const { updateChatNameByNumber } = require('../services/ChatService');
const { createCustomField, insertValueCustomField, createContact, updateContactName, getCustomFieldsByContact } = require('../services/ContactService');

const createCustomFieldController = async (req, res) => {
    const { fieldName, graph } = req.body;
    const schema = req.body.schema;
    try {
        const result = await createCustomField(fieldName, graph, schema);
        res.status(201).json(result);
    } catch (error) {
        console.error("Erro ao criar campo personalizado:", error);
        res.status(500).json({ error: 'Erro ao criar campo personalizado' });
    }
};

const insertValueCustomFieldController = async (req, res) => {
    const { fieldName, contactNumber, value } = req.body;
    const schema = req.body.schema ;
    try {
        const result = await insertValueCustomField(fieldName, contactNumber, value, schema);
        res.status(201).json(result);
    } catch (error) {
        console.error("Erro ao inserir valor no campo personalizado:", error.message);
        res.status(500).json({ error: 'Erro ao inserir valor no campo personalizado' });
    }
};

const createContactController = async (req, res) => {
    const { name, number, connection, user_id } = req.body;
    const schema = req.body.schema ;
    try {
        const result = await createContact(number, name, connection, user_id, schema);
        
        if (result.isNewChat) {
            global.socketIoServer.to(`user_${result.chat.assignated_user}`).emit('chats_updated', result.chat);
        }
        
        res.status(201).json({
            success: true,
            data: result,
            message: `Contato ${result.isNewContact ? 'criado' : 'encontrado'} e chat ${result.isNewChat ? 'criado' : 'reutilizado'} com sucesso`
        });
    }
    catch (error) {
        console.error("Erro ao criar contato:", error);
        res.status(500).json({ error: error.message || 'Erro ao criar contato' });
    }
}
const updateContactNameController = async(req, res)=>{
    try {
        const {name, number, user_id, schema} = req.body
        const result = await updateContactName(number, name, schema)
        const chatname = updateChatNameByNumber(number, name, user_id, schema)
        res.status(200).json({
            result
        })
    } catch (error) {
        console.error(error)
    }
}
const getCustomFieldsByContactController = async (req, res) => {
    const {contact_number, schema} = req.params
    try {
        const result = await getCustomFieldsByContact(contact_number, schema)
        res.status(200).json({
            success:true,
            result
        })
    } catch (error) {
        console.error(error)
        res.status(400).json({
            success:false
        })
    }
}
const deleteCustomFields = async (custom_field_id, schema) => {
    
}
module.exports = {
    createCustomFieldController,
    insertValueCustomFieldController,
    createContactController,
    updateContactNameController,
    getCustomFieldsByContactController
 };