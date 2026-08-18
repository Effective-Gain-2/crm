// Lê o código de verificação que o HubSpot manda por e-mail quando pede
// "confirme que é você". Credenciais SOMENTE via ambiente — nada hardcoded.
//
// Env necessárias:
//   IMAP_HOST   (ex.: imap.gmail.com)
//   IMAP_PORT   (default 993)
//   IMAP_USER   (a caixa que recebe o e-mail do HubSpot)
//   IMAP_PASS   (senha de app — NUNCA a senha real da conta)
const { ImapFlow } = require('imapflow');

// Extrai um código de 4–8 dígitos de um texto de e-mail do HubSpot.
const extractCode = (text) => {
    if (!text) return null;
    // Procura perto de palavras-chave para não pegar número aleatório.
    const near = text.match(/(?:c[oó]digo|code|verifica|verification)[^\d]{0,40}(\d{4,8})/i);
    if (near) return near[1];
    const any = text.match(/\b(\d{6})\b/); // fallback: 6 dígitos isolados
    return any ? any[1] : null;
};

// Busca o código mais recente do HubSpot recebido nos últimos `maxAgeSec` segundos.
// Retorna o código (string) ou null. Nunca lança para não derrubar o coletor.
const fetchHubspotCode = async ({ sinceMs = 0, maxAgeSec = 600 } = {}) => {
    const host = process.env.IMAP_HOST;
    const user = process.env.IMAP_USER;
    const pass = process.env.IMAP_PASS;
    if (!host || !user || !pass) {
        console.warn('[emailCode] IMAP não configurado (IMAP_HOST/USER/PASS) — não dá para ler o código.');
        return null;
    }

    const client = new ImapFlow({
        host, port: Number(process.env.IMAP_PORT) || 993, secure: true,
        auth: { user, pass }, logger: false,
    });

    try {
        await client.connect();
        const lock = await client.getMailboxLock('INBOX');
        try {
            const cutoff = new Date(Date.now() - maxAgeSec * 1000);
            // Busca mensagens recentes do HubSpot.
            const uids = await client.search({ since: cutoff, from: 'hubspot' });
            if (!uids || uids.length === 0) return null;
            // Do mais novo para o mais antigo.
            for (const uid of uids.reverse()) {
                const msg = await client.fetchOne(uid, { source: true, envelope: true });
                if (!msg) continue;
                // Só considera e-mails após o instante em que pedimos o código.
                if (sinceMs && msg.envelope?.date && new Date(msg.envelope.date).getTime() < sinceMs - 60000) continue;
                const body = msg.source ? msg.source.toString() : '';
                const code = extractCode(body);
                if (code) return code;
            }
            return null;
        } finally {
            lock.release();
        }
    } catch (e) {
        console.error('[emailCode] falha ao ler IMAP:', e.message);
        return null;
    } finally {
        try { await client.logout(); } catch (_) { /* ignore */ }
    }
};

module.exports = { fetchHubspotCode, extractCode };
