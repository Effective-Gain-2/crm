// Primeiro contato automático com lead novo (WhatsApp de boas-vindas).
//
// Fluxo: um lead novo entra (via ingestão HubSpot) → cria a oportunidade →
// dispara UMA mensagem de apresentação → marca contacted_at no CRM.
//
// Garantias:
// - Idempotência dupla: só dispara se contacted_at IS NULL (não remanda em reprocesso).
// - Compliance: o envio passa por sendTextMessage, que já embute ComplianceService
//   (teto diário, anti-repetição, lista fria, ban monitor). NÃO há bypass.
// - Sem link na 1ª mensagem (padrão que menos marca spam).
const pool = require('../db/queries');
const { getSetting } = require('./IntegrationService');
const { sendTextMessage } = require('../requests/evolution');

// Template B (neutro — verdadeiro tanto para "pediu contato" quanto "cadastro novo").
// Editável por tenant via integration_settings.key = 'welcome_template'.
const DEFAULT_TEMPLATE =
    'Olá, {primeiro_nome}! Tudo bem?\n' +
    'Aqui é {atendente}, da unidade do Cartão de Todos em {unidade}.\n' +
    'Vi seu cadastro aqui com a gente e passei para me apresentar. ' +
    'Se precisar de qualquer coisa — agendamento, dúvida sobre o cartão, o que for — pode falar por aqui.';

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

// Dispara o primeiro contato para UMA oportunidade recém-criada.
// opp: linha de opportunities (precisa de id, contact_number, title).
// Retorna { sent, skipped, blocked, motivo }.
const enviarPrimeiroContato = async (schema, opp) => {
    if (!opp || !opp.id) return { skipped: true, motivo: 'oportunidade inválida' };
    if (!opp.contact_number) return { skipped: true, motivo: 'sem telefone' };

    // Trava de idempotência no banco: marca a INTENÇÃO antes de enviar, de forma
    // atômica. Se outra execução da varredura já pegou este lead, o UPDATE não
    // afeta linha e não mandamos duplicado.
    const trava = await pool.query(
        `UPDATE ${schema}.opportunities
            SET contacted_at = now(), contacted_channel = 'whatsapp'
          WHERE id = $1 AND contacted_at IS NULL
        RETURNING id`,
        [opp.id]
    );
    if (!trava.rows[0]) return { skipped: true, motivo: 'já contatado' };

    const instancia = await getSetting(schema, 'welcome_instance');       // conexão WhatsApp da unidade
    const atendente = await getSetting(schema, 'welcome_atendente');
    const unidade = await getSetting(schema, 'welcome_unidade');
    const template = (await getSetting(schema, 'welcome_template')) || DEFAULT_TEMPLATE;

    if (!instancia) {
        // Sem conexão configurada ainda: deixa contacted_at marcado como intenção,
        // mas registra que o envio não saiu — evita "perder" o lead silenciosamente.
        await pool.query(
            `UPDATE ${schema}.opportunities SET contacted_channel = 'pendente_sem_conexao' WHERE id = $1`,
            [opp.id]
        );
        return { skipped: true, motivo: 'welcome_instance não configurada' };
    }

    const texto = renderTemplate(template, { nome: opp.title, atendente, unidade });

    // origem 'disparo' ativa as guardas de disparo em massa do ComplianceService.
    // O {primeiro_nome} varia o texto por lead, então a checagem de "texto idêntico"
    // não trava o fluxo — mas continua protegendo contra reenvio em massa acidental.
    const r = await sendTextMessage(instancia, texto, opp.contact_number, null, 'disparo');

    if (r && r.blocked) {
        // Compliance barrou: desfaz a marca para reavaliar na próxima janela.
        await pool.query(
            `UPDATE ${schema}.opportunities SET contacted_at = NULL, contacted_channel = NULL WHERE id = $1`,
            [opp.id]
        );
        return { blocked: true, motivo: r.motivo };
    }
    return { sent: true };
};

module.exports = { enviarPrimeiroContato, renderTemplate, DEFAULT_TEMPLATE, primeiroNome };
