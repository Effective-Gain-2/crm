// Cria a tabela opportunities em um schema já existente.
// Uso: node scripts/migrate_opportunities.js <schema>
// Ex.: node scripts/migrate_opportunities.js effective_gain
const pool = require('../db/queries');

async function migrate(schema) {
    if (!schema) {
        console.error('Uso: node scripts/migrate_opportunities.js <schema>');
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
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now()
            );
        `);
        await pool.query(
            `CREATE INDEX IF NOT EXISTS idx_${schema}_opp_funnel_stage ON ${schema}.opportunities (funnel, stage_id);`
        );

        // Lead scoring
        await pool.query(`ALTER TABLE ${schema}.opportunities ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0;`);
        // Atribuicao (Meta/Google Ads)
        await pool.query(`ALTER TABLE ${schema}.opportunities ADD COLUMN IF NOT EXISTS utm_source TEXT;`);
        await pool.query(`ALTER TABLE ${schema}.opportunities ADD COLUMN IF NOT EXISTS utm_medium TEXT;`);
        await pool.query(`ALTER TABLE ${schema}.opportunities ADD COLUMN IF NOT EXISTS utm_campaign TEXT;`);
        await pool.query(`ALTER TABLE ${schema}.opportunities ADD COLUMN IF NOT EXISTS ad_id TEXT;`);
        await pool.query(`ALTER TABLE ${schema}.opportunities ADD COLUMN IF NOT EXISTS campaign_name TEXT;`);
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
            );
        `);

        console.log(`✓ Tabela opportunities + lead scoring criadas/garantidas no schema '${schema}'`);
    } catch (error) {
        console.error('Erro na migração:', error.message);
    } finally {
        await pool.end();
    }
}

migrate(process.argv[2]);
