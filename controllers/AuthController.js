// Fluxo de autenticação global: login → (seleção de empresa) → sessão com schema+papel no token.
const jwt = require('jsonwebtoken');
const axios = require('axios');
const pool = require('../db/queries');
const { ACCESS_SECRET, REFRESH_SECRET } = require('../middlewares/auth');
const {
    findAccountByEmail,
    findAccountById,
    verifyPassword,
    listCompaniesForAccount,
    resolveCompanySession,
} = require('../services/AuthService');
const { changeOnline, changeOffline, getIp } = require('../services/UserService');

const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';
const PREAUTH_TTL = '5m';

const isProd = () => process.env.NODE_ENV === 'production';

const cookieOpts = (maxAgeMs) => ({
    maxAge: maxAgeMs,
    httpOnly: true,
    secure: isProd(),
    sameSite: isProd() ? 'none' : 'strict',
    path: '/',
    domain: isProd() ? process.env.COOKIE_DOMAIN : undefined,
});

const sessionPayload = (account, session) => ({
    account_id: account.id,
    local_user_id: session.local_user_id,
    schema: session.schema,
    company_id: session.company.id,
    role: session.role,
    is_tecnico: !!account.is_tecnico,
});

const issueSession = (res, account, session) => {
    const payload = sessionPayload(account, session);
    const token = jwt.sign({ ...payload, typ: 'access' }, ACCESS_SECRET(), { expiresIn: ACCESS_TTL });
    const refreshToken = jwt.sign({ ...payload, typ: 'refresh' }, REFRESH_SECRET(), { expiresIn: REFRESH_TTL });
    res.cookie('token', token, cookieOpts(15 * 60 * 1000));
    res.cookie('refreshToken', refreshToken, cookieOpts(7 * 24 * 60 * 60 * 1000));
    res.clearCookie('preAuthToken', { path: '/' });
};

// ---- Rate limit de login por IP (conserta o bloqueio morto do código antigo) ----
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

const isBlocked = async (ip) => {
    const res = await pool.query(`SELECT * FROM effective_gain.login_data WHERE ip = $1`, [ip]);
    const row = res.rows[0];
    if (!row) return false;
    if (Date.now() - Number(row.last_attempt) > WINDOW_MS) return false;
    return Number(row.attempts) >= MAX_ATTEMPTS;
};

const recordAttempt = async (ip, success) => {
    try {
        if (success) {
            await pool.query(`DELETE FROM effective_gain.login_data WHERE ip = $1`, [ip]);
            return;
        }
        const res = await pool.query(`SELECT * FROM effective_gain.login_data WHERE ip = $1 LIMIT 1`, [ip]);
        const row = res.rows[0];
        if (!row) {
            await pool.query(
                `INSERT INTO effective_gain.login_data (ip, attempts, last_attempt) VALUES ($1, 1, $2)`,
                [ip, Date.now()]
            );
            return;
        }
        const fresh = Date.now() - Number(row.last_attempt) <= WINDOW_MS;
        await pool.query(
            `UPDATE effective_gain.login_data SET attempts = $1, last_attempt = $2 WHERE id = $3`,
            [fresh ? Number(row.attempts) + 1 : 1, Date.now(), row.id]
        );
    } catch (e) {
        console.error('recordAttempt:', e.message);
    }
};

// ---- reCAPTCHA (validação server-side, ativa quando RECAPTCHA_SECRET está setado) ----
const verifyRecaptcha = async (recaptcha) => {
    const secret = process.env.RECAPTCHA_SECRET;
    if (!secret) return true; // desativado
    if (!recaptcha) return false;
    try {
        const { data } = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            new URLSearchParams({ secret, response: recaptcha }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        return !!data.success;
    } catch (e) {
        console.error('reCAPTCHA verify falhou:', e.message);
        return false;
    }
};

// POST /api/login
const loginController = async (req, res) => {
    try {
        const { email, password, recaptcha } = req.body || {};
        if (!email || !password) return res.status(400).json({ success: false, error: 'Email e senha obrigatórios' });

        const ip = await getIp(req);
        if (await isBlocked(ip)) {
            return res.status(403).json({ success: false, error: 'IP bloqueado por tentativas excessivas. Tente em 15 minutos.' });
        }
        if (!(await verifyRecaptcha(recaptcha))) {
            return res.status(400).json({ success: false, error: 'Verificação reCAPTCHA falhou' });
        }

        const account = await findAccountByEmail(email);
        if (!account || !(await verifyPassword(account, password))) {
            await recordAttempt(ip, false);
            return res.status(401).json({ success: false, error: 'Credenciais inválidas' });
        }
        await recordAttempt(ip, true);

        const companies = await listCompaniesForAccount(account);
        if (companies.length === 0) {
            return res.status(403).json({ success: false, error: 'Conta sem acesso a nenhuma empresa' });
        }

        // Técnico ou multi-empresa → etapa de seleção
        if (account.is_tecnico || companies.length > 1) {
            const preAuth = jwt.sign({ account_id: account.id, typ: 'preauth' }, ACCESS_SECRET(), { expiresIn: PREAUTH_TTL });
            res.cookie('preAuthToken', preAuth, cookieOpts(5 * 60 * 1000));
            return res.status(200).json({
                success: true,
                needsSelection: true,
                account: { id: account.id, name: account.name, email: account.email, is_tecnico: account.is_tecnico },
                companies: companies.map(c => ({ id: c.id, company_name: c.company_name, schema_name: c.schema_name, role: c.role })),
            });
        }

        const only = companies[0];
        const session = await resolveCompanySession(account, only.id);
        if (!session) return res.status(403).json({ success: false, error: 'Acesso à empresa indisponível' });

        issueSession(res, account, session);
        changeOnline(session.local_user_id, session.schema);
        return res.status(200).json({
            success: true,
            needsSelection: false,
            user: { id: session.local_user_id, name: account.name, email: account.email },
            role: session.role,
            company: session.company,
            schema: session.schema,
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ success: false, error: 'Erro no login' });
    }
};

// POST /api/select-company  { company_id }
// Aceita preAuthToken (pós-login) OU sessão completa (troca de empresa pelo menu).
const selectCompanyController = async (req, res) => {
    try {
        const { company_id } = req.body || {};
        if (!company_id) return res.status(400).json({ success: false, error: 'company_id obrigatório' });

        let accountId = null;
        const { preAuthToken, token } = req.cookies || {};
        if (preAuthToken) {
            try {
                const dec = jwt.verify(preAuthToken, ACCESS_SECRET());
                if (dec.typ === 'preauth') accountId = dec.account_id;
            } catch (e) { /* tenta a sessão completa */ }
        }
        if (!accountId && token) {
            try {
                const dec = jwt.verify(token, ACCESS_SECRET());
                if (dec.typ === 'access') accountId = dec.account_id;
            } catch (e) { /* sem sessão válida */ }
        }
        if (!accountId) return res.status(401).json({ success: false, error: 'Sessão expirada — faça login novamente' });

        const account = await findAccountById(accountId);
        if (!account) return res.status(401).json({ success: false, error: 'Conta inválida' });

        const session = await resolveCompanySession(account, company_id);
        if (!session) return res.status(403).json({ success: false, error: 'Sem acesso a esta empresa' });

        issueSession(res, account, session);
        changeOnline(session.local_user_id, session.schema);
        return res.status(200).json({
            success: true,
            user: { id: session.local_user_id, name: account.name, email: account.email },
            role: session.role,
            company: session.company,
            schema: session.schema,
        });
    } catch (error) {
        console.error('Erro ao selecionar empresa:', error);
        res.status(500).json({ success: false, error: 'Erro ao selecionar empresa' });
    }
};

// POST /api/refresh-token — re-consulta o acesso (revogação efetiva em <=15min)
const refreshTokenController = async (req, res) => {
    try {
        const { refreshToken } = req.cookies || {};
        if (!refreshToken) return res.status(401).json({ success: false, error: 'Refresh token não encontrado' });

        let decoded;
        try {
            decoded = jwt.verify(refreshToken, REFRESH_SECRET());
        } catch (e) {
            return res.status(401).json({ success: false, error: 'Refresh token inválido' });
        }
        if (decoded.typ !== 'refresh') return res.status(401).json({ success: false, error: 'Token inválido' });

        const account = await findAccountById(decoded.account_id);
        if (!account) return res.status(401).json({ success: false, error: 'Conta inativa' });

        const session = await resolveCompanySession(account, decoded.company_id);
        if (!session) return res.status(403).json({ success: false, error: 'Acesso revogado' });

        issueSession(res, account, session);
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Erro no refresh:', error);
        res.status(500).json({ success: false, error: 'Erro no refresh' });
    }
};

// GET /api/me — fonte de verdade do frontend
const meController = async (req, res) => {
    try {
        const account = await findAccountById(req.auth.account_id);
        if (!account) return res.status(401).json({ error: 'Conta inválida' });
        const companies = await listCompaniesForAccount(account);
        res.status(200).json({
            account: { id: account.id, name: account.name, email: account.email, is_tecnico: account.is_tecnico },
            user: { id: req.auth.local_user_id, name: account.name, email: account.email },
            role: req.auth.role,
            schema: req.auth.schema,
            company_id: req.auth.company_id,
            companies: companies.map(c => ({ id: c.id, company_name: c.company_name, schema_name: c.schema_name, role: c.role })),
        });
    } catch (error) {
        console.error('Erro no /me:', error);
        res.status(500).json({ error: 'Erro ao carregar sessão' });
    }
};

// POST /api/logout
const logoutController = async (req, res) => {
    try {
        const { token } = req.cookies || {};
        if (token) {
            try {
                const dec = jwt.verify(token, ACCESS_SECRET());
                if (dec.typ === 'access') changeOffline(dec.local_user_id, dec.schema);
            } catch (e) { /* token já inválido */ }
        }
        for (const name of ['token', 'refreshToken', 'preAuthToken']) {
            res.clearCookie(name, { path: '/', domain: isProd() ? process.env.COOKIE_DOMAIN : undefined });
        }
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Erro no logout:', error);
        res.status(500).json({ success: false });
    }
};

module.exports = {
    loginController,
    selectCompanyController,
    refreshTokenController,
    meController,
    logoutController,
};
