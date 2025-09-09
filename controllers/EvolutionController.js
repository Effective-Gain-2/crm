const { v4: uuidv4 } = require('uuid');
const { createInstance, fetchInstanceEvo, sendTextMessage } = require('../requests/evolution');
const Connections = require('../entities/Connection');
const { createConnection, fetchInstance, searchConnById } = require('../services/ConnectionService');
const { saveMessage } = require('../services/MessageService');
const { Message } = require('../entities/Message');
const { getCurrentTimestamp } = require('../services/getCurrentTimestamp');

const createInstanceController = async (req, res) => {
    try {
        const { instanceName, number } = req.body;
        const schema = req.body.schema

        const result = await createInstance({
            instanceName: instanceName,
            number: number,
        });
        const conn = new Connections(result.instance.instanceId, instanceName, number);
        const ress = await createConnection(conn, schema);

        res.status(201).json({
            result,
        });
    } catch (error) {
        console.error("Erro ao criar instancia:", error);
        res.status(500).json({ error: 'Erro ao criar instancia' });
    }
};

const fetchInstanceController = async (req, res) => {
    try {
        const schema = req.query.schema || 'effective_gain';

        const instances = await fetchInstance(schema);

        if (!instances.length) {
            return res.status(404).json({ message: 'Nenhuma instância encontrada' });
        }

        const instanceName = instances[0].name;
        const result = await fetchInstanceEvo(instanceName);

        res.status(200).json({ result });
    } catch (error) {
        console.error('Erro ao buscar instâncias:', error.message);
        res.status(500).json({ error: 'Erro ao buscar instâncias' });
    }
};

const sendTextMessageController = async (req, res) => {
    try {
        const body = req.body;
        const user_id = req.body.user_id || req.user_id;
        const chatId = body.chatId || body.chat_id;
        const schema = body.schema || 'effective_gain';

        const instance = await searchConnById(body.instanceId, schema);

        if (!instance) {
            return res.status(404).json({ error: 'Conexão não encontrada' });
        }

        const payload = {
            text: body.text,
            number: body.number,
            replyTo: body.replyTo || null, 
        };

        const result = await sendTextMessage(
            instance.name,
            payload.text,
            payload.number,
            body.replyTo
        );

        if (!result || !result.key) {
            return res.status(500).json({ error: 'Erro ao enviar mensagem: resposta inválida do serviço.' });
        }

        const message = new Message(
            result.key.id,
            body.text,
            result.key.fromMe,
            result.key.remoteJid,
            Date.now(),
            body.replyTo || null,
            body.replyTo ? true : false
        );

        message.isQuoted = body.replyTo ? true : false;

        if (body.replyTo) {
            message.quote = body.replyTo;
        }

        await saveMessage(chatId, message, schema, user_id);

        res.status(200).json({ result });
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
};

module.exports = {
    createInstanceController,
    fetchInstanceController,
    sendTextMessageController,
};