-- Chat interno: mensagens diretas (DM) entre usuários e mensagens de fila
-- (grupo). recipient_type='user' -> recipient_id é o id do usuário destino;
-- recipient_type='queue' -> recipient_id é o id da fila (todos os membros veem).
-- As tabelas também são criadas defensivamente em runtime pelo
-- InternalChatService (ensureInternalChatTables), pois schemas existentes não
-- rodam estas migrations automaticamente.
CREATE TABLE IF NOT EXISTS internal_messages (
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

CREATE INDEX IF NOT EXISTS idx_intmsg_dm ON internal_messages (recipient_type, recipient_id, sender_id);
CREATE INDEX IF NOT EXISTS idx_intmsg_created ON internal_messages (created_at);
