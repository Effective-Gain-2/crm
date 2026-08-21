// Primeiro contato automático com lead novo (WhatsApp de boas-vindas).
//
// Fluxo: um lead novo entra (via ingestão HubSpot) → cria a oportunidade →
// dispara UMA mensagem de apresentação → marca contacted_at no CRM.
//
// Garantias:
// - Idempotência dupla: só dispara se contacted_at IS NULL (não remanda em reprocesso).
// - Compliance: o envio passa por sendTextMessage/sendMediaForBlast, que já embutem o
//   ComplianceService (teto diário, anti-repetição, lista fria, ban monitor). SEM bypass.
// - 5 variações de texto, escolhidas de forma DETERMINÍSTICA por lead: o mesmo lead
//   recebe sempre a mesma variação (reprocesso não muda), mas leads diferentes recebem
//   textos diferentes → a trava de anti-repetição do Compliance não dispara.
// - Logo (opcional): se o tenant tiver welcome_media_urls (uma por variação), a mensagem
//   sai como imagem+legenda. Sem isso, sai só texto.
const pool = require('../db/queries');
const { getSetting } = require('./IntegrationService');
const { sendTextMessage, sendMediaForBlast } = require('../requests/evolution');

// 5 variações do primeiro contato (cliente FEZ contato pelo Cartão de Todos).
// Servem tanto como texto quanto como legenda de imagem. Sem link (menos spam).
// Placeholders: {primeiro_nome} {atendente} {unidade}.
const MESSAGE_VARIANTS = [
    'Olá, {primeiro_nome}! Tudo bem?\n' +
    'Aqui é {atendente}, da unidade do Cartão de Todos em {unidade}.\n' +
    'Recebi o seu contato feito pelo Cartão de Todos e passei para me apresentar. Como posso te ajudar?',

    'Oi, {primeiro_nome}, tudo bem?\n' +
    'Meu nome é {atendente}, sou da unidade do Cartão de Todos em {unidade}.\n' +
    'Vi que você fez contato com o Cartão de Todos e vim me colocar à disposição. Em que posso te ajudar?',

    'Olá, {primeiro_nome}!\n' +
    'Aqui é {atendente}, do Cartão de Todos em {unidade}.\n' +
    'Chegou até mim a sua solicitação feita no Cartão de Todos. Fico à disposição para te ajudar no que precisar — pode falar por aqui.',

    'Oi, {primeiro_nome}! Tudo certo?\n' +
    'Sou {atendente}, da unidade do Cartão de Todos em {unidade}.\n' +
    'Recebi seu contato pelo Cartão de Todos e queria entender como posso te ajudar. É só me falar por aqui.',

    'Olá, {primeiro_nome}, tudo bem?\n' +
    'Quem fala é {atendente}, da unidade do Cartão de Todos em {unidade}.\n' +
    'Vi seu contato aqui com a gente e vim me apresentar. Se precisar de qualquer coisa, pode contar comigo por aqui.',
];

// Mantido para compatibilidade (config antiga usava welcome_template único).
const DEFAULT_TEMPLATE = MESSAGE_VARIANTS[0];

const primeiroNome = (nome) => {
    const n = String(nome || '').trim().split(/\s+/)[0] || '';
    // Capitaliza só a inicial (nomes vêm em CAIXA ALTA do HubSpot).
    return n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : 'tudo bem';
};

const renderTemplate = (tpl, { nome, atendente, unidade }) =>
    tpl
        .replace(/\{primeiro_nome\}/g, primeiroNome(nome))
        .replace(/\{atendente\}/g, atendente || 'a equipe')
        .replace(/\{unidade\}/g, unidade || 'Nova Iguaçu');

// Índice estável a partir de uma chave (external_id do HubSpot, ou id da oportunidade).
// Determinístico: o mesmo lead cai sempre na mesma variação.
const variantIndex = (key, n) => {
    const s = String(key || '');
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return n > 0 ? h % n : 0;
};

// Lê a lista de variações do tenant, com fallbacks seguros:
//   welcome_templates (JSON array) → welcome_template (string única) → MESSAGE_VARIANTS.
const carregarVariacoes = async (schema) => {
    const raw = await getSetting(schema, 'welcome_templates');
    if (raw) {
        try {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr) && arr.length) return arr.filter((t) => typeof t === 'string' && t.trim());
        } catch (_) { /* cai no fallback */ }
    }
    const single = await getSetting(schema, 'welcome_template');
    if (single) return [single];
    return MESSAGE_VARIANTS;
};

// Logos opcionais, uma por variação (mesma ordem). Só usadas se existirem.
const carregarMidias = async (schema) => {
    const raw = await getSetting(schema, 'welcome_media_urls');
    if (!raw) return [];
    try {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch (_) { return []; }
};

// Dispara o primeiro contato para UMA oportunidade recém-criada.
// opp: linha de opportunities (precisa de id, contact_number, title; usa external_id se houver).
// Retorna { sent, skipped, blocked, motivo, variant }.
const enviarPrimeiroContato = async (schema, opp) => {
    if (!opp || !opp.id) return { skipped: true, motivo: 'oportunidade inválida' };
    if (!opp.contact_number) return { skipped: true, motivo: 'sem telefone' };

    // Trava de idempotência atômica: marca a INTENÇÃO antes de enviar. Se outra execução
    // da varredura já pegou este lead, o UPDATE não afeta linha e não mandamos duplicado.
    const trava = await pool.query(
        `UPDATE ${schema}.opportunities
            SET contacted_at = now(), contacted_channel = 'whatsapp'
          WHERE id = $1 AND contacted_at IS NULL
        RETURNING id`,
        [opp.id]
    );
    if (!trava.rows[0]) return { skipped: true, motivo: 'já contatado' };

    const instancia = await getSetting(schema, 'welcome_instance');
    const atendente = await getSetting(schema, 'welcome_atendente');
    const unidade = await getSetting(schema, 'welcome_unidade');

    if (!instancia) {
        // Sem conexão configurada: mantém contacted_at como intenção, mas sinaliza que
        // não saiu — evita "perder" o lead silenciosamente.
        await pool.query(
            `UPDATE ${schema}.opportunities SET contacted_channel = 'pendente_sem_conexao' WHERE id = $1`,
            [opp.id]
        );
        return { skipped: true, motivo: 'welcome_instance não configurada' };
    }

    const variacoes = await carregarVariacoes(schema);
    const midias = await carregarMidias(schema);
    const idx = variantIndex(opp.external_id || opp.id, variacoes.length);
    const texto = renderTemplate(variacoes[idx], { nome: opp.title, atendente, unidade });
    const logo = midias[idx] || null; // logo desta variação, se o tenant tiver subido

    // origem 'disparo' ativa as guardas de disparo em massa do ComplianceService.
    const r = logo
        ? await sendMediaForBlast(instancia, texto, logo, opp.contact_number)
        : await sendTextMessage(instancia, texto, opp.contact_number, null, 'disparo');

    if (r && r.blocked) {
        // Compliance barrou: desfaz a marca para reavaliar na próxima janela.
        await pool.query(
            `UPDATE ${schema}.opportunities SET contacted_at = NULL, contacted_channel = NULL WHERE id = $1`,
            [opp.id]
        );
        return { blocked: true, motivo: r.motivo, variant: idx + 1 };
    }
    return { sent: true, variant: idx + 1, withLogo: !!logo };
};

module.exports = {
    enviarPrimeiroContato, renderTemplate, primeiroNome,
    MESSAGE_VARIANTS, DEFAULT_TEMPLATE, variantIndex,
};
