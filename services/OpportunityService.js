const pool = require('../db/queries');
const { v4: uuidv4 } = require('uuid');
const { normalizeSource } = require('../utils/normalizeSource');
const { resolveLeadIdentity } = require('./LeadIdentityService');

// Cria uma oportunidade no pipeline.
//
// external_provider + external_id (opcionais): identidade do lead no sistema de origem.
// Quando informados, a criação vira idempotente — o HubSpot reenvia o mesmo evento em
// caso de timeout e o Meta reprocessa o mesmo leadgen_id, e nenhum dos dois pode virar
// card duplicado. Reenvio devolve a oportunidade que já existe, sem erro.
const createOpportunity = async (
    { contact_number, contact_email, funnel, stage_id, title, source, value, owner_id, utm_source, utm_medium, utm_campaign, ad_id, campaign_name, external_provider, external_id },
    schema
) => {
    const id = uuidv4();
    // provider nunca fica NULL quando há id: NULL não conflita em índice único,
    // e a idempotência sumiria justamente no caso que ela existe para cobrir.
    const extProvider = external_id ? (external_provider || 'external') : null;
    const extId = external_id || null;

    const result = await pool.query(
        `INSERT INTO ${schema}.opportunities
            (id, contact_number, contact_email, funnel, stage_id, title, source, value, owner_id, utm_source, utm_medium, utm_campaign, ad_id, campaign_name, external_provider, external_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 0), $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (external_provider, external_id) WHERE external_id IS NOT NULL AND external_id <> ''
         DO NOTHING
         RETURNING *`,
        [id, contact_number || null, contact_email || null, (funnel || '').toLowerCase(), stage_id || null, title || null,
         normalizeSource(source), value, owner_id || null,
         utm_source || null, utm_medium || null, utm_campaign || null, ad_id || null, campaign_name || null,
         extProvider, extId]
    );

    // DO NOTHING não devolve linha: o lead já tinha sido processado. Busca o card
    // existente para que o chamador receba sempre uma oportunidade válida.
    if (!result.rows[0]) {
        const existing = await pool.query(
            `SELECT * FROM ${schema}.opportunities
              WHERE external_provider IS NOT DISTINCT FROM $1 AND external_id = $2 LIMIT 1`,
            [extProvider, extId]
        );
        if (existing.rows[0]) return { ...existing.rows[0], deduplicated: true };
        throw new Error('Falha ao criar oportunidade');
    }

    const opp = result.rows[0];
    // Relogio do lead: marca a ENTRADA nesta etapa (updated_at nao serve — muda em
    // qualquer edicao e faria o lead parecer trabalhado quando nao foi).
    try {
        const { registrarEtapa } = require('./LeadClockService');
        await registrarEtapa(schema, 'oportunidade', id, stage_id);
    } catch (e) { /* relogio nao pode derrubar a movimentacao */ }
    try {
        const { recomputeOpportunity } = require('./LeadScoreService');
        opp.score = await recomputeOpportunity(schema, opp);
    } catch (e) { /* scoring é opcional */ }
    return opp;
};

// Lista oportunidades de um funil, com nome do contato e do proprietário (para o Kanban).
// Paginado por padrão: sem limite, um funil com milhares de leads devolvia ~3 MB
// numa resposta só e travava a tela. O front pede mais por etapa conforme rola.
const getOpportunitiesByFunnel = async (funnel, schema, { limit = 200, offset = 0 } = {}) => {
    const lim = Math.min(Math.max(Number(limit) || 200, 1), 2000);
    const off = Math.max(Number(offset) || 0, 0);
    const result = await pool.query(
        `SELECT o.*, c.contact_name AS contact_name, u.name AS owner_name
           FROM ${schema}.opportunities o
           LEFT JOIN ${schema}.contacts c ON c.number = o.contact_number
           LEFT JOIN ${schema}.users u ON u.id = o.owner_id
          WHERE lower(o.funnel) = lower($1)
          ORDER BY o.updated_at DESC
          LIMIT $2 OFFSET $3`,
        [funnel, lim, off]
    );
    return result.rows;
};

// Lista oportunidades de uma etapa específica (paginada — uma etapa pode ter milhares).
const getOpportunitiesByStage = async (stage_id, schema, { limit = 50, offset = 0 } = {}) => {
    const lim = Math.min(Math.max(Number(limit) || 50, 1), 500);
    const off = Math.max(Number(offset) || 0, 0);
    const result = await pool.query(
        `SELECT o.*, c.contact_name AS contact_name, u.name AS owner_name
           FROM ${schema}.opportunities o
           LEFT JOIN ${schema}.contacts c ON c.number = o.contact_number
           LEFT JOIN ${schema}.users u ON u.id = o.owner_id
          WHERE o.stage_id = $1
          ORDER BY o.updated_at DESC
          LIMIT $2 OFFSET $3`,
        [stage_id, lim, off]
    );
    return result.rows;
};

const getOpportunityById = async (id, schema) => {
    const result = await pool.query(
        `SELECT o.*, c.contact_name AS contact_name, u.name AS owner_name
           FROM ${schema}.opportunities o
           LEFT JOIN ${schema}.contacts c ON c.number = o.contact_number
           LEFT JOIN ${schema}.users u ON u.id = o.owner_id
          WHERE o.id = $1`,
        [id]
    );
    return result.rows[0];
};

// Move a oportunidade de etapa (drag-and-drop no Kanban).
const moveOpportunityStage = async (id, stage_id, schema) => {
    const result = await pool.query(
        `UPDATE ${schema}.opportunities
            SET stage_id = $1, updated_at = now()
          WHERE id = $2
          RETURNING *`,
        [stage_id, id]
    );
    const opp = result.rows[0];
    try {
        const { recomputeOpportunity } = require('./LeadScoreService');
        opp.score = await recomputeOpportunity(schema, opp);
    } catch (e) { /* scoring é opcional */ }
    return opp;
};

// Atualiza campos editáveis da oportunidade (value, source, owner, title, status, stage).
const updateOpportunity = async (id, fields, schema) => {
    const allowed = ['title', 'source', 'value', 'owner_id', 'status', 'stage_id', 'contact_number'];
    const sets = [];
    const values = [];
    let i = 1;
    for (const key of allowed) {
        if (fields[key] !== undefined) {
            sets.push(`${key} = $${i++}`);
            values.push(fields[key]);
        }
    }
    if (sets.length === 0) return getOpportunityById(id, schema);
    values.push(id);
    const result = await pool.query(
        `UPDATE ${schema}.opportunities
            SET ${sets.join(', ')}, updated_at = now()
          WHERE id = $${i}
          RETURNING *`,
        values
    );
    const opp = result.rows[0];
    try {
        const { recomputeOpportunity } = require('./LeadScoreService');
        opp.score = await recomputeOpportunity(schema, opp);
    } catch (e) { /* scoring é opcional */ }
    return opp;
};

const deleteOpportunity = async (id, schema) => {
    await pool.query(`DELETE FROM ${schema}.opportunities WHERE id = $1`, [id]);
    return { id };
};

// Forecast: total e contagem por etapa de um funil.
const getForecastByFunnel = async (funnel, schema) => {
    const result = await pool.query(
        `SELECT stage_id,
                COUNT(*)::int AS count,
                COALESCE(SUM(value), 0) AS total_value
           FROM ${schema}.opportunities
          WHERE lower(funnel) = lower($1) AND status = 'open'
          GROUP BY stage_id`,
        [funnel]
    );
    return result.rows;
};

// Importação em massa (histórico de outra plataforma) — idempotente por (title, contact_number)
const importLeads = async ({ funnel, stages, leads }, schema) => {
    const poolq = pool;
    const sector = (funnel || 'vendas').toLowerCase();

    // 1) Funil + etapas na ordem informada
    await poolq.query(`CREATE TABLE IF NOT EXISTS ${schema}.kanban_${sector}(
        id uuid primary key, etapa text not null, pos int, color text)`);
    const stageIds = {};
    for (let i = 0; i < (stages || []).length; i++) {
        const nome = stages[i].name;
        const cor = stages[i].color || '#6c757d';
        const found = await poolq.query(`SELECT id FROM ${schema}.kanban_${sector} WHERE etapa = $1`, [nome]);
        if (found.rows[0]) {
            stageIds[nome] = found.rows[0].id;
            await poolq.query(`UPDATE ${schema}.kanban_${sector} SET pos = $1 WHERE id = $2`, [i, found.rows[0].id]);
        } else {
            const ins = await poolq.query(
                `INSERT INTO ${schema}.kanban_${sector} (id, etapa, pos, color) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING id`,
                [nome, i, cor]
            );
            stageIds[nome] = ins.rows[0].id;
        }
    }

    // 2) Leads
    let imported = 0, skipped = 0;
    for (const lead of (leads || [])) {
        try {
            const stageId = stageIds[lead.stage] || null;
            // Telefone continua sendo a chave; e-mail entra como identidade secundária
            // (import do HubSpot traz lead sem telefone, que antes era descartado).
            const { contact_number: phone, contact_email: email } = await resolveLeadIdentity(schema, {
                phone: lead.phone,
                email: lead.email,
                name: lead.contact_name || lead.title,
            });

            if (phone) {
                if (stageId) {
                    await poolq.query(`DELETE FROM ${schema}.contacts_stage WHERE contact_number = $1`, [phone]);
                    await poolq.query(
                        `INSERT INTO ${schema}.contacts_stage (contact_number, stage) VALUES ($1, $2)
                         ON CONFLICT DO NOTHING`, [phone, stageId]
                    );
                }
            }

            const title = lead.title || lead.contact_name || phone || email || 'Lead';
            const extId = lead.external_id || null;
            const extProvider = extId ? (lead.external_provider || 'external') : null;

            // Idempotência: quando o lead traz id de origem, ELE é a chave (o mesmo
            // contato pode legitimamente ter dois negócios com o mesmo título).
            // Sem id de origem, mantém o critério antigo título+contato.
            if (extId) {
                const dup = await poolq.query(
                    `SELECT 1 FROM ${schema}.opportunities
                      WHERE external_provider IS NOT DISTINCT FROM $1 AND external_id = $2 LIMIT 1`,
                    [extProvider, extId]
                );
                if (dup.rows[0]) { skipped++; continue; }
            } else {
                const dup = await poolq.query(
                    `SELECT 1 FROM ${schema}.opportunities WHERE title = $1 AND contact_number IS NOT DISTINCT FROM $2 LIMIT 1`,
                    [title, phone]
                );
                if (dup.rows[0]) { skipped++; continue; }
            }

            await poolq.query(
                `INSERT INTO ${schema}.opportunities
                    (contact_number, contact_email, funnel, stage_id, title, source, value, status, created_at, updated_at, external_provider, external_id)
                 VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 0), COALESCE($8, 'open'),
                         COALESCE($9::timestamp, now()), COALESCE($10::timestamp, now()), $11, $12)
                 ON CONFLICT (external_provider, external_id) WHERE external_id IS NOT NULL AND external_id <> ''
                 DO NOTHING`,
                [phone, email, sector, stageId, title,
                 normalizeSource(lead.source), lead.value, lead.status, lead.created_at || null, lead.updated_at || null,
                 extProvider, extId]
            );
            imported++;
        } catch (e) {
            skipped++;
        }
    }
    return { imported, skipped, stages: Object.keys(stageIds).length };
};

// Toda conversa NOVA do WhatsApp (não vinda de Meta Ads/HubSpot) também entra no funil —
// senão o contato só existe em Chats e nunca aparece como lead em Oportunidades/Kanban.
// Não duplica: se o contato já tem oportunidade aberta neste funil, não cria outra.
// Se o funil ainda não tem etapas configuradas nesta empresa, não cria card órfão sem etapa.
const WHATSAPP_LEAD_FUNNEL = 'vendas';
const WHATSAPP_LEAD_STAGE = 'Novo Lead';

const createOpportunityFromWhatsApp = async (schema, { contact_number, title }) => {
    if (!contact_number) return null;
    try {
        const existing = await pool.query(
            `SELECT id FROM ${schema}.opportunities WHERE funnel = $1 AND contact_number = $2 LIMIT 1`,
            [WHATSAPP_LEAD_FUNNEL, contact_number]
        );
        if (existing.rows[0]) return null;

        const byName = await pool.query(
            `SELECT id FROM ${schema}.kanban_${WHATSAPP_LEAD_FUNNEL} WHERE LOWER(etapa) = LOWER($1) LIMIT 1`,
            [WHATSAPP_LEAD_STAGE]
        ).catch(() => ({ rows: [] }));
        let stageId = byName.rows[0]?.id;
        if (!stageId) {
            const first = await pool.query(
                `SELECT id FROM ${schema}.kanban_${WHATSAPP_LEAD_FUNNEL} ORDER BY pos ASC NULLS LAST LIMIT 1`
            ).catch(() => ({ rows: [] }));
            stageId = first.rows[0]?.id;
        }
        if (!stageId) return null;

        return await createOpportunity(
            { contact_number, funnel: WHATSAPP_LEAD_FUNNEL, stage_id: stageId, title: title || contact_number, source: 'WhatsApp', value: 0 },
            schema
        );
    } catch (e) {
        console.error('createOpportunityFromWhatsApp:', e.message);
        return null;
    }
};

module.exports = {
    importLeads,
    createOpportunity,
    createOpportunityFromWhatsApp,
    getOpportunitiesByFunnel,
    getOpportunitiesByStage,
    getOpportunityById,
    moveOpportunityStage,
    updateOpportunity,
    deleteOpportunity,
    getForecastByFunnel,
};
