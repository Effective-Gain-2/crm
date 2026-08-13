// Bootstrap do técnico da plataforma (modelo de identidade global).
// Idempotente. Uso (no console do crm-backend):
//   ADMIN_EMAIL='info@effectivegain.com' ADMIN_NAME='Master Tecnico' ADMIN_PW='<senha>' node scripts/bootstrap_tecnico.js
const pool = require('../db/queries');
const { hash } = require('bcrypt');
const { ensureIdentityTables } = require('../services/AuthService');
const { ensureSchemaTables } = require('../services/CompanyService');

async function main() {
    const email = process.env.ADMIN_EMAIL;
    const name = process.env.ADMIN_NAME || 'Master Tecnico';
    const pw = process.env.ADMIN_PW;
    if (!email || !pw) {
        console.error('Defina ADMIN_EMAIL e ADMIN_PW no ambiente do comando.');
        process.exit(1);
    }
    try {
        // Schema-mestre + registro de empresas + tabelas do tenant EG
        await pool.query(`CREATE SCHEMA IF NOT EXISTS effective_gain`);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS effective_gain.companies (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                company_name text,
                schema_name text UNIQUE
            );`);
        await pool.query(`
            INSERT INTO effective_gain.companies (company_name, schema_name)
            SELECT 'Effective Gain', 'effective_gain'
            WHERE NOT EXISTS (SELECT 1 FROM effective_gain.companies WHERE schema_name = 'effective_gain');`);
        await ensureSchemaTables('effective_gain');
        await ensureIdentityTables();

        // Conta técnica global
        const passwordHash = await hash(pw, 10);
        const existing = await pool.query(`SELECT id FROM effective_gain.user_accounts WHERE email = $1`, [email]);
        let accountId;
        if (existing.rows.length) {
            accountId = existing.rows[0].id;
            await pool.query(
                `UPDATE effective_gain.user_accounts SET password = $1, name = $2, is_tecnico = true, active = true WHERE id = $3`,
                [passwordHash, name, accountId]
            );
        } else {
            const res = await pool.query(
                `INSERT INTO effective_gain.user_accounts (name, email, password, is_tecnico) VALUES ($1, $2, $3, true) RETURNING id`,
                [name, email, passwordHash]
            );
            accountId = res.rows[0].id;
        }

        // Espelho local no tenant EG (para FKs)
        await pool.query(
            `INSERT INTO effective_gain.users (id, name, email, password, permission, online)
             VALUES ($1, $2, $3, 'GLOBAL_AUTH', 'tecnico', false)
             ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, permission = 'tecnico'`,
            [accountId, name, email]
        );

        console.log(`BOOTSTRAP OK — técnico ${email} pronto (conta ${accountId}).`);
        process.exit(0);
    } catch (error) {
        console.error('Erro no bootstrap:', error.message);
        process.exit(1);
    }
}

main();
