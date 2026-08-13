const axios = require('axios');
const crypto = require('crypto');
const pool = require('../db/queries');
const { createOpportunity } = require('../services/OpportunityService');

// Config via ambiente (piloto single-tenant; mapeamento por página pode virar tabela depois).
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const APP_SECRET = process.env.META_APP_SECRET;
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const LEADS_SCHEMA = process.env.META_LEADS_SCHEMA;                 // ex.: effective_gain
const LEADS_FUNNEL = process.env.META_LEADS_FUNNEL || 'Vendas';     // nome do funil (opportunities.funnel)
const LEADS_SECTOR = (process.env.META_LEADS_SECTOR                 // sufixo da tabela kanban_<sector>
    || LEADS_FUNNEL.charAt(0).toLowerCase() + LEADS_FUNNEL.slice(1));
const LEADS_STAGE = process.env.META_LEADS_STAGE || 'Novo Lead';    // etapa alvo (por nome)
const LEADS_SOURCE = process.env.META_LEADS_SOURCE || 'Meta ADs';
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v19.0';

// Aliases comuns dos campos do formulário (EN/PT).
const NAME_KEYS = ['full_name', 'name', 'nome', 'nome_completo', 'first_name'];
const PHONE_KEYS = ['phone_number', 'phone', 'telefone', 'celular', 'whatsapp'];
const EMAIL_KEYS = ['email', 'e-mail'];

const pickField = (fieldData, keys) => {
    if (!Array.isArray(fieldData)) return null;
    const item = fieldData.find((f) => keys.includes((f.name || '').toLowerCase()));
    return item && Array.isArray(item.values) ? item.values[0] : null;
};

const onlyDigits = (s) => (s ? String(s).replace(/\D/g, '') : '');

// GET — verificação do webhook (Meta envia hub.challenge).
const verifyWebhook = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token && token === VERIFY_TOKEN) {
        return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
};

// Resolve o id da etapa alvo no funil (por nome; fallback = etapa de menor pos).
const resolveStageId = async (schema, sector, stageName) => {
    try {
        const byName = await pool.query(
            `SELECT id FROM ${schema}.kanban_${sector} WHERE LOWER(etapa) = LOWER($1) LIMIT 1`,
            [stageName]
        );
        if (byName.rows[0]) return byName.rows[0].id;
        const first = await pool.query(
            `SELECT id FROM ${schema}.kanban_${sector} ORDER BY pos ASC NULLS LAST LIMIT 1`
        );
        return first.rows[0]?.id || null;
    } catch (e) {
        console.error('Meta leads: erro ao resolver etapa:', e.message);
        return null;
    }
};

const upsertContact = async (schema, number, name) => {
    if (!number) return;
    await pool.query(
        `INSERT INTO ${schema}.contacts (number, contact_name)
         VALUES ($1, $2)
         ON CONFLICT (number) DO UPDATE SET contact_name = COALESCE(EXCLUDED.contact_name, ${schema}.contacts.contact_name)`,
        [number, name || null]
    );
};

// Busca os dados do lead na Graph API a partir do leadgen_id.
const fetchLead = async (leadgenId) => {
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${leadgenId}`;
    const { data } = await axios.get(url, {
        params: { access_token: PAGE_ACCESS_TOKEN, fields: 'field_data,created_time,ad_id,form_id' },
    });
    return data;
};

const processLead = async (leadgenId) => {
    if (!LEADS_SCHEMA) {
        console.warn('Meta leads: META_LEADS_SCHEMA não configurado — lead ignorado.');
        return;
    }
    if (!PAGE_ACCESS_TOKEN) {
        console.warn('Meta leads: META_PAGE_ACCESS_TOKEN não configurado — não é possível buscar o lead.');
        return;
    }
    const lead = await fetchLead(leadgenId);
    const name = pickField(lead.field_data, NAME_KEYS);
    const phone = onlyDigits(pickField(lead.field_data, PHONE_KEYS));

    if (phone) await upsertContact(LEADS_SCHEMA, phone, name);

    const stageId = await resolveStageId(LEADS_SCHEMA, LEADS_SECTOR, LEADS_STAGE);
    const opportunity = await createOpportunity(
        {
            contact_number: phone || null,
            funnel: LEADS_FUNNEL,
            stage_id: stageId,
            title: name || phone || 'Lead Meta',
            source: LEADS_SOURCE,
            value: 0,
        },
        LEADS_SCHEMA
    );

    if (global.socketIoServer) {
        global.socketIoServer.emit('opportunityCreated', { schema: LEADS_SCHEMA, opportunity });
    }
    console.log(`Meta leads: oportunidade criada (${opportunity.id}) para lead ${leadgenId}`);
};

// POST — recebe notificações de leadgen.
const receiveWebhook = async (req, res) => {
    // Valida assinatura quando APP_SECRET configurado E rawBody disponível
    // (sem rawBody a validação daria falso-negativo, então é ignorada com aviso).
    if (APP_SECRET && req.rawBody) {
        const signature = req.headers['x-hub-signature-256'];
        const expected =
            'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(req.rawBody).digest('hex');
        if (!signature || signature !== expected) {
            console.warn('Meta leads: assinatura inválida.');
            return res.sendStatus(401);
        }
    } else if (APP_SECRET) {
        console.warn('Meta leads: APP_SECRET setado mas rawBody indisponível — validação de assinatura ignorada.');
    }

    // Responde rápido; processa em seguida (Meta exige 200 ágil).
    res.sendStatus(200);

    try {
        const entries = req.body?.entry || [];
        for (const entry of entries) {
            for (const change of entry.changes || []) {
                if (change.field === 'leadgen' && change.value?.leadgen_id) {
                    await processLead(change.value.leadgen_id);
                }
            }
        }
    } catch (error) {
        console.error('Meta leads: erro ao processar webhook:', error.response?.data || error.message);
    }
};

module.exports = { verifyWebhook, receiveWebhook };
