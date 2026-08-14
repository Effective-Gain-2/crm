const { Users } = require('../entities/Users');
const { v4: uuidv4 } = require('uuid');
const { createUser } = require('./UserService');
const pool = require('../db/queries');

// Nome de schema permitido (minúsculo, começa com letra, só [a-z0-9_], até 41 chars).
// Barreira contra SQL injection — schema é interpolado nas queries.
const SCHEMA_RE = /^[a-z][a-z0-9_]{1,40}$/;
const assertValidSchema = (schema) => {
    if (!SCHEMA_RE.test(schema || '')) {
        throw new Error(`Nome de schema inválido: ${schema}`);
    }
};

// ÚNICA fonte de verdade do shape de um tenant.
// Idempotente: todas as tabelas com IF NOT EXISTS + colunas evolutivas com ADD COLUMN IF NOT EXISTS.
// Usada por: createCompany (schema novo), updateSchema (schema existente) e scripts/migrate_all.js.
const ensureSchemaTables = async (schema) => {
    assertValidSchema(schema);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.users (
            id UUID PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            password TEXT NOT NULL,
            permission TEXT,
            online BOOLEAN DEFAULT false,
            sector text
        );`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.chats (
            id UUID PRIMARY KEY,
            chat_id TEXT,
            connection_id TEXT,
            queue_id UUID,
            isGroup BOOLEAN,
            contact_name TEXT,
            assigned_user TEXT,
            status TEXT,
            created_at BIGINT,
            messages JSONB,
            contact_phone text,
            etapa_id uuid,
            updated_time bigint,
            unreadmessages boolean,
            isboton boolean DEFAULT true
        );`);
    await pool.query(`ALTER TABLE ${schema}.chats ADD COLUMN IF NOT EXISTS isboton boolean DEFAULT true;`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.queues(
            id UUID PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            color TEXT,
            users JSONB,
            distribution boolean,
            superuser uuid REFERENCES ${schema}.users(id) ON DELETE SET NULL
        );`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.connections (
            id UUID PRIMARY KEY,
            name TEXT NOT NULL,
            number TEXT NOT NULL,
            queue_id uuid
        );`);
    // Status da conexão WhatsApp (connected/disconnected/connecting) + unicidade do nome da instância
    await pool.query(`ALTER TABLE ${schema}.connections ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'disconnected';`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_${schema}_connections_name ON ${schema}.connections (name);`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.messages (
            id text PRIMARY KEY,
            body TEXT,
            from_me BOOLEAN,
            chat_id UUID,
            created_at BIGINT,
            message_type text,
            base64 text,
            isquoted boolean,
            quote_id text
        );`);
    await pool.query(`ALTER TABLE ${schema}.messages ADD COLUMN IF NOT EXISTS user_id uuid;`);
    // Autor real da mensagem (essencial em grupos: quem falou)
    await pool.query(`ALTER TABLE ${schema}.messages ADD COLUMN IF NOT EXISTS participant_name TEXT;`);
    await pool.query(`ALTER TABLE ${schema}.messages ADD COLUMN IF NOT EXISTS participant_jid TEXT;`);
    // Nome do WhatsApp (pushName) vs nome vindo da agenda/manual (is_saved)
    await pool.query(`ALTER TABLE ${schema}.contacts ADD COLUMN IF NOT EXISTS push_name TEXT;`);
    await pool.query(`ALTER TABLE ${schema}.contacts ADD COLUMN IF NOT EXISTS is_saved BOOLEAN DEFAULT false;`);
    // Backfill: isGroup guardava fromMe por um bug de posição de argumento
    await pool.query(`UPDATE ${schema}.chats SET isGroup = (chat_id LIKE '%@g.us');`).catch(() => {});

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.contacts (
            number text not null primary key,
            contact_name text
        );`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.last_assigned_user (
            queue_id UUID REFERENCES ${schema}.queues(id) ON DELETE CASCADE,
            user_id UUID REFERENCES ${schema}.users(id) ON DELETE CASCADE,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (queue_id, user_id)
        );`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.queue_users (
            user_id UUID REFERENCES ${schema}.users(id) ON DELETE CASCADE,
            queue_id UUID REFERENCES ${schema}.queues(id) ON DELETE CASCADE,
            PRIMARY KEY (user_id, queue_id)
        );`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.custom_fields (
            id UUID PRIMARY KEY,
            field_name TEXT NOT NULL,
            label TEXT NOT NULL,
            UNIQUE(field_name),
            graph boolean default false
        );`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.contact_custom_values (
            id UUID PRIMARY KEY,
            contact_number TEXT NOT NULL REFERENCES ${schema}.contacts(number) ON DELETE CASCADE,
            field_id UUID NOT NULL REFERENCES ${schema}.custom_fields(id) ON DELETE CASCADE,
            value TEXT,
            UNIQUE(contact_number, field_id)
        );`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.message_blast(
            id uuid primary key not null,
            value text not null,
            sector text not null,
            campaing_id uuid,
            image text
        );`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.tag(
            id UUID PRIMARY KEY,
            name text NOT NULL,
            color text
        );`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.chat_tag (
            chat_id UUID NOT NULL,
            tag_id UUID NOT NULL,
            PRIMARY KEY (chat_id, tag_id),
            FOREIGN KEY (chat_id) REFERENCES ${schema}.chats(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES ${schema}.tag(id) ON DELETE CASCADE
        );`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.campaing(
            id UUID primary key,
            campaing_name text not null,
            sector text not null,
            kanban_stage UUID not null,
            start_date bigint,
            status text,
            timer bigint,
            min bigint,
            max bigint
        );`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.lembretes(
            id uuid primary key not null,
            lembrete_name text not null,
            tag text,
            message text,
            date bigint,
            icone text,
            user_id uuid references ${schema}.users(id) on delete set null,
            google_event_id text
        );`);
    // Lembrete vinculado a cliente/conversa/oportunidade + ciclo de vida
    await pool.query(`ALTER TABLE ${schema}.lembretes ADD COLUMN IF NOT EXISTS contact_number TEXT;`);
    await pool.query(`ALTER TABLE ${schema}.lembretes ADD COLUMN IF NOT EXISTS chat_id UUID;`);
    await pool.query(`ALTER TABLE ${schema}.lembretes ADD COLUMN IF NOT EXISTS opportunity_id UUID;`);
    await pool.query(`ALTER TABLE ${schema}.lembretes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';`);
    await pool.query(`ALTER TABLE ${schema}.lembretes ADD COLUMN IF NOT EXISTS recurrence TEXT;`);
    await pool.query(`ALTER TABLE ${schema}.lembretes ADD COLUMN IF NOT EXISTS done_at BIGINT;`);
    await pool.query(`ALTER TABLE ${schema}.lembretes ADD COLUMN IF NOT EXISTS created_at BIGINT;`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.lembretes_queues (
            lembrete_id UUID NOT NULL,
            queue_id UUID NOT NULL,
            PRIMARY KEY (lembrete_id, queue_id),
            FOREIGN KEY (lembrete_id) REFERENCES ${schema}.lembretes(id) ON DELETE CASCADE,
            FOREIGN KEY (queue_id) REFERENCES ${schema}.queues(id) ON DELETE CASCADE
        );`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.scheduled_message (
            id UUID PRIMARY KEY,
            message TEXT NOT NULL,
            chat_id UUID NOT NULL REFERENCES ${schema}.chats(id) ON DELETE CASCADE,
            scheduled_date BIGINT NOT NULL
        );`);
    await pool.query(`ALTER TABLE ${schema}.scheduled_message ADD COLUMN IF NOT EXISTS bull_job_id TEXT;`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.user_preferences (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid REFERENCES ${schema}.users(id),
            key text NOT NULL,
            value text,
            CONSTRAINT user_preferences_user_key_unique UNIQUE (user_id, key)
        );`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.quick_messages (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tag text NOT NULL,
            queue_id uuid REFERENCES ${schema}.queues(id) ON DELETE SET NULL,
            user_id uuid REFERENCES ${schema}.users(id) ON DELETE SET NULL,
            value text,
            is_command_on boolean NOT NULL DEFAULT false,
            shortcut text
        );`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.campaing_connections (
            campaing_id UUID NOT NULL,
            connection_id UUID,
            CONSTRAINT unique_pair UNIQUE (campaing_id, connection_id)
        );`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.contacts_stage (
            contact_number text NOT NULL REFERENCES ${schema}.contacts(number) ON DELETE CASCADE,
            stage UUID NOT NULL,
            PRIMARY KEY (contact_number, stage)
        );`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.preferences_kanban (
            sector TEXT primary key NOT NULL,
            label TEXT,
            color TEXT NOT NULL
        );`);

    // Oportunidades (pipeline de vendas — Fonte/Valor/Proprietário por card)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.opportunities (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            contact_number TEXT REFERENCES ${schema}.contacts(number) ON DELETE CASCADE,
            funnel TEXT NOT NULL,
            stage_id UUID,
            title TEXT,
            source TEXT,
            value NUMERIC(12,2) NOT NULL DEFAULT 0,
            owner_id UUID REFERENCES ${schema}.users(id) ON DELETE SET NULL,
            status TEXT NOT NULL DEFAULT 'open',
            score INTEGER NOT NULL DEFAULT 0,
            utm_source TEXT,
            utm_medium TEXT,
            utm_campaign TEXT,
            ad_id TEXT,
            campaign_name TEXT,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now()
        );`);
    await pool.query(`ALTER TABLE ${schema}.opportunities ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0;`);
    await pool.query(`ALTER TABLE ${schema}.opportunities ADD COLUMN IF NOT EXISTS utm_source TEXT;`);
    await pool.query(`ALTER TABLE ${schema}.opportunities ADD COLUMN IF NOT EXISTS utm_medium TEXT;`);
    await pool.query(`ALTER TABLE ${schema}.opportunities ADD COLUMN IF NOT EXISTS utm_campaign TEXT;`);
    await pool.query(`ALTER TABLE ${schema}.opportunities ADD COLUMN IF NOT EXISTS ad_id TEXT;`);
    await pool.query(`ALTER TABLE ${schema}.opportunities ADD COLUMN IF NOT EXISTS campaign_name TEXT;`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_${schema}_opp_funnel_stage ON ${schema}.opportunities (funnel, stage_id);`);
    // Normaliza funil para minúsculo (consistência com pg_tables/kanban_<sector>)
    await pool.query(`UPDATE ${schema}.opportunities SET funnel = lower(funnel) WHERE funnel <> lower(funnel);`);

    // Regras de lead scoring (pontuação por atributo da oportunidade)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.lead_score_rules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            field TEXT NOT NULL,
            operator TEXT NOT NULL,
            value TEXT,
            points INTEGER NOT NULL DEFAULT 0,
            active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMP DEFAULT now()
        );`);

    // Agente de IA (config por tenant — 1 linha "principal")
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.ai_agent_config (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT DEFAULT 'Agente',
            status TEXT NOT NULL DEFAULT 'disabled',
            persona TEXT,
            business_name TEXT,
            knowledge_base TEXT,
            wait_seconds INTEGER NOT NULL DEFAULT 0,
            max_messages INTEGER NOT NULL DEFAULT 10,
            reactivate_seconds INTEGER NOT NULL DEFAULT 0,
            is_principal BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now()
        );`);

    // Estado por conversa (contagem de mensagens do bot + hibernação no handoff)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.ai_agent_sessions (
            contact_number TEXT PRIMARY KEY,
            msg_count INTEGER NOT NULL DEFAULT 0,
            hibernate_until TIMESTAMP,
            updated_at TIMESTAMP DEFAULT now()
        );`);

    // Documentos da base de conhecimento do agente (texto extraído)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.ai_agent_documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            filename TEXT NOT NULL,
            mime TEXT,
            content_text TEXT,
            char_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT now()
        );`);

    // Chaves de API por cliente (controle de custo por empresa) — valores write-only na UI
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.lid_map (
            lid TEXT PRIMARY KEY,
            phone_jid TEXT NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT now()
        );`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.integration_settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_by UUID,
            updated_at TIMESTAMP DEFAULT now()
        );`);

    // Medição de uso de IA por empresa (tokens por resposta do agente)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.ai_usage_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            ts TIMESTAMP DEFAULT now(),
            model TEXT,
            prompt_tokens INTEGER DEFAULT 0,
            completion_tokens INTEGER DEFAULT 0,
            contact_number TEXT
        );`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.chat_contact (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            chat_id UUID NOT NULL REFERENCES ${schema}.chats(id) ON DELETE CASCADE,
            user_id uuid references effective_gain.users(id) on delete set null,
            contact_number TEXT NOT NULL,
            status TEXT,
            custom_field UUID REFERENCES ${schema}.custom_fields(id),
            custom_value TEXT,
            closed_at TIMESTAMP DEFAULT now()
        );`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.status(
            id uuid primary key,
            value text not null,
            success boolean
        );`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.reports (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            chat_id UUID REFERENCES ${schema}.chats(id),
            user_id UUID,
            queue_id UUID,
            categoria TEXT NOT NULL,
            resumo TEXT NOT NULL,
            assertividade TEXT NOT NULL,
            status TEXT NOT NULL,
            proxima_etapa TEXT NOT NULL
        );`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.login_data (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            ip TEXT NOT NULL,
            attempts INTEGER DEFAULT 1,
            last_attempt BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
        );`);

    // Módulo financeiro
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.expenses (
            id UUID PRIMARY KEY,
            user_id UUID REFERENCES ${schema}.users(id) ON DELETE SET NULL,
            vendor_id UUID,
            description TEXT NOT NULL,
            category_id UUID,
            total_amount DECIMAL(10,2) NOT NULL,
            currency TEXT DEFAULT 'BRL',
            date_incurred DATE NOT NULL,
            due_date DATE,
            payment_date DATE,
            payment_method TEXT DEFAULT 'dinheiro',
            status TEXT DEFAULT 'pendente',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.category (
            id UUID PRIMARY KEY,
            category_name TEXT NOT NULL UNIQUE
        );`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.vendors (
            id UUID PRIMARY KEY,
            vendor_name TEXT NOT NULL UNIQUE
        );`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.expense_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            expense_id UUID NOT NULL REFERENCES ${schema}.expenses(id) ON DELETE CASCADE,
            quantity integer NOT NULL DEFAULT 1,
            unit_price bigint NOT NULL,
            subtotal bigint NOT NULL,
            tax_included BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT now()
        );`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.tax_rates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            rate NUMERIC(6,4) NOT NULL,
            type TEXT NOT NULL,
            jurisdiction TEXT NULL,
            is_compound BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT now()
        );`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.expense_item_taxes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            expense_item_id UUID NOT NULL REFERENCES ${schema}.expense_items(id) ON DELETE CASCADE,
            tax_rate_id UUID NOT NULL REFERENCES ${schema}.tax_rates(id),
            base_amount NUMERIC(14,2) NOT NULL,
            tax_amount NUMERIC(14,2) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now()
        );`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.expense_taxes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            expense_id UUID NOT NULL REFERENCES ${schema}.expenses(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            rate NUMERIC(6,4) NOT NULL,
            base_amount NUMERIC(14,2) NOT NULL,
            tax_amount NUMERIC(14,2) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now()
        );`);
};

const createCompany = async (company, schema) => {
    assertValidSchema(schema);
    const superAdminId = uuidv4();
    const superAdminData = company.superAdmin;

    // Verifica se o schema já existe
    const schemaExists = await pool.query(`
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name = $1
    `, [schema]);

    const isNewSchema = schemaExists.rows.length === 0;

    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    await ensureSchemaTables(schema);

    // Super-admin apenas quando informado e ainda inexistente (evita duplicar em re-execução)
    if (superAdminData && superAdminData.email && superAdminData.password) {
        const existing = await pool.query(
            `SELECT id FROM ${schema}.users WHERE lower(email) = lower($1)`,
            [superAdminData.email]
        );
        if (existing.rows.length === 0) {
            const superAdmin = new Users(
                superAdminId,
                superAdminData.name,
                superAdminData.email,
                superAdminData.password,
                'admin'
            );
            await createUser(superAdmin, schema);
        }
    }

    // Só insere na tabela effective_gain.companies se for um schema novo
    if (isNewSchema) {
        await pool.query('INSERT INTO effective_gain.companies (company_name, schema_name) VALUES ($1, $2)', [
            company.name,
            schema
        ]);
        return { message: "Empresa criada com sucesso!" };
    } else {
        return { message: "Tabelas atualizadas no schema existente!" };
    }
};

const updateSchema = async (schema) => {
    try {
        assertValidSchema(schema);
        const schemaExists = await pool.query(`
            SELECT schema_name
            FROM information_schema.schemata
            WHERE schema_name = $1
        `, [schema]);

        if (schemaExists.rows.length === 0) {
            throw new Error('Schema não encontrado');
        }

        await ensureSchemaTables(schema);
        return { message: "Schema atualizado com sucesso! Todas as tabelas foram criadas/verificadas." };
    } catch (error) {
        console.error('Erro ao atualizar schema:', error);
        throw error;
    }
};

const getAllCompanies = async () => {
    // Fonte: registro oficial de tenants (não mais information_schema)
    const result = await pool.query(`SELECT schema_name FROM effective_gain.companies`);
    return result.rows;
};

const getAllCompaniesTecUser = async () => {
    try {
        const result = await pool.query(
            `SELECT * FROM effective_gain.companies`
        );
        return result.rows;
    } catch (error) {
        console.error(error);
        throw new Error("Erro ao buscar empresas");
    }
};

module.exports = { createCompany, getAllCompanies, getAllCompaniesTecUser, updateSchema, ensureSchemaTables, assertValidSchema, SCHEMA_RE };
