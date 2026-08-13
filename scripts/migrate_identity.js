// Migra usuários por-schema para o modelo de identidade global.
// Idempotente. Uso: node scripts/migrate_identity.js
//
// - Cria effective_gain.user_accounts / user_companies (via AuthService.ensureIdentityTables)
// - Consolida <schema>.users por email (1ª ocorrência fica com o hash de senha)
// - Mapa de papéis: admin→master · tecnico→master + is_tecnico · demais→operacional
// - Garante info@effectivegain.com como técnico
const pool = require('../db/queries');
const { ensureIdentityTables } = require('../services/AuthService');

const ROLE_MAP = { admin: 'master', tecnico: 'master', user: 'operacional' };

async function main() {
    try {
        await ensureIdentityTables();

        const companies = await pool.query(`SELECT id, company_name, schema_name FROM effective_gain.companies ORDER BY schema_name`);
        let created = 0, linked = 0, collisions = 0;

        for (const company of companies.rows) {
            const schema = company.schema_name;
            let users;
            try {
                users = await pool.query(`SELECT * FROM ${schema}.users WHERE password NOT IN ('GLOBAL_AUTH','MIGRATED')`);
            } catch (e) {
                console.warn(`  ! ${schema}: sem tabela users (${e.message})`);
                continue;
            }

            for (const u of users.rows) {
                if (!u.email) continue;
                const role = ROLE_MAP[(u.permission || '').toLowerCase()] || 'operacional';
                const isTec = (u.permission || '').toLowerCase() === 'tecnico';

                // Conta global (1ª ocorrência do email ganha o hash)
                const existing = await pool.query(
                    `SELECT * FROM effective_gain.user_accounts WHERE email = $1`, [u.email]
                );
                let account;
                if (existing.rows.length === 0) {
                    const res = await pool.query(
                        `INSERT INTO effective_gain.user_accounts (name, email, password, is_tecnico)
                         VALUES ($1, $2, $3, $4) RETURNING *`,
                        [u.name || u.email, u.email, u.password, isTec]
                    );
                    account = res.rows[0];
                    created++;
                } else {
                    account = existing.rows[0];
                    collisions++;
                    console.warn(`  ~ colisão de email: ${u.email} já é conta global; ${schema} vincula com o hash da 1ª ocorrência`);
                    if (isTec && !account.is_tecnico) {
                        await pool.query(`UPDATE effective_gain.user_accounts SET is_tecnico = true WHERE id = $1`, [account.id]);
                    }
                }

                // Membership (local_user_id = id antigo → FKs preservadas)
                await pool.query(
                    `INSERT INTO effective_gain.user_companies (account_id, company_id, local_user_id, role)
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT (account_id, company_id) DO NOTHING`,
                    [account.id, company.id, u.id, role]
                );
                linked++;
            }
        }

        // Garante o técnico master da plataforma
        const tec = await pool.query(
            `UPDATE effective_gain.user_accounts SET is_tecnico = true WHERE email = 'info@effectivegain.com' RETURNING id`
        );
        if (tec.rows.length === 0) {
            console.warn('  ! info@effectivegain.com não encontrado em user_accounts — criar conta antes do cutover.');
        } else {
            console.log('  ✓ info@effectivegain.com marcado como técnico');
        }

        console.log(`✓ Identidade migrada: ${created} contas criadas, ${linked} vínculos, ${collisions} colisões de email.`);
    } catch (error) {
        console.error('Erro na migração de identidade:', error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

main();
