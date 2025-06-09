const { updateChatNameByNumber } = require('../services/ChatService');
const { createCustomField, insertValueCustomField, createContact, updateContactName } = require('../services/ContactService');

const createCustomFieldController = async (req, res) => {
    const { fieldName } = req.body;
    const schema = req.body.schema || 'effective_gain';
    try {
        const result = await createCustomField(fieldName, schema);
        res.status(201).json(result);
    } catch (error) {
        console.error("Erro ao criar campo personalizado:", error.message);
        res.status(500).json({ error: 'Erro ao criar campo personalizado' });
    }
};

const insertValueCustomFieldController = async (req, res) => {
    const { fieldName, contactNumber, value } = req.body;
    const schema = req.body.schema || 'effective_gain';
    console.log('Schema recebido:', schema);

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
    const schema = req.body.schema || 'effective_gain';
    try {
        const result = await createContact(number, name, connection, user_id, schema);
        res.status(201).json(result);
    }
    catch (error) {
        console.error("Erro ao criar contato:", error);
        res.status(500).json({ error: 'Erro ao criar contato' });
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
module.exports = {
    createCustomFieldController,
    insertValueCustomFieldController,
    createContactController,
    updateContactNameController
 };