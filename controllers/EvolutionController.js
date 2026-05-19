const { v4: uuidv4 } = require('uuid');
const { createInstance, fetchInstanceEvo, sendTextMessage, generateQrCode } = require('../requests/evolution');
const Connections = require('../entities/Connection');
const { createConnection, fetchInstance, searchConnById } = require('../services/ConnectionService');
const { saveMessage, updateMessageChat } = require('../services/MessageService');
const { Message } = require('../entities/Message');
const { getCurrentTimestamp } = require('../services/getCurrentTimestamp');
const { updateCacheMessages, disableBotIfActive } = require('../services/ChatService');
const { tag: tagOutboundSource } = require('../services/MessageSourceTracker');
const { sendMessageApiOfc } = require('../services/ChatApiOfc');
const { getApiConnections } = require('../services/ApiConnection');

const createInstanceController = async (req, res) => {
    try {
        const { instanceName, number } = req.body;
        const schema = req.schema

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
        const schema = req.schema || 'effective_gain';

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
        const { body, user_id, chatId, isApi, text, number, instanceId } = req.body;
        const schema = req.schema;
        let instance;
        isApi?instance=await getApiConnections(instanceId, schema):instance = await searchConnById(instanceId, schema);
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
            result = await sendMessageApiOfc(instance.phone_id, number, text, schema);
            return res.status(200).json({success:true})
        }
        // console.log(result)
        if (!result) {
            return res.status(500).json({ error: 'Erro ao enviar mensagem: resposta inválida do serviço.' });
        }

        // Tag a mensagem como 'crm_web' ANTES do echo do Evolution chegar no
        // webhook /chat — assim o handler distingue de envio direto pelo
        // celular ou do bot.
        if (result?.key?.id) {
            await tagOutboundSource(result.key.id, 'crm_web');
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

        await updateMessageChat(chatId, message, schema);
        await saveMessage(chatId, message, schema, user_id, 'crm_web');

        if (chatId) {
            const updatedChat = await disableBotIfActive(chatId, schema);
            if (updatedChat && global.socketIoServer) {
                global.socketIoServer.to(`schema_${schema}`).emit('chats_updated', updatedChat);
                if (updatedChat.assigned_user) {
                    global.socketIoServer
                        .to(`user_${updatedChat.assigned_user}`)
                        .emit('chats_updated', updatedChat);
                }
            }
        }

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