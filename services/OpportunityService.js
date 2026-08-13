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
        [id, contact_number || null, funnel, stage_id || null, title || null, source || null, value, owner_id || null,
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
const getOpportunitiesByFunnel = async (funnel, schema) => {
    const result = await pool.query(
        `SELECT o.*, c.contact_name AS contact_name, u.name AS owner_name
           FROM ${schema}.opportunities o
           LEFT JOIN ${schema}.contacts c ON c.number = o.contact_number
           LEFT JOIN ${schema}.users u ON u.id = o.owner_id
          WHERE o.funnel = $1
          ORDER BY o.updated_at DESC`,
        [funnel]
    );
    return result.rows;
};

// Lista oportunidades de uma etapa específica.
const getOpportunitiesByStage = async (stage_id, schema) => {
    const result = await pool.query(
        `SELECT o.*, c.contact_name AS contact_name, u.name AS owner_name
           FROM ${schema}.opportunities o
           LEFT JOIN ${schema}.contacts c ON c.number = o.contact_number
           LEFT JOIN ${schema}.users u ON u.id = o.owner_id
          WHERE o.stage_id = $1
          ORDER BY o.updated_at DESC`,
        [stage_id]
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
          WHERE funnel = $1 AND status = 'open'
          GROUP BY stage_id`,
        [funnel]
    );
    return result.rows;
};

module.exports = {
    createOpportunity,
    getOpportunitiesByFunnel,
    getOpportunitiesByStage,
    getOpportunityById,
    moveOpportunityStage,
    updateOpportunity,
    deleteOpportunity,
    getForecastByFunnel,
};
