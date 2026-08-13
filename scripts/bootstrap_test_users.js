// Cria/atualiza contas de teste para simulação E2E (senhas via env do comando).
// Uso: TEC_PW=... MASTER_PW=... LIDER_PW=... OPER_PW=... TARGET_SCHEMA=cdt_nova_iguacu node scripts/bootstrap_test_users.js
const pool = require('../db/queries');
const { hash } = require('bcrypt');
const { ensureIdentityTables, createOrAttachUser, findAccountByEmail } = require('../services/AuthService');

async function upsertAccount(email, name, pw, isTecnico) {
    const passwordHash = await hash(pw, 10);
    const existing = await pool.query(`SELECT id FROM effective_gain.user_accounts WHERE email = $1`, [email]);
    if (existing.rows.length) {
        await pool.query(
            `UPDATE effective_gain.user_accounts SET password = $1, name = $2, is_tecnico = $3, active = true WHERE id = $4`,
            [passwordHash, name, isTecnico, existing.rows[0].id]
        );
        return existing.rows[0].id;
    }
    const res = await pool.query(
        `INSERT INTO effective_gain.user_accounts (name, email, password, is_tecnico) VALUES ($1, $2, $3, $4) RETURNING id`,
        [name, email, passwordHash, isTecnico]
    );
    return res.rows[0].id;
}

async function main() {
    const schema = process.env.TARGET_SCHEMA;
    const { TEC_PW, MASTER_PW, LIDER_PW, OPER_PW } = process.env;
    if (!schema || !TEC_PW || !MASTER_PW || !LIDER_PW || !OPER_PW) {
        console.error('Defina TARGET_SCHEMA, TEC_PW, MASTER_PW, LIDER_PW, OPER_PW.');
        process.exit(1);
    }
    try {
        await ensureIdentityTables();

        // Técnico de teste (plataforma)
        const tecId = await upsertAccount('tecnico.teste@effectivegain.com', 'Técnico Teste', TEC_PW, true);
        await pool.query(
            `INSERT INTO effective_gain.users (id, name, email, password, permission, online)
             VALUES ($1, 'Técnico Teste', 'tecnico.teste@effectivegain.com', 'GLOBAL_AUTH', 'tecnico', false)
             ON CONFLICT (id) DO NOTHING`, [tecId]
        );

        const company = await pool.query(`SELECT id FROM effective_gain.companies WHERE schema_name = $1`, [schema]);
        if (!company.rows[0]) {
            console.error(`Empresa com schema ${schema} não existe — crie antes.`);
            process.exit(1);
        }
        const companyId = company.rows[0].id;

        const users = [
            { email: `master.teste@${schema}.eg`, name: 'Master Teste', role: 'master', pw: MASTER_PW },
            { email: `lider.teste@${schema}.eg`, name: 'Líder Teste', role: 'lider', pw: LIDER_PW },
            { email: `operacional.teste@${schema}.eg`, name: 'Operacional Teste', role: 'operacional', pw: OPER_PW },
        ];
        for (const u of users) {
            const acc = await findAccountByEmail(u.email);
            if (acc) {
                const passwordHash = await hash(u.pw, 10);
                await pool.query(`UPDATE effective_gain.user_accounts SET password = $1 WHERE id = $2`, [passwordHash, acc.id]);
                await createOrAttachUser({ name: u.name, email: u.email, password: u.pw, role: u.role, companyId });
            } else {
                await createOrAttachUser({ name: u.name, email: u.email, password: u.pw, role: u.role, companyId });
            }
            console.log(`  ✓ ${u.role}: ${u.email}`);
        }
        console.log('TEST USERS OK');
        process.exit(0);
    } catch (e) {
        console.error('Erro:', e.message);
        process.exit(1);
    }
}
main();
