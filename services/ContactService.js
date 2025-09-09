const pool = require('../db/queries');
const { v4: uuidv4 } = require('uuid');
const { createNewChat } = require('./ChatService');

const createCustomField = async(fieldName, graph, schema)=>{
    const result = await pool.query(
        `INSERT INTO ${schema}.custom_fields (id, field_name, label, graph) VALUES ($1, $2, $3, $4) RETURNING *`,
        [uuidv4(), fieldName.toLowerCase().replace(/\s+/g, '_'), fieldName.charAt(0).toUpperCase()+fieldName.slice(1), graph]
    );	
    return result.rows[0];
}

const insertValueCustomField = async(fieldName, contactNumber, value, schema)=>{
    const field = await pool.query(
        `SELECT * FROM ${schema}.custom_fields WHERE field_name = $1`,
        [fieldName.toLowerCase().replace(/\s+/g, '_')]
    );
    if(field.rows.length === 0){
        throw new Error('Campo não encontrado')
    }
    const fieldId = field.rows[0].id;
    const result = await pool.query(
        `INSERT INTO ${schema}.contact_custom_values (id, contact_number, field_id, value)VALUES ($1, $2, $3, $4) ON CONFLICT (contact_number, field_id) DO NOTHING RETURNING *;`,
        [uuidv4(), contactNumber, fieldId, value]
    );
    return result.rows[0];
}
const getCustomFieldsByContact = async (contact_number, schema) => {
    const result = await pool.query(`SELECT * FROM ${schema}.contact_custom_values WHERE contact_number=$1`,[contact_number])

    return result.rows
}
const getChatsForUser = async (userId, schema) => {
  const result = await pool.query(
    `SELECT * FROM ${schema}.chats WHERE assigned_user = $1 OR $1 IN (SELECT id FROM ${schema}.users WHERE permission = 'admin')`,
    [userId]
  );
  return result.rows;
};
const createContact = async(contactNumber, contactName, connection, user_id, schema)=>{
    try {
        // 1. Verificar se o contato já existe
        const existingContact = await pool.query(
            `SELECT * FROM ${schema}.contacts WHERE number = $1`,
            [contactNumber]
        );

        let contactResult;
        
        // 2. Se o contato não existe, criar
        if (existingContact.rowCount === 0) {
            contactResult = await pool.query(
                `INSERT INTO ${schema}.contacts (number, contact_name) VALUES ($1, $2) RETURNING *`,
                [contactNumber, contactName]
            );
        } else {
            contactResult = existingContact;
        }

        // 3. Buscar a conexão
        const connectionId = await pool.query(
            `SELECT * FROM ${schema}.connections WHERE name = $1`,
            [connection]
        );

        if (connectionId.rowCount === 0) {
            throw new Error('Conexão não encontrada');
        }

        // 4. Verificar se existe chat ativo para este contato e conexão
        const existingChat = await pool.query(
            `SELECT * FROM ${schema}.chats 
             WHERE contact_phone = $1 AND connection_id = $2 AND status != 'closed'
             ORDER BY created_at DESC`,
            [contactNumber, connectionId.rows[0].id]
        );

        let chatResult;

        // 5. Se existe chat ativo, usar ele
        if (existingChat.rowCount > 0) {
            chatResult = existingChat.rows[0];
        } else {
            chatResult = await createNewChat(contactName, contactNumber, connectionId.rows[0].id, connectionId.rows[0].queue_id, user_id, schema);
            global.socketIoServer.to(`user_${user_id}`).emit('chats_updated', chatResult)
        }
        
        return {
            contact: contactResult.rows[0],
            chat: chatResult,
            isNewContact: existingContact.rowCount === 0,
            isNewChat: existingChat.rowCount === 0
        };
    } catch (error) {
        console.error('Erro ao criar contato:', error);
        throw error;
    }
}

const updateContactName = async(number, name, schema)=>{
    try {
        const result = await pool.query(
            `UPDATE ${schema}.contacts set contact_name=$1 where number=$2`,[name, number]
        )
        return result
    } catch (error) {
        console.error(error)
    }
}

const changeKanbanPreference = async (sector, label, color, schema) => {
    const kanbanExists = await pool.query(`SELECT * FROM ${schema}.preferences_kanban WHERE sector=$1`, [sector])
    if(kanbanExists.rowCount>0){
        const result = await pool.query(`UPDATE ${schema}.preferences_kanban SET label=$1, color=$2 WHERE sector=$3 RETURNING *`, [label, color, sector])
        return result.rows[0]
    }else{
        const result = await pool.query(`INSERT INTO ${schema}.preferences_kanban(sector, label, color) VALUES($1,$2,$3) RETURNING *`,[sector, label, color])
        return result.rows[0]
    }
}

const getKanbanPreference = async (sector, schema) => {
    const result = await pool.query(`SELECT * FROM ${schema}.preferences_kanban WHERE sector=$1 LIMIT 1`, [sector]);
    return result.rows[0] || null;
};




module.exports = { 
    createCustomField, 
    insertValueCustomField,
    createContact,
    updateContactName,
    getChatsForUser,
    getCustomFieldsByContact,
    changeKanbanPreference,
    getKanbanPreference
};