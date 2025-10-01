const { v4: uuidv4 } = require('uuid');
const { createInstance, fetchInstanceEvo, sendTextMessage, generateQrCode } = require('../requests/evolution');
const Connections = require('../entities/Connection');
const { createConnection, fetchInstance, searchConnById } = require('../services/ConnectionService');
const { saveMessage } = require('../services/MessageService');
const { Message } = require('../entities/Message');
const { getCurrentTimestamp } = require('../services/getCurrentTimestamp');
const { updateCacheMessages } = require('../services/ChatService');
const { sendMessageApiOfc } = require('../services/ChatApiOfc');

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
        const { body, user_id, chatId, schema, isApi, text, number, instanceId } = req.body;

        const instance = await searchConnById(instanceId, schema);

        if (!instance) {
            return res.status(404).json({ error: 'Conexão não encontrada' });
        }

        // const payload = {
        //     text: text,
        //     number:number,
        //     replyTo: body.replyTo || null,
        // };
        let result = null
        if (!isApi) {
            result = await sendTextMessage(
                instance.name,
                text,
                number,
            );
        } else {
            console.log('req.body:', req.body);
            result = await sendMessageApiOfc(instance.name, number, text);
        }
        // console.log(result)
        if (!result) {
            return res.status(500).json({ error: 'Erro ao enviar mensagem: resposta inválida do serviço.' });
        }

        const message = new Message(
            result.key.id,
            text,
            result.key.fromMe,
            result.key.remoteJid,
            Date.now(),
            null, null
        );
        await updateCacheMessages(result.key.id, chatId, result.key.fromMe, text, getCurrentTimestamp(), 'conversation', null, user_id, null, null)
        message.isQuoted = null;

        // if (body.replyTo) {
        //     message.quote = body.replyTo;
        // }

        await saveMessage(chatId, message, schema, user_id);

        res.status(200).json({ result });
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
};

const generateQrCodeController = async (req, res) => {
    const { instance } = req.params
    try {
        const result = await generateQrCode(instance)
        res.status(200).json({
            success: true,
            data: result
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({
            success: false,
            message: 'Erro ao gerar QR Code, favor entrar em contato com suporte'
        })
    }
}

module.exports = {
    createInstanceController,
    fetchInstanceController,
    sendTextMessageController,
    generateQrCodeController
};