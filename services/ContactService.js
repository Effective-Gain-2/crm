const pool = require('../db/queries');
const { v4: uuidv4 } = require('uuid');
const { createNewChat } = require('./ChatService');

const createCustomField = async(fieldName, schema)=>{
    const result = await pool.query(
        `INSERT INTO ${schema}.custom_fields (id, field_name, label) VALUES ($1, $2, $3) RETURNING *`,
        [uuidv4(), fieldName.toLowerCase().replace(/\s+/g, '_'), fieldName]
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

const createContact = async(contactNumber, contactName, connection, user_id, schema)=>{
    const result = await pool.query(
        `INSERT INTO ${schema}.contacts (number, contact_name) VALUES ($1, $2) RETURNING *`,
        [contactNumber, contactName]
    );
    const connectionId = await pool.query(
        `SELECT * FROM ${schema}.connections WHERE name = $1`,
        [connection]
    );
    const chat = await createNewChat(contactName, contactNumber, connectionId.rows[0].id,connectionId.rows[0].queue_id, user_id, schema)
    
    return result.rows[0];
}

const updateContactName = async(number, name, schema)=>{
    console.log(number, name)
    try {
        const result = await pool.query(
            `UPDATE ${schema}.contacts set contact_name=$1 where number=$2`,[name, number]
        )
        console.log(result)
        return result
    } catch (error) {
        console.error(error)
    }
}

module.exports = { 
    createCustomField, 
    insertValueCustomField,
    createContact,
    updateContactName
};