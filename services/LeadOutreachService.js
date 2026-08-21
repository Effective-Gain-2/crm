// Primeiro contato automático com lead novo (WhatsApp de boas-vindas).
//
// Fluxo: um lead novo entra (via ingestão HubSpot) → cria a oportunidade →
// dispara UMA mensagem de apresentação → marca contacted_at no CRM.
//
// Garantias:
// - Idempotência dupla: só dispara se contacted_at IS NULL (não remanda em reprocesso).
// - Compliance: o envio passa por sendTextMessage/sendMediaForBlast, que já embutem o
//   ComplianceService (teto diário, anti-repetição, lista fria, ban monitor). SEM bypass.
// - 5 variações de texto (catálogo WELCOME), escolhidas de forma DETERMINÍSTICA por lead:
//   mesmo lead → mesma variação; leads diferentes → textos diferentes → a trava de
//   anti-repetição do Compliance não dispara.
// - Toda mensagem traz o telefone da unidade no corpo (fallback anti-ban) e o nome.
// - Logo (opcional): welcome_media_urls (1 por variação) → sai imagem+legenda.
const pool = require('../db/queries');
const { getSetting } = require('./IntegrationService');
const { sendTextMessage, sendMediaForBlast } = require('../requests/evolution');
const { WELCOME, renderMessage, variantIndex, primeiroNome } = require('./MessageTemplates');

// Compat: config antiga referenciava estes nomes.
const MESSAGE_VARIANTS = WELCOME;
const DEFAULT_TEMPLATE = WELCOME[0];
const renderTemplate = (tpl, { nome, atendente, unidade, telefone } = {}) =>
    renderMessage(tpl, { nome, atendente, unidade, telefone });

// Lê as variações do tenant: welcome_templates (JSON) → welcome_template → WELCOME.
const carregarVariacoes = async (schema) => {
    const raw = await getSetting(schema, 'welcome_templates');
    if (raw) {
        try {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr) && arr.length) return arr.filter((t) => typeof t === 'string' && t.trim());
        } catch (_) { /* fallback */ }
    }
    const single = await getSetting(schema, 'welcome_template');
    if (single) return [single];
    return WELCOME;
};

// Logos opcionais, uma por variação (mesma ordem).
const carregarMidias = async (schema) => {
    const raw = await getSetting(schema, 'welcome_media_urls');
    if (!raw) return [];
    try {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch (_) { return []; }
};

// Dispara o primeiro contato para UMA oportunidade recém-criada.
// Retorna { sent, skipped, blocked, motivo, variant, withLogo }.
const enviarPrimeiroContato = async (schema, opp) => {
    if (!opp || !opp.id) return { skipped: true, motivo: 'oportunidade inválida' };
    if (!opp.contact_number) return { skipped: true, motivo: 'sem telefone' };

    // Trava de idempotência atômica: marca a INTENÇÃO antes de enviar.
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
    const telefone = await getSetting(schema, 'welcome_unit_phone'); // fallback anti-ban no corpo

    if (!instancia) {
        await pool.query(
            `UPDATE ${schema}.opportunities SET contacted_channel = 'pendente_sem_conexao' WHERE id = $1`,
            [opp.id]
        );
        return { skipped: true, motivo: 'welcome_instance não configurada' };
    }

    const variacoes = await carregarVariacoes(schema);
    const midias = await carregarMidias(schema);
    const idx = variantIndex(opp.external_id || opp.id, variacoes.length);
    const texto = renderMessage(variacoes[idx], { nome: opp.title, atendente, unidade, telefone });
    const logo = midias[idx] || null;

    const r = logo
        ? await sendMediaForBlast(instancia, texto, logo, opp.contact_number)
        : await sendTextMessage(instancia, texto, opp.contact_number, null, 'disparo');

    if (r && r.blocked) {
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
