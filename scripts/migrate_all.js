// Aplica o shape completo de tenant (ensureSchemaTables) em TODOS os schemas
// registrados em effective_gain.companies. Idempotente — pode rodar quantas vezes quiser.
//
// Uso: node scripts/migrate_all.js            (todos os schemas)
//      node scripts/migrate_all.js <schema>   (apenas um schema)
//
// Substitui os antigos migrate_opportunities.js / migrate_ai_agent.js.
const pool = require('../db/queries');
const { ensureSchemaTables, assertValidSchema } = require('../services/CompanyService');

async function migrateOne(schema) {
    assertValidSchema(schema);
    process.stdout.write(`→ ${schema} ... `);
    await ensureSchemaTables(schema);
    console.log('OK');
}

async function main() {
    const target = process.argv[2];
    try {
        // Garante o registro de tenants (bootstrap defensivo)
        await pool.query(`CREATE SCHEMA IF NOT EXISTS effective_gain`);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS effective_gain.companies (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                company_name text,
                schema_name text UNIQUE
            );`);

        if (target) {
            await migrateOne(target);
        } else {
            const res = await pool.query(`SELECT schema_name FROM effective_gain.companies ORDER BY schema_name`);
            if (res.rows.length === 0) {
                console.log('Nenhuma empresa registrada em effective_gain.companies.');
            }
            for (const row of res.rows) {
                await migrateOne(row.schema_name);
            }
        }
        console.log('✓ Migração concluída.');
    } catch (error) {
        console.error('Erro na migração:', error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

main();
