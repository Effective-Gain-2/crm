const { Users } = require('../entities/Users');
const { v4: uuidv4 } = require('uuid');
const { createUser } = require('./UserService');
const  pool  = require('../db/queries'); 

const createCompany = async (company, schema) => {
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
              unreadmessages boolean
            );
          `);
        await pool.query(`CREATE TABLE IF NOT EXISTS ${schema}.queues(
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
            );
          `);
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
        );
        `);
        
        // Adicionar colunas filename e mimetype se não existirem
        try {
          await pool.query(`ALTER TABLE ${schema}.messages ADD COLUMN IF NOT EXISTS filename text`);
          await pool.query(`ALTER TABLE ${schema}.messages ADD COLUMN IF NOT EXISTS mimetype text`);
        } catch (error) {
          console.log('Colunas filename e mimetype já existem ou erro ao adicionar:', error.message);
        }
        
        await pool.query(`
             CREATE TABLE IF NOT EXISTS ${schema}.contacts (
             number text not null primary key,
             contact_name text
             )
            `)
        await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.last_assigned_user (
            queue_id UUID REFERENCES ${schema}.queues(id) ON DELETE CASCADE,
            user_id UUID REFERENCES ${schema}.users(id) ON DELETE CASCADE,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (queue_id, user_id)
        );
        `);
    
        await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.queue_users (
            user_id UUID REFERENCES ${schema}.users(id) ON DELETE CASCADE,
            queue_id UUID REFERENCES ${schema}.queues(id) ON DELETE CASCADE,
            PRIMARY KEY (user_id, queue_id)
        );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${schema}.custom_fields (
            id UUID PRIMARY KEY,
            field_name TEXT NOT NULL,
            label TEXT NOT NULL,
            UNIQUE(field_name),
            graph boolean default false
            );
            `)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${schema}.contact_custom_values (id UUID PRIMARY KEY,
            contact_number TEXT NOT NULL REFERENCES ${schema}.contacts(number) ON DELETE CASCADE,
            field_id UUID NOT NULL REFERENCES ${schema}.custom_fields(id) ON DELETE CASCADE,
            value TEXT,
            UNIQUE(contact_number, field_id)
            );
        `)
        await pool.query(`
            create table IF NOT EXISTS ${schema}.message_blast(
            id uuid primary key not null,
            value text not null,
            sector text not null,
            campaing_id uuid,
            image text
            )
        `)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${schema}.tag(
            id UUID PRIMARY KEY,
            name text NOT NULL,
            color text
            );

            `)
        await pool.query(
            `CREATE TABLE IF NOT EXISTS ${schema}.chat_tag (
            chat_id UUID NOT NULL,
            tag_id UUID NOT NULL,
            PRIMARY KEY (chat_id, tag_id),
            FOREIGN KEY (chat_id) REFERENCES ${schema}.chats(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES ${schema}.tag(id) ON DELETE CASCADE
            );`
        )
        await pool.query(`
            create table IF NOT EXISTS ${schema}.campaing(
            id UUID primary key,
            campaing_name text not null,
            sector text not null,
            kanban_stage UUID not null,
            start_date bigint,
            status text,
            timer bigint,
            min bigint,
            max bigint
            )
            `)
        await pool.query(
            `create table IF NOT EXISTS ${schema}.lembretes(
            id uuid primary key not null,
            lembrete_name text not null,
            tag text,
            message text,
            date bigint,
            icone text,
            user_id uuid references ${schema}.users(id) on delete set null,
            google_event_id text
            )`
        )
        await pool.query(`
                CREATE TABLE IF NOT EXISTS ${schema}.lembretes_queues (
                lembrete_id UUID NOT NULL,
                queue_id UUID NOT NULL,
                PRIMARY KEY (lembrete_id, queue_id),
                FOREIGN KEY (lembrete_id) REFERENCES ${schema}.lembretes(id) ON DELETE CASCADE,
                FOREIGN KEY (queue_id) REFERENCES ${schema}.queues(id) ON DELETE CASCADE
                )`
        );
        await pool.query(
            `CREATE TABLE IF NOT EXISTS ${schema}.scheduled_message (
            id UUID PRIMARY KEY,
            message TEXT NOT NULL,
            chat_id UUID NOT NULL REFERENCES ${schema}.chats(id) ON DELETE CASCADE,
            scheduled_date BIGINT NOT NULL
            );`
        )
        await pool.query(`CREATE TABLE IF NOT EXISTS ${schema}.user_preferences (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES ${schema}.users(id),
        key text NOT NULL,
        value text,
        CONSTRAINT user_preferences_user_key_unique UNIQUE (user_id, key)
        );`)

        await pool.query(`CREATE TABLE IF NOT EXISTS ${schema}.quick_messages (
                    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                    tag text NOT NULL,
                    queue_id uuid REFERENCES ${schema}.queues(id) ON DELETE SET NULL,
                    user_id uuid REFERENCES ${schema}.users(id) ON DELETE SET NULL,
                    value text,
                    is_command_on boolean NOT NULL DEFAULT false,
                    shortcut text
        );`)
        await pool.query(`CREATE TABLE IF NOT EXISTS ${schema}.campaing_connections (
                    campaing_id UUID NOT NULL,
                    connection_id UUID,
                    CONSTRAINT unique_pair UNIQUE (campaing_id, connection_id)
        );`)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${schema}.contacts_stage (
            contact_number text NOT NULL REFERENCES ${schema}.contacts(number) ON DELETE CASCADE,
            stage UUID NOT NULL,
            PRIMARY KEY (contact_number, stage)
            );
        `)
        await pool.query(`
            CREATE TABLE ${schema}.preferences_kanban (
            sector TEXT primary key NOT NULL,
            label TEXT,
            color TEXT NOT NULL
            );
        `)
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
            );
        `)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${schema}.status(
            id uuid primary key,
            value text not null,
            success boolean
            )    
        `)
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
            );
        `)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${schema}.login_data (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            ip TEXT NOT NULL,
            attempts INTEGER DEFAULT 1,
            last_attempt BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
            );
        `)

        // Tabelas para o módulo financeiro
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
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${schema}.category (
                id UUID PRIMARY KEY,
                category_name TEXT NOT NULL UNIQUE
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${schema}.vendors (
                id UUID PRIMARY KEY,
                vendor_name TEXT NOT NULL UNIQUE
            );
        `);
        
        await pool.query(
            `CREATE TABLE ${schema}.expense_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            expense_id UUID NOT NULL REFERENCES ${schema}.expenses(id) ON DELETE CASCADE,
            quantity integer NOT NULL DEFAULT 1,
            unit_price bigint NOT NULL,
            subtotal bigint NOT NULL,
            tax_included BOOLEAN NOT NULL DEFAULT FALSE, 
            created_at TIMESTAMPTZ DEFAULT now()
            );`
        )

        await pool.query(
            `CREATE TABLE ${schema}.tax_rates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL, -- ex: "ICMS 18%", "ISS 5%"
            rate NUMERIC(6,4) NOT NULL, -- ex: 0.18 para 18%
            type TEXT NOT NULL, -- ex: ICMS, ISS, PIS, COFINS, IRRF
            jurisdiction TEXT NULL, -- ex: estado, município, federal
            is_compound BOOLEAN NOT NULL DEFAULT FALSE, -- se compõe sobre outro imposto
            created_at TIMESTAMPTZ DEFAULT now()
            );`
        )

        await pool.query(
            `CREATE TABLE ${schema}.expense_item_taxes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            expense_item_id UUID NOT NULL REFERENCES ${schema}.expense_items(id) ON DELETE CASCADE,
            tax_rate_id UUID NOT NULL REFERENCES ${schema}.tax_rates(id),
            base_amount NUMERIC(14,2) NOT NULL, -- sobre o que o imposto é calculado
            tax_amount NUMERIC(14,2) NOT NULL, -- valor do imposto
            created_at TIMESTAMPTZ DEFAULT now()
            );`
        )

        await pool.query(`
            CREATE TABLE ${schema}.expense_taxes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            expense_id UUID NOT NULL REFERENCES ${schema}.expenses(id) ON DELETE CASCADE,
            name TEXT NOT NULL, -- ex: "Retenção de INSS"
            rate NUMERIC(6,4) NOT NULL,
            base_amount NUMERIC(14,2) NOT NULL,
            tax_amount NUMERIC(14,2) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now()
            );
            `)
            await pool.query(`
            create table${schema}.campaing_chats(chat_id uuid, campaing_id uuid, created_at bigint)
            `)


    const superAdmin = new Users(
        superAdminId,
        superAdminData.name,
        superAdminData.email,
        superAdminData.password,
        'admin'
    );

    await createUser(superAdmin, schema);

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
        // Verifica se o schema existe
        const schemaExists = await pool.query(`
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name = $1
        `, [schema]);

        if (schemaExists.rows.length === 0) {
            throw new Error('Schema não encontrado');
        }

        // Cria todas as tabelas se não existirem
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
              unreadmessages boolean
            );
          `);
        
        await pool.query(`CREATE TABLE IF NOT EXISTS ${schema}.queues(
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
            );
          `);
        
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
        );
        `);
        
        // Adicionar colunas filename e mimetype se não existirem
        try {
          await pool.query(`ALTER TABLE ${schema}.messages ADD COLUMN IF NOT EXISTS filename text`);
          await pool.query(`ALTER TABLE ${schema}.messages ADD COLUMN IF NOT EXISTS mimetype text`);
        } catch (error) {
          console.log('Colunas filename e mimetype já existem ou erro ao adicionar:', error.message);
        }
        
        await pool.query(`
             CREATE TABLE IF NOT EXISTS ${schema}.contacts (
             number text not null primary key,
             contact_name text
             )
            `)
        
        await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.last_assigned_user (
            queue_id UUID REFERENCES ${schema}.queues(id) ON DELETE CASCADE,
            user_id UUID REFERENCES ${schema}.users(id) ON DELETE CASCADE,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (queue_id, user_id)
        );
        `);
    
        await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.queue_users (
            user_id UUID REFERENCES ${schema}.queues(id) ON DELETE CASCADE,
            queue_id UUID REFERENCES ${schema}.queues(id) ON DELETE CASCADE,
            PRIMARY KEY (user_id, queue_id)
        );
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${schema}.custom_fields (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                field_name TEXT NOT NULL,
                field_type TEXT NOT NULL,
                field_value TEXT,
                chat_id UUID REFERENCES ${schema}.chats(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${schema}.quick_messages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                value TEXT NOT NULL,
                shortcut TEXT,
                tag TEXT,
                queue_id UUID REFERENCES ${schema}.queues(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${schema}.tags (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL UNIQUE,
                color TEXT DEFAULT '#007bff',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${schema}.chat_tags (
                chat_id UUID REFERENCES ${schema}.chats(id) ON DELETE CASCADE,
                tag_id UUID REFERENCES ${schema}.tags(id) ON DELETE CASCADE,
                PRIMARY KEY (chat_id, tag_id)
            );
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${schema}.user_preferences (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES ${schema}.users(id) ON DELETE CASCADE,
                key TEXT NOT NULL,
                value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, key)
            );
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${schema}.login_data (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            ip TEXT NOT NULL,
            attempts INTEGER DEFAULT 1,
            last_attempt BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
            );
        `)

        // Tabelas para o módulo financeiro
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
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${schema}.category (
                id UUID PRIMARY KEY,
                category_name TEXT NOT NULL UNIQUE
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${schema}.vendors (
                id UUID PRIMARY KEY,
                vendor_name TEXT NOT NULL UNIQUE
            );
        `);
        
        await pool.query(
            `CREATE TABLE IF NOT EXISTS ${schema}.expense_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            expense_id UUID NOT NULL REFERENCES ${schema}.expenses(id) ON DELETE CASCADE,
            quantity integer NOT NULL DEFAULT 1,
            unit_price bigint NOT NULL,
            subtotal bigint NOT NULL,
            tax_included BOOLEAN NOT NULL DEFAULT FALSE, 
            created_at TIMESTAMPTZ DEFAULT now()
            );`
        )

        await pool.query(
            `CREATE TABLE IF NOT EXISTS ${schema}.tax_rates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL, -- ex: "ICMS 18%", "ISS 5%"
            rate NUMERIC(6,4) NOT NULL, -- ex: 0.18 para 18%
            type TEXT NOT NULL, -- ex: ICMS, ISS, PIS, COFINS, IRRF
            jurisdiction TEXT NULL, -- ex: estado, município, federal
            is_compound BOOLEAN NOT NULL DEFAULT FALSE, -- se compõe sobre outro imposto
            created_at TIMESTAMPTZ DEFAULT now()
            );`
        )

        await pool.query(
            `CREATE TABLE IF NOT EXISTS ${schema}.expense_item_taxes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            expense_item_id UUID NOT NULL REFERENCES ${schema}.expense_items(id) ON DELETE CASCADE,
            tax_rate_id UUID NOT NULL REFERENCES ${schema}.tax_rates(id),
            base_amount NUMERIC(14,2) NOT NULL, -- sobre o que o imposto é calculado
            tax_amount NUMERIC(14,2) NOT NULL, -- valor do imposto
            created_at TIMESTAMPTZ DEFAULT now()
            );`
        )

        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${schema}.expense_taxes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            expense_id UUID NOT NULL REFERENCES ${schema}.expenses(id) ON DELETE CASCADE,
            name TEXT NOT NULL, -- ex: "Retenção de INSS"
            rate NUMERIC(6,4) NOT NULL,
            base_amount NUMERIC(14,2) NOT NULL,
            tax_amount NUMERIC(14,2) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now()
            );
            `)

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
            );
        `)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${schema}.status(
            id uuid primary key,
            value text not null,
            success boolean
            )    
        `)
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
            );
        `)
        await pool.query(`
            create table ${schema}.campaing_chats(chat_id uuid, campaing_id uuid, created_at bigint)
            `)
            
        await pool.query(`alter table ${schema}.messages add column user_id uuid`)

        return { message: "Schema atualizado com sucesso! Todas as tabelas foram criadas/verificadas." };
    } catch (error) {
        console.error('Erro ao atualizar schema:', error);
        throw error;
    }
};

const getAllCompanies = async () => {
    const result = await pool.query(`
        SELECT schema_name 
        FROM information_schema.schemata
        WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'public')
    `);
    return result.rows;
};
const getAllCompaniesTecUser = async () => {
    try{
        const result = await pool.query(
            `SELECT * FROM effective_gain.companies`
        )
        return result.rows
    }catch(error){
        console.error(error)
        throw new Error("Erro ao buscar empresas")
    }
}
module.exports = { createCompany, getAllCompanies, getAllCompaniesTecUser, updateSchema };