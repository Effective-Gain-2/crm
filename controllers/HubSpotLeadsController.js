// Ingestão de leads do HubSpot → cria oportunidade → primeiro contato WhatsApp.
//
// Aceita duas formas de entrada, para não depender do escopo que ainda não temos:
//  (A) Webhook nativo do HubSpot (quando o Private App existir): valida assinatura
//      X-HubSpot-Signature-v3 e busca o contato na API.
//  (B) Push da varredura por sessão (enquanto só há leitura): o coletor já manda os
//      campos do lead no corpo, autenticado por um bearer do tenant.
//
// Em ambos, a idempotência é por external_id (id do contato no HubSpot): reprocessar
// a mesma janela NÃO duplica card nem remanda mensagem.
const crypto = require('crypto');
const { createOpportunity } = require('../services/OpportunityService');
const { resolveLeadIdentity } = require('../services/LeadIdentityService');
const { enviarPrimeiroContato } = require('../services/LeadOutreachService');
const webhookEvents = require('../services/WebhookEventService');
const { getSetting } = require('../services/IntegrationService');
const { isValidSchema } = require('../utils/validateSchema');
const pool = require('../db/queries');

const LEADS_FUNNEL = 'vendas';
const LEADS_STAGE = 'Novo Lead';
const LEADS_SOURCE = 'HubSpot';

// Resolve a etapa alvo por nome; fallback = etapa de menor posição.
const resolveStageId = async (schema, stageName) => {
    try {
        const byName = await pool.query(
            `SELECT id FROM ${schema}.kanban_${LEADS_FUNNEL} WHERE LOWER(etapa) = LOWER($1) LIMIT 1`,
            [stageName]
        );
        if (byName.rows[0]) return byName.rows[0].id;
        const first = await pool.query(
            `SELECT id FROM ${schema}.kanban_${LEADS_FUNNEL} ORDER BY pos ASC NULLS LAST LIMIT 1`
        );
        return first.rows[0]?.id || null;
    } catch (e) {
        console.error('HubSpot leads: erro ao resolver etapa:', e.message);
        return null;
    }
};

// Aceita o formato que o coletor por sessão envia (já normalizado):
// { external_id, name, phone, email, lifecycle, created_at }
const normalizeIncoming = (raw = {}) => ({
    external_id: raw.external_id || raw.id || raw.vid || null,
    name: raw.name || raw.full_name || raw.nome || null,
    phone: raw.phone || raw.telefone || raw.whatsapp || null,
    email: raw.email || null,
    lifecycle: (raw.lifecycle || raw.lifecyclestage || '').toLowerCase(),
});

// Processa um lead: cria/reaproveita a oportunidade e dispara o 1º contato.
const processLead = async (schema, raw) => {
    const lead = normalizeIncoming(raw);
    if (!lead.phone) {
        return { skipped: true, motivo: 'sem telefone' };
    }

    const { contact_number, contact_email } = await resolveLeadIdentity(schema, {
        phone: lead.phone, email: lead.email, name: lead.name,
    });

    const stageId = await resolveStageId(schema, LEADS_STAGE);
    const opp = await createOpportunity(
        {
            contact_number,
            contact_email,
            funnel: LEADS_FUNNEL,
            stage_id: stageId,
            title: lead.name || contact_number || 'Lead HubSpot',
            source: LEADS_SOURCE,
            value: 0,
            utm_source: 'hubspot',
            external_provider: 'hubspot',
            external_id: lead.external_id,
        },
        schema
    );

    // createOpportunity devolve deduplicated:true quando o lead já existia. Nesse
    // caso NÃO tentamos contato de novo — o enviarPrimeiroContato também trava por
    // contacted_at, mas cortar aqui evita trabalho à toa.
    if (opp.deduplicated) {
        return { deduplicated: true, opportunity_id: opp.id };
    }

    if (global.socketIoServer) {
        global.socketIoServer.to(`schema_${schema}`).emit('opportunityCreated', { schema, opportunity: opp });
    }

    const contato = await enviarPrimeiroContato(schema, opp);
    return { created: true, opportunity_id: opp.id, contato };
};

// ---- GET: verificação (mantém compatibilidade com o handshake de webhook) ----
const verifyWebhook = async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const schema = req.params.schema;
    let expected = process.env.HUBSPOT_VERIFY_TOKEN;
    if (schema && await isValidSchema(schema)) {
        expected = (await getSetting(schema, 'hubspot_verify_token')) || expected;
    }
    if (mode === 'subscribe' && token && expected && token === expected) {
        return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
};

// ---- POST: recebe leads (webhook nativo OU push da varredura) ----
const receiveWebhook = async (req, res) => {
    const schema = req.params.schema && await isValidSchema(req.params.schema) ? req.params.schema : null;
    if (!schema) return res.status(400).json({ error: 'schema inválido' });

    // Autenticação: assinatura do HubSpot (webhook nativo) OU bearer do tenant (push).
    const clientSecret = await getSetting(schema, 'hubspot_client_secret');
    const pushToken = await getSetting(schema, 'hubspot_push_token');
    const sig = req.headers['x-hubspot-signature-v3'];
    const bearer = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');

    let authed = false;
    if (sig && clientSecret && req.rawBody) {
        // v3: HMAC-SHA256 sobre method+uri+body+timestamp. Simplificado ao corpo aqui;
        // a validação completa entra junto com a ativação do Private App.
        const expected = crypto.createHmac('sha256', clientSecret).update(req.rawBody).digest('base64');
        authed = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig)) ;
    } else if (pushToken && bearer) {
        authed = crypto.timingSafeEqual(Buffer.from(pushToken), Buffer.from(bearer));
    }
    if (!authed) return res.sendStatus(401);

    // Responde rápido; processa em seguida.
    res.sendStatus(200);

    // Aceita um lead único { ...campos } ou um lote { leads: [...] }.
    const items = Array.isArray(req.body?.leads) ? req.body.leads
        : (req.body?.entry ? [] : [req.body]);

    for (const raw of items) {
        const extId = raw?.external_id || raw?.id || null;
        const ev = await webhookEvents.record(schema, {
            provider: 'hubspot', event_type: 'lead', external_id: extId, payload: raw,
        });
        if (ev.duplicate) continue;  // já processado com sucesso antes
        try {
            await processLead(schema, raw);
            await webhookEvents.markDone(schema, ev.id);
        } catch (e) {
            console.error('HubSpot leads: erro ao processar:', e.message);
            await webhookEvents.markFailed(schema, ev.id, e);
        }
    }
};

module.exports = { verifyWebhook, receiveWebhook, processLead };
