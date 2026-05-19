const pool = require('../db/queries')
const { Message } = require('../entities/Message');

// Schemas antigos podem estar sem colunas adicionadas depois da provisão
// inicial. Garante idempotentemente que existam antes do INSERT/UPDATE.
const ensureMessagesColumns = async (schema) => {
    await pool.query(`ALTER TABLE ${schema}.messages ADD COLUMN IF NOT EXISTS user_id text`);
    await pool.query(`ALTER TABLE ${schema}.messages ADD COLUMN IF NOT EXISTS message_type text`);
    await pool.query(`ALTER TABLE ${schema}.messages ADD COLUMN IF NOT EXISTS base64 text`);
    await pool.query(`ALTER TABLE ${schema}.messages ADD COLUMN IF NOT EXISTS isquoted boolean`);
    await pool.query(`ALTER TABLE ${schema}.messages ADD COLUMN IF NOT EXISTS quote_id text`);
    await pool.query(`ALTER TABLE ${schema}.messages ADD COLUMN IF NOT EXISTS filename text`);
    await pool.query(`ALTER TABLE ${schema}.messages ADD COLUMN IF NOT EXISTS mimetype text`);
    await pool.query(`ALTER TABLE ${schema}.messages ADD COLUMN IF NOT EXISTS source text`);
};

const saveMessage = async (chatId, message, schema, user_id, source = null) => {
    if (!(message instanceof Message)) {
        message = new Message(
            message.id,
            message.body || message.message,
            message.from_me ?? true,
            chatId,
            message.created_at || message.createdAt || message.timestamp
        );
    }

    let createdAt = message.getCreatedAt();
    if (typeof createdAt === 'number' && createdAt < 20000000000) {
        createdAt = createdAt * 1000;
    }

    const doInsert = async () => pool.query(
        `INSERT INTO ${schema}.messages(id, body, from_me, chat_id, created_at, user_id, source) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
         [
            message.getId(),
            message.getMessage(),
            message.getFromMe(),
            chatId,
            createdAt,
            user_id,
            source
        ]
    );

    try {
        const result = await doInsert();
        return result.rows[0];
    } catch (err) {
        // Coluna ausente em schema antigo — provisiona e tenta de novo.
        if (err && err.code === '42703') {
            await ensureMessagesColumns(schema);
            const retry = await doInsert();
            return retry.rows[0];
        }
        throw err;
    }
};
const updateMessageChat = async (chat_id, message, schema) => {
  const newMessagesArray = [message.body];

  await pool.query(
    `UPDATE ${schema}.chats
     SET messages = $1::jsonb, last_user_message = $3
     WHERE id = $2`,
    [JSON.stringify(newMessagesArray), chat_id, new Date().getTime()]
  );
};
module.exports ={
    saveMessage,
    updateMessageChat
}