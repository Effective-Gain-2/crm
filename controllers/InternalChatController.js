const path = require('path')
const fs = require('fs')
const multer = require('multer')
const { v4: uuidv4 } = require('uuid')
const {
    saveMessage,
    getDirectMessages,
    getQueueMessages,
    getContacts,
} = require('../services/InternalChatService')

// Anexos do chat interno ficam num subdiretório próprio dentro de uploads.
const uploadDir = path.join(__dirname, '..', 'uploads', 'internal-chat')
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    // Prefixo uuid pra evitar colisão e tornar o nome não-adivinhável.
    filename: (req, file, cb) => cb(null, `${uuidv4()}_${file.originalname}`),
})
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } })

// Roteia a mensagem pelas salas de socket que o front já entra em Index.jsx:
// DM -> user_<id> (remetente e destinatário), fila -> fila_<id>.
const emitMessage = (msg, schema) => {
    const io = global.socketIoServer
    if (!io) return
    if (msg.recipient_type === 'queue') {
        io.to(`fila_${msg.recipient_id}`).emit('internal_message', msg)
    } else {
        io.to(`user_${msg.recipient_id}`).emit('internal_message', msg)
        io.to(`user_${msg.sender_id}`).emit('internal_message', msg)
    }
}

const sendMessageController = async (req, res) => {
    try {
        const schema = req.schema
        const sender_id = req.user_id
        const { recipient_type, recipient_id, body, file_url, file_name, mimetype } = req.body

        if (!recipient_type || !recipient_id) {
            return res.status(400).json({ error: 'recipient_type e recipient_id são obrigatórios' })
        }
        if (!['user', 'queue'].includes(recipient_type)) {
            return res.status(400).json({ error: 'recipient_type inválido' })
        }
        if (!body && !file_url) {
            return res.status(400).json({ error: 'Mensagem vazia' })
        }

        const msg = await saveMessage(
            { sender_id, recipient_type, recipient_id, body, file_url, file_name, mimetype },
            schema
        )
        emitMessage(msg, schema)
        res.status(201).json(msg)
    } catch (error) {
        console.error('Erro ao enviar mensagem interna:', error)
        res.status(500).json({ error: 'Erro ao enviar mensagem' })
    }
}

const getContactsController = async (req, res) => {
    try {
        const schema = req.schema
        const result = await getContacts(req.user_id, schema)
        res.status(200).json(result)
    } catch (error) {
        console.error('Erro ao buscar contatos do chat interno:', error)
        res.status(500).json({ error: 'Erro ao buscar contatos' })
    }
}

const getDirectMessagesController = async (req, res) => {
    try {
        const schema = req.schema
        const { otherUserId } = req.params
        const result = await getDirectMessages(req.user_id, otherUserId, schema)
        res.status(200).json(result)
    } catch (error) {
        console.error('Erro ao buscar mensagens diretas:', error)
        res.status(500).json({ error: 'Erro ao buscar mensagens' })
    }
}

const getQueueMessagesController = async (req, res) => {
    try {
        const schema = req.schema
        const { queueId } = req.params
        const result = await getQueueMessages(queueId, schema)
        res.status(200).json(result)
    } catch (error) {
        console.error('Erro ao buscar mensagens da fila:', error)
        res.status(500).json({ error: 'Erro ao buscar mensagens' })
    }
}

const uploadFileController = async (req, res) => {
    try {
        const file = req.file
        if (!file) return res.status(400).json({ error: 'Nenhum arquivo enviado' })
        res.status(200).json({
            file_url: `/api/internal-chat/file/${encodeURIComponent(file.filename)}`,
            file_name: file.originalname,
            mimetype: file.mimetype,
        })
    } catch (error) {
        console.error('Erro no upload do chat interno:', error)
        res.status(500).json({ error: 'Erro no upload' })
    }
}

const serveFileController = (req, res) => {
    // Bloqueia path traversal: só aceita o basename.
    const filename = path.basename(req.params.filename)
    const filePath = path.join(uploadDir, filename)
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Arquivo não encontrado' })
    }
    res.sendFile(filePath)
}

module.exports = {
    upload,
    sendMessageController,
    getContactsController,
    getDirectMessagesController,
    getQueueMessagesController,
    uploadFileController,
    serveFileController,
}
