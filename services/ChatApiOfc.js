const pool = require("../db/queries")
const { v4: uuid4 } = require('uuid');
const axios = require('axios');
const { json } = require("express");
const fs = require('fs');
const { getApiConnections } = require("./ApiConnection");
require('dotenv').config({ path: '../.env' });


const createApiOfcChat = async (chat_id, connection_id, number, name, queue_id, user_id, status, created_at, updated_at, is_bot_on, thread_id, schema) => {
    const chatExists = await pool.query(
        `SELECT * FROM ${schema}.api_ofc_chats WHERE number = $1 and status <> 'closed'`, [number]
    )
    if (chatExists.rows.length > 0) {
        return chatExists.rows[0]
    } else {
        const result = await pool.query(
            `INSERT INTO ${schema}.api_ofc_chats (id, chat_id, connection_id, number, name, queue_id, user_id, status, created_at, updated_at, is_bot_on, thread_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
            [uuid4(), chat_id, connection_id, number, name, queue_id, user_id, status, created_at, updated_at, is_bot_on, thread_id]
        )
        return result.rows[0]
    }
}

const getApiChats = async (schema) => {
    const result = await pool.query(
        `SELECT * FROM ${schema}.api_ofc_chats WHERE status <> 'closed'`
    )
    result.rows = result.rows.map(row => ({
        ...row,
        isApi: true
    }))
    return result.rows
}

const setApiChatQueue = async (chat_id, schema) => {
    const chat = await pool.query(
        `SELECT * FROM ${schema}.api_ofc_chats WHERE id=$1`,
        [chat_id]
    )
    if (!chat || chat.rowCount === 0) {
        return;
    }
    const connection = await pool.query(
        `SELECT * FROM ${schema}.connections WHERE id=$1`,
        [chat.rows[0].connection_id]
    )
    const result = await pool.query(
        `UPDATE ${schema}.api_ofc_chats SET queue_id=$1 WHERE id=$2 RETURNING *`,
        [connection.rows[0].queue_id, chat_id]
    )
    return (result.rows[0]
    )
}

const sendMessageApiOfc = async (connection, contact_number, body, schema) => {
    const token = await getApiConnections(connection, schema)
    if (!body || typeof body !== 'string' || !body.trim()) {
        throw new Error("O parâmetro 'body' do texto é obrigatório e deve ser uma string não vazia.");
    }
    try {
        const result = await axios.post(`https://graph.facebook.com/v23.0/${connection}/messages`, {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: '557588821124',
            type: "text",
            text: {
                body: body
            }
        }, {
            headers: {
                "Authorization": `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
                "Content-Type": "application/json"
            }
        });
        return result.data;
    } catch (error) {
        console.error('Erro ao enviar mensagem API OFC:', error);
        console.log(error.response?.data.messages)
    }
}

const getImageApiOfc = async (id) => {
    try {
        const meta = await axios.get(`https://graph.facebook.com/v21.0/${id}`, {
            headers: {
                Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`
            }
        });

        const url = meta.data.url;
        if (!url) throw new Error('No media URL returned from Graph API');

        const res = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`
            },
            responseType: 'arraybuffer'
        });

        const contentType = res.headers['content-type'] || 'image/jpeg';
        const buffer = Buffer.from(res.data, 'binary');
        const base64 = buffer.toString('base64');

    return `data:${contentType};base64,${base64}`;
    } catch (err) {
        console.error('getImageApiOfc error:', err.response.data);
        throw err;
    }
};

module.exports = {
    createApiOfcChat,
    getApiChats,
    setApiChatQueue,
    sendMessageApiOfc,
    getImageApiOfc
}