// Coletor de leads do HubSpot → CRM (caminho por sessão, enquanto não há Private App).
//
// COMO FUNCIONA
//   Abre o HubSpot num PERFIL PERSISTENTE (userDataDir). O login é feito UMA VEZ por
//   uma pessoa (rode com HEADLESS=false na 1ª vez, logue, feche). Depois o cookie fica
//   salvo e o HubSpot trata como dispositivo conhecido — a confirmação por e-mail passa
//   a ser rara. Quando ela aparecer, lemos o código por IMAP (emailCode.js) e digitamos.
//   Se cair a tela de LOGIN COM SENHA (sessão morta), o coletor PARA e avisa — não há
//   como recuperar sem senha, e este script nunca digita senha.
//
//   A cada rodada: abre a VIEW salva do HubSpot (HUBSPOT_VIEW_URL — você cria uma vez,
//   com filtro "telefone conhecido + criado recentemente", ordenada por criação desc),
//   lê as linhas (id, nome, e-mail, telefone) e faz POST para o CRM. O CRM deduplica
//   por external_id — reprocessar a mesma janela não duplica nem remanda.
//
// CONFIG (.env):
//   HUBSPOT_VIEW_URL   URL da view salva (obrigatório)
//   HUBSPOT_PROFILE_DIR  pasta do perfil persistente (default ./.hubspot-profile)
//   CRM_INGEST_URL     ex.: https://eg-os-crm-backend.cownkm.easypanel.host/hubspot-leads/cdt_nova_iguacu
//   CRM_PUSH_TOKEN     igual ao integration_settings.hubspot_push_token do tenant
//   HEADLESS           'false' na 1ª vez (login manual); 'true' depois
//   POLL_INTERVAL_MIN  minutos entre rodadas (default 0 = roda uma vez e sai)
//   IMAP_HOST/PORT/USER/PASS   para ler o código de confirmação (ver emailCode.js)
require('dotenv').config();
const path = require('path');
const puppeteer = require('puppeteer');
const { fetchHubspotCode } = require('./emailCode');

const VIEW_URL = process.env.HUBSPOT_VIEW_URL;
const PROFILE_DIR = process.env.HUBSPOT_PROFILE_DIR || path.join(__dirname, '.hubspot-profile');
const INGEST_URL = process.env.CRM_INGEST_URL;
const PUSH_TOKEN = process.env.CRM_PUSH_TOKEN;
const HEADLESS = String(process.env.HEADLESS || 'true') !== 'false';
const INTERVAL_MIN = Number(process.env.POLL_INTERVAL_MIN) || 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// É uma tela de login com senha? (não recuperável por nós)
const isPasswordLogin = (url, bodyText) =>
    /login/i.test(url) && /(senha|password)/i.test(bodyText || '');

// É a tela de "confirme que é você" (código por e-mail)?
const isEmailChallenge = (bodyText) =>
    /(c[oó]digo de (?:verifica|seguran)|verification code|confirme que .* voc[eê]|enter the code)/i.test(bodyText || '');

// Lê as linhas da lista mapeando colunas pelo texto do cabeçalho (robusto a reordenação).
async function extractRows(page) {
    return page.evaluate(() => {
        const norm = (s) => (s || '').trim().toLowerCase();
        // Cabeçalhos → índice de coluna.
        const heads = Array.from(document.querySelectorAll('table thead th, [role="columnheader"]'))
            .map((h) => norm(h.innerText));
        const idxOf = (...names) => heads.findIndex((h) => names.some((n) => h.includes(n)));
        const iPhone = idxOf('telefone', 'phone');
        const iEmail = idxOf('e-mail', 'email');
        const iName = idxOf('nome', 'name');

        const rows = Array.from(document.querySelectorAll('table tbody tr, [role="row"]'));
        const out = [];
        for (const tr of rows) {
            const cells = Array.from(tr.querySelectorAll('td, [role="cell"]')).map((c) => c.innerText.trim());
            if (cells.length === 0) continue;
            // id do contato a partir do link do registro: /record/0-1/<id>
            const a = tr.querySelector('a[href*="/record/0-1/"]');
            const m = a && a.getAttribute('href') && a.getAttribute('href').match(/\/record\/0-1\/(\d+)/);
            const external_id = m ? m[1] : null;
            const phone = iPhone >= 0 ? cells[iPhone] : '';
            if (!external_id || !phone || phone === '--') continue;
            out.push({
                external_id,
                name: iName >= 0 ? cells[iName] : (a ? a.innerText.trim() : ''),
                email: iEmail >= 0 && cells[iEmail] !== '--' ? cells[iEmail] : null,
                phone,
                lifecycle: '', // a view define o recorte; o CRM não exige este campo
            });
        }
        return out;
    });
}

// Trata a tela de confirmação por e-mail. Retorna true se resolveu.
async function handleEmailChallenge(page) {
    console.log('[collector] tela de confirmação por e-mail detectada — buscando código…');
    const askedAt = Date.now();
    // Dá um tempo para o e-mail chegar, tentando algumas vezes.
    for (let i = 0; i < 6; i++) {
        await sleep(10000);
        const code = await fetchHubspotCode({ sinceMs: askedAt, maxAgeSec: 900 });
        if (!code) { console.log(`[collector] código ainda não chegou (tentativa ${i + 1}/6)…`); continue; }
        console.log('[collector] código obtido, preenchendo.');
        // Preenche o(s) campo(s) de código e submete.
        const input = await page.$('input[name*="code" i], input[autocomplete="one-time-code"], input[type="tel"], input[type="text"]');
        if (!input) { console.warn('[collector] não achei o campo do código na tela.'); return false; }
        await input.click({ clickCount: 3 });
        await input.type(code, { delay: 60 });
        const btn = await page.$('button[type="submit"], button');
        if (btn) await btn.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
        return true;
    }
    console.warn('[collector] não consegui o código a tempo.');
    return false;
}

async function postLead(lead) {
    const res = await fetch(INGEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${PUSH_TOKEN}` },
        body: JSON.stringify(lead),
    });
    return res.status;
}

async function runOnce(page) {
    await page.goto(VIEW_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    let body = await page.evaluate(() => document.body.innerText).catch(() => '');
    const url = page.url();

    if (isPasswordLogin(url, body)) {
        console.error('\n⛔ Sessão expirou — o HubSpot pediu LOGIN COM SENHA.');
        console.error('   Rode uma vez com HEADLESS=false e faça o login manual no perfil.');
        console.error('   (Este script nunca digita senha.)\n');
        return { fatal: true };
    }
    if (isEmailChallenge(body)) {
        const ok = await handleEmailChallenge(page);
        if (!ok) return { fatal: true };
        await page.goto(VIEW_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        body = await page.evaluate(() => document.body.innerText).catch(() => '');
    }

    // Espera a tabela renderizar.
    await page.waitForSelector('table tbody tr, [role="row"]', { timeout: 30000 }).catch(() => {});
    const rows = await extractRows(page);
    console.log(`[collector] ${rows.length} lead(s) com telefone na view.`);

    let sent = 0, dup = 0, err = 0;
    for (const lead of rows) {
        try {
            const status = await postLead(lead);
            if (status === 200) sent++;
            else { err++; console.warn(`[collector] POST status ${status} para id ${lead.external_id}`); }
        } catch (e) {
            err++; console.error(`[collector] erro no POST id ${lead.external_id}:`, e.message);
        }
        await sleep(400); // respiro entre POSTs
    }
    console.log(`[collector] enviados=${sent} erros=${err} (duplicados são descartados no CRM)`);
    return { sent, err };
}

async function main() {
    if (!VIEW_URL || !INGEST_URL || !PUSH_TOKEN) {
        console.error('Faltam env: HUBSPOT_VIEW_URL, CRM_INGEST_URL, CRM_PUSH_TOKEN.');
        process.exit(1);
    }
    const browser = await puppeteer.launch({
        headless: HEADLESS ? 'new' : false,
        userDataDir: PROFILE_DIR,
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    const page = (await browser.pages())[0] || (await browser.newPage());
    await page.setViewport({ width: 1400, height: 900 });

    try {
        do {
            const r = await runOnce(page);
            if (r.fatal) break;
            if (INTERVAL_MIN > 0) {
                console.log(`[collector] próxima rodada em ${INTERVAL_MIN} min.`);
                await sleep(INTERVAL_MIN * 60000);
            }
        } while (INTERVAL_MIN > 0);
    } finally {
        if (HEADLESS) await browser.close();
        else console.log('[collector] navegador aberto (HEADLESS=false) — feche a janela quando terminar o login.');
    }
}

main().catch((e) => { console.error('[collector] fatal:', e); process.exit(1); });
