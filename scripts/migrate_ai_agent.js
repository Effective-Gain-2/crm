// Adiciona a infra do Agente de IA a um schema existente.
// Uso: node scripts/migrate_ai_agent.js <schema>
const pool = require('../db/queries');

async function migrate(schema) {
    if (!schema) {
        console.error('Uso: node scripts/migrate_ai_agent.js <schema>');
        process.exit(1);
    }
    try {
        const exists = await pool.query(
            `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
            [schema]
        );
        if (exists.rows.length === 0) {
            console.error(`Schema '${schema}' não encontrado!`);
            return;
        }

        await pool.query(`ALTER TABLE ${schema}.chats ADD COLUMN IF NOT EXISTS isboton boolean DEFAULT true;`);

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
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${schema}.ai_agent_sessions (
            contact_number TEXT PRIMARY KEY,
            msg_count INTEGER NOT NULL DEFAULT 0,
            hibernate_until TIMESTAMP,
            updated_at TIMESTAMP DEFAULT now()
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${schema}.ai_agent_documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            filename TEXT NOT NULL,
            mime TEXT,
            content_text TEXT,
            char_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT now()
            );
        `);

        console.log(`✓ Infra do Agente de IA criada/garantida no schema '${schema}'`);
    } catch (error) {
        console.error('Erro na migração:', error.message);
    } finally {
        await pool.end();
    }
}

migrate(process.argv[2]);
