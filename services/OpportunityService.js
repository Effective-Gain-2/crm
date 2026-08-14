const pool = require('../db/queries');
const { v4: uuidv4 } = require('uuid');

// Cria uma oportunidade no pipeline.
const createOpportunity = async (
    { contact_number, funnel, stage_id, title, source, value, owner_id, utm_source, utm_medium, utm_campaign, ad_id, campaign_name },
    schema
) => {
    const id = uuidv4();
    const result = await pool.query(
        `INSERT INTO ${schema}.opportunities
            (id, contact_number, funnel, stage_id, title, source, value, owner_id, utm_source, utm_medium, utm_campaign, ad_id, campaign_name)
         VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 0), $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [id, contact_number || null, (funnel || '').toLowerCase(), stage_id || null, title || null, source || null, value, owner_id || null,
         utm_source || null, utm_medium || null, utm_campaign || null, ad_id || null, campaign_name || null]
    );
    const opp = result.rows[0];
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
            const phone = (lead.phone || '').replace(/\D/g, '') || null;
            const stageId = stageIds[lead.stage] || null;

            if (phone) {
                await poolq.query(
                    `INSERT INTO ${schema}.contacts (number, contact_name) VALUES ($1, $2)
                     ON CONFLICT (number) DO UPDATE SET contact_name = COALESCE(NULLIF(EXCLUDED.contact_name, ''), ${schema}.contacts.contact_name)`,
                    [phone, lead.contact_name || lead.title || '']
                );
                if (stageId) {
                    await poolq.query(`DELETE FROM ${schema}.contacts_stage WHERE contact_number = $1`, [phone]);
                    await poolq.query(
                        `INSERT INTO ${schema}.contacts_stage (contact_number, stage) VALUES ($1, $2)
                         ON CONFLICT DO NOTHING`, [phone, stageId]
                    );
                }
            }

            // idempotência: não duplica oportunidade com mesmo título+contato
            const dup = await poolq.query(
                `SELECT 1 FROM ${schema}.opportunities WHERE title = $1 AND contact_number IS NOT DISTINCT FROM $2 LIMIT 1`,
                [lead.title || lead.contact_name || phone || 'Lead', phone]
            );
            if (dup.rows[0]) { skipped++; continue; }

            await poolq.query(
                `INSERT INTO ${schema}.opportunities
                    (contact_number, funnel, stage_id, title, source, value, status, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, COALESCE($6, 0), COALESCE($7, 'open'),
                         COALESCE($8::timestamp, now()), COALESCE($9::timestamp, now()))`,
                [phone, sector, stageId, lead.title || lead.contact_name || phone || 'Lead',
                 lead.source || null, lead.value, lead.status, lead.created_at || null, lead.updated_at || null]
            );
            imported++;
        } catch (e) {
            skipped++;
        }
    }
    return { imported, skipped, stages: Object.keys(stageIds).length };
};

module.exports = {
    importLeads,
    createOpportunity,
    getOpportunitiesByFunnel,
    getOpportunitiesByStage,
    getOpportunityById,
    moveOpportunityStage,
    updateOpportunity,
    deleteOpportunity,
    getForecastByFunnel,
};
