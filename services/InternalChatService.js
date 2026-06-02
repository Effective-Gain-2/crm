const pool = require('../db/queries')

// Garante a tabela de chat interno no schema do tenant. Segue o padrao
// defensivo do resto do código (CREATE TABLE IF NOT EXISTS em runtime),
// já que migrations não rodam automaticamente em schemas existentes.
const ensureInternalChatTables = async (schema) => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.internal_messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sender_id UUID NOT NULL,
            recipient_type TEXT NOT NULL CHECK (recipient_type IN ('user','queue')),
            recipient_id UUID NOT NULL,
            body TEXT,
            file_url TEXT,
            file_name TEXT,
            mimetype TEXT,
            created_at BIGINT NOT NULL
        );
    `)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_intmsg_dm ON ${schema}.internal_messages (recipient_type, recipient_id, sender_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_intmsg_created ON ${schema}.internal_messages (created_at)`)
}

// Persiste uma mensagem e devolve já com o nome do remetente embutido
// (o front usa pra exibir o autor em conversas de fila).
const saveMessage = async ({ sender_id, recipient_type, recipient_id, body, file_url, file_name, mimetype }, schema) => {
    await ensureInternalChatTables(schema)
    const created_at = Date.now()
    const result = await pool.query(
        `INSERT INTO ${schema}.internal_messages
            (sender_id, recipient_type, recipient_id, body, file_url, file_name, mimetype, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [sender_id, recipient_type, recipient_id, body || null, file_url || null, file_name || null, mimetype || null, created_at]
    )
    const msg = result.rows[0]
    const sender = await pool.query(`SELECT name FROM ${schema}.users WHERE id=$1`, [sender_id])
    msg.sender_name = sender.rows[0]?.name || null
    return msg
}

// Histórico de uma conversa direta (DM) entre dois usuários.
const getDirectMessages = async (userId, otherUserId, schema) => {
    await ensureInternalChatTables(schema)
    const result = await pool.query(
        `SELECT m.*, u.name AS sender_name
           FROM ${schema}.internal_messages m
           JOIN ${schema}.users u ON u.id = m.sender_id
          WHERE m.recipient_type = 'user'
            AND ((m.sender_id = $1 AND m.recipient_id = $2)
              OR (m.sender_id = $2 AND m.recipient_id = $1))
          ORDER BY m.created_at ASC`,
        [userId, otherUserId]
    )
    return result.rows
}

// Histórico de uma conversa de fila (grupo).
const getQueueMessages = async (queueId, schema) => {
    await ensureInternalChatTables(schema)
    const result = await pool.query(
        `SELECT m.*, u.name AS sender_name
           FROM ${schema}.internal_messages m
           JOIN ${schema}.users u ON u.id = m.sender_id
          WHERE m.recipient_type = 'queue' AND m.recipient_id = $1
          ORDER BY m.created_at ASC`,
        [queueId]
    )
    return result.rows
}

// Lista de contatos do picker: todos os usuários (menos eu) + as filas que
// eu pertenço (cada fila funciona como um grupo).
const getContacts = async (userId, schema) => {
    await ensureInternalChatTables(schema)
    const usersResult = await pool.query(
        `SELECT id, name, sector, online FROM ${schema}.users WHERE id <> $1 ORDER BY name`,
        [userId]
    )
    const queuesResult = await pool.query(
        `SELECT q.id, q.name, q.color
           FROM ${schema}.queue_users qu
           JOIN ${schema}.queues q ON q.id = qu.queue_id
          WHERE qu.user_id = $1
          ORDER BY q.name`,
        [userId]
    )
    return { users: usersResult.rows, queues: queuesResult.rows }
}

module.exports = {
    ensureInternalChatTables,
    saveMessage,
    getDirectMessages,
    getQueueMessages,
    getContacts,
}
