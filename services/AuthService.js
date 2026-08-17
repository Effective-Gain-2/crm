// Identidade global: contas em effective_gain.user_accounts, acesso por empresa em
// effective_gain.user_companies, com espelho local em <schema>.users (preserva FKs).
const pool = require('../db/queries');
const { v4: uuidv4 } = require('uuid');
const { hash, compare } = require('bcrypt');
const { assertSchema } = require('../utils/validateSchema');

const CLIENT_ROLES = ['master', 'lider', 'operacional'];

// ---- Infra (tabelas globais) ----
const ensureIdentityTables = async () => {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS citext`);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS effective_gain.user_accounts (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            name text NOT NULL,
            email citext NOT NULL UNIQUE,
            password text NOT NULL,
            is_tecnico boolean NOT NULL DEFAULT false,
            active boolean NOT NULL DEFAULT true,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
        );`);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS effective_gain.user_companies (
            account_id uuid NOT NULL REFERENCES effective_gain.user_accounts(id) ON DELETE CASCADE,
            company_id uuid NOT NULL REFERENCES effective_gain.companies(id) ON DELETE CASCADE,
            local_user_id uuid NOT NULL,
            role text NOT NULL CHECK (role IN ('master','lider','operacional')),
            granted_by uuid REFERENCES effective_gain.user_accounts(id),
            created_at timestamptz NOT NULL DEFAULT now(),
            PRIMARY KEY (account_id, company_id),
            UNIQUE (company_id, local_user_id)
        );`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_uc_company ON effective_gain.user_companies(company_id);`);
};

// ---- Contas ----
const findAccountByEmail = async (email) => {
    const res = await pool.query(
        // LOWER nos dois lados: o e-mail era comparado com caixa exata, então quem
        // digitasse "Joana@..." em vez de "joana@..." levava "Credenciais inválidas"
        // sem entender por quê (e-mail cadastrado com maiúscula tinha o mesmo efeito).
        `SELECT * FROM effective_gain.user_accounts WHERE LOWER(email) = LOWER($1) AND active = true`,
        [email]
    );
    return res.rows[0] || null;
};

const findAccountById = async (id) => {
    const res = await pool.query(
        `SELECT * FROM effective_gain.user_accounts WHERE id = $1 AND active = true`,
        [id]
    );
    return res.rows[0] || null;
};

const verifyPassword = async (account, password) => compare(password, account.password);

// ---- Empresas / memberships ----
const listCompaniesForAccount = async (account) => {
    if (account.is_tecnico) {
        const res = await pool.query(
            `SELECT id, company_name, schema_name, 'tecnico' AS role FROM effective_gain.companies ORDER BY company_name`
        );
        return res.rows;
    }
    const res = await pool.query(
        `SELECT c.id, c.company_name, c.schema_name, uc.role, uc.local_user_id
           FROM effective_gain.user_companies uc
           JOIN effective_gain.companies c ON c.id = uc.company_id
          WHERE uc.account_id = $1
          ORDER BY c.company_name`,
        [account.id]
    );
    return res.rows;
};

const getMembership = async (accountId, companyId) => {
    const res = await pool.query(
        `SELECT uc.*, c.company_name, c.schema_name
           FROM effective_gain.user_companies uc
           JOIN effective_gain.companies c ON c.id = uc.company_id
          WHERE uc.account_id = $1 AND uc.company_id = $2`,
        [accountId, companyId]
    );
    return res.rows[0] || null;
};

const getCompanyById = async (companyId) => {
    const res = await pool.query(`SELECT * FROM effective_gain.companies WHERE id = $1`, [companyId]);
    return res.rows[0] || null;
};

// ---- Espelho local ----
// Garante a linha em <schema>.users para as FKs locais. password é placeholder:
// autenticação acontece SOMENTE pela conta global.
const ensureMirrorUser = async (schema, localUserId, account, role) => {
    await assertSchema(schema);
    await pool.query(
        `INSERT INTO ${schema}.users (id, name, email, password, permission, online)
         VALUES ($1, $2, $3, 'GLOBAL_AUTH', $4, false)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, permission = EXCLUDED.permission`,
        [localUserId, account.name, account.email, role]
    );
    return localUserId;
};

// Resolve a "sessão de empresa" de uma conta: valida o acesso e devolve
// { schema, company, role, local_user_id } — criando espelho on-demand p/ técnico.
const resolveCompanySession = async (account, companyId) => {
    const company = await getCompanyById(companyId);
    if (!company) return null;

    if (account.is_tecnico) {
        await ensureMirrorUser(company.schema_name, account.id, account, 'tecnico');
        return { schema: company.schema_name, company, role: 'tecnico', local_user_id: account.id };
    }

    const membership = await getMembership(account.id, companyId);
    if (!membership) return null;
    await ensureMirrorUser(company.schema_name, membership.local_user_id, account, membership.role);
    return { schema: company.schema_name, company, role: membership.role, local_user_id: membership.local_user_id };
};

// ---- Criação/concessão (fluxo "novo usuário" do CRM) ----
// Se o email já existe globalmente, apenas concede acesso; senão cria a conta.
const createOrAttachUser = async ({ name, email, password, role, companyId, grantedBy }) => {
    if (!CLIENT_ROLES.includes(role)) throw new Error('Papel inválido');
    // Grava sempre em minúsculo — e-mail não diferencia caixa, e o login também normaliza
    email = String(email || '').trim().toLowerCase();
    const company = await getCompanyById(companyId);
    if (!company) throw new Error('Empresa não encontrada');

    let account = await findAccountByEmail(email);
    let created = false;
    if (!account) {
        if (!password) throw new Error('Senha obrigatória para conta nova');
        const passwordHash = await hash(password, 10);
        const res = await pool.query(
            `INSERT INTO effective_gain.user_accounts (name, email, password) VALUES ($1, $2, $3) RETURNING *`,
            [name, email, passwordHash]
        );
        account = res.rows[0];
        created = true;
    }

    const existing = await getMembership(account.id, companyId);
    if (existing) {
        // Atualiza papel se mudou
        if (existing.role !== role) {
            await pool.query(
                `UPDATE effective_gain.user_companies SET role = $1 WHERE account_id = $2 AND company_id = $3`,
                [role, account.id, companyId]
            );
            await ensureMirrorUser(company.schema_name, existing.local_user_id, account, role);
        }
        return { account, local_user_id: existing.local_user_id, created, attached: false };
    }

    const localUserId = account.id; // contas novas: espelho usa o mesmo uuid
    await pool.query(
        `INSERT INTO effective_gain.user_companies (account_id, company_id, local_user_id, role, granted_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [account.id, companyId, localUserId, role, grantedBy || null]
    );
    await ensureMirrorUser(company.schema_name, localUserId, account, role);
    return { account, local_user_id: localUserId, created, attached: true };
};

// Revoga acesso (mantém espelho para histórico)
const revokeAccess = async (accountId, companyId) => {
    const membership = await getMembership(accountId, companyId);
    if (!membership) return false;
    await pool.query(
        `DELETE FROM effective_gain.user_companies WHERE account_id = $1 AND company_id = $2`,
        [accountId, companyId]
    );
    await pool.query(
        `UPDATE ${membership.schema_name}.users SET permission = 'revogado' WHERE id = $1`,
        [membership.local_user_id]
    ).catch(() => {});
    return true;
};

const updateAccountBasics = async (accountId, { name, email }) => {
    const sets = [];
    const vals = [];
    let i = 1;
    if (name) { sets.push(`name = $${i++}`); vals.push(name); }
    if (email) { sets.push(`email = $${i++}`); vals.push(email); }
    if (!sets.length) return;
    vals.push(accountId);
    await pool.query(
        `UPDATE effective_gain.user_accounts SET ${sets.join(', ')}, updated_at = now() WHERE id = $${i}`,
        vals
    );
};

// Troca de senha da conta global (o espelho local nunca guarda senha real)
const setAccountPassword = async (accountId, newPassword) => {
    if (!newPassword || String(newPassword).length < 8) {
        throw new Error('A senha deve ter ao menos 8 caracteres');
    }
    const hashed = await hash(String(newPassword), 10);
    const res = await pool.query(
        `UPDATE effective_gain.user_accounts SET password = $1, updated_at = now() WHERE id = $2 RETURNING id`,
        [hashed, accountId]
    );
    return res.rowCount > 0;
};

module.exports = {
    CLIENT_ROLES,
    ensureIdentityTables,
    findAccountByEmail,
    findAccountById,
    verifyPassword,
    setAccountPassword,
    listCompaniesForAccount,
    getMembership,
    getCompanyById,
    ensureMirrorUser,
    resolveCompanySession,
    createOrAttachUser,
    revokeAccess,
    updateAccountBasics,
};
