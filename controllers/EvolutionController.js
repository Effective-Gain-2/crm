const { createInstance, connectInstance, getConnectionState, sendTextMessage } = require('../requests/evolution');
const { hibernateOnHumanSend } = require('../services/AiAgentService');
const Connections = require('../entities/Connection');
const { createConnection, searchConnById } = require('../services/ConnectionService');
const { saveMessage } = require('../services/MessageService');
const { Message } = require('../entities/Message');

// Nome da instância na Evolution: prefixado com o schema.
// Garante unicidade global entre empresas E permite resolver o schema do webhook em O(1).
const instanceNameFor = (schema, name) => `${schema}__${String(name).trim().replace(/\s+/g, '_')}`;

// POST /evo/instance — cria a instância + conexão local e devolve o QR
const createInstanceController = async (req, res) => {
    try {
        const { instanceName, number } = req.body;
        const schema = req.auth.schema;
        if (!instanceName || !number) {
            return res.status(400).json({ error: 'Nome e número são obrigatórios' });
        }
        // Só master/técnico gerenciam conexões
        if (req.auth.role !== 'master' && req.auth.role !== 'tecnico') {
            return res.status(403).json({ error: 'Apenas master pode criar conexões' });
        }

        const evoName = instanceNameFor(schema, instanceName);
        const result = await createInstance({ instanceName: evoName, number });

        const conn = new Connections(result.instance.instanceId, evoName, number);
        await createConnection(conn, schema);

        res.status(201).json({ result, connection_name: evoName });
    } catch (error) {
        console.error('Erro ao criar instancia:', error.message);
        // Devolve a causa real (antes: erro genérico e a causa só no log)
        res.status(502).json({ error: `Erro ao criar instância: ${error.message}` });
    }
};

// GET /evo/qr/:connectionId — QR novo / reconectar instância existente
const getQrController = async (req, res) => {
    try {
        const schema = req.auth.schema;
        if (req.auth.role !== 'master' && req.auth.role !== 'tecnico') {
            return res.status(403).json({ error: 'Apenas master pode reconectar' });
        }
        const instance = await searchConnById(req.params.connectionId, schema);
        if (!instance) return res.status(404).json({ error: 'Conexão não encontrada' });

        const state = await getConnectionState(instance.name);
        if (state === 'open') {
            return res.status(200).json({ connected: true, state });
        }
        const result = await connectInstance(instance.name);
        res.status(200).json({
            connected: false,
            state,
            qrcode: result?.base64 || result?.qrcode?.base64 || null,
        });
    } catch (error) {
        console.error('Erro ao gerar QR:', error.message);
        res.status(502).json({ error: `Erro ao gerar QR: ${error.message}` });
    }
};

// POST /evo/sendText — envio de mensagem pelo atendente (qualquer papel autenticado)
const sendTextMessageController = async (req, res) => {
    try {
        const body = req.body;
        const user_id = req.auth.local_user_id;
        const chatId = body.chatId || body.chat_id;
        const schema = req.auth.schema;

        const instance = await searchConnById(body.instanceId, schema);
        if (!instance) {
            return res.status(404).json({ error: 'Conexão não encontrada' });
        }

        const result = await sendTextMessage(
            instance.name,
            body.text,
            body.number,
            body.replyTo || null
        );

        if (!result || !result.key) {
            return res.status(502).json({ error: 'Erro ao enviar mensagem: resposta inválida da Evolution.' });
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
        message.isQuoted = !!body.replyTo;
        if (body.replyTo) message.quote = body.replyTo;

        await saveMessage(chatId, message, schema, user_id);

        // Handoff: humano assumiu → hiberna o agente de IA para este contato.
        hibernateOnHumanSend(schema, body.number).catch((e) =>
            console.error('AiAgent hibernate erro:', e.message)
        );

        res.status(200).json({ result });
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
};

module.exports = {
    createInstanceController,
    getQrController,
    sendTextMessageController,
    instanceNameFor,
};
