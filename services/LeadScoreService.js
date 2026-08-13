const pool = require('../db/queries');

// Campos avaliáveis da oportunidade e como extrair o valor.
const fieldValue = (opp, field) => {
    switch (field) {
        case 'source': return opp.source;
        case 'value': return opp.value;
        case 'stage_id': return opp.stage_id;
        case 'title': return opp.title;
        case 'has_phone':
        case 'contact_number': return opp.contact_number;
        case 'owner': return opp.owner_id;
        default: return opp[field];
    }
};

const matches = (opp, rule) => {
    const v = fieldValue(opp, rule.field);
    const target = rule.value;
    switch (rule.operator) {
        case 'equals':
            return v != null && String(v).toLowerCase() === String(target || '').toLowerCase();
        case 'contains':
            return v != null && String(v).toLowerCase().includes(String(target || '').toLowerCase());
        case 'gt':
            return Number(v) > Number(target);
        case 'gte':
            return Number(v) >= Number(target);
        case 'exists':
            return v !== null && v !== undefined && String(v).trim() !== '';
        default:
            return false;
    }
};

const listRules = async (schema) => {
    const res = await pool.query(`SELECT * FROM ${schema}.lead_score_rules ORDER BY created_at ASC`);
    return res.rows;
};

const getActiveRules = async (schema) => {
    const res = await pool.query(`SELECT * FROM ${schema}.lead_score_rules WHERE active = true`);
    return res.rows;
};

const createRule = async (schema, { name, field, operator, value, points, active }) => {
    const res = await pool.query(
        `INSERT INTO ${schema}.lead_score_rules (name, field, operator, value, points, active)
         VALUES ($1, $2, $3, $4, $5, COALESCE($6, true)) RETURNING *`,
        [name, field, operator, value ?? null, Number(points) || 0, active]
    );
    return res.rows[0];
};

const deleteRule = async (schema, id) => {
    await pool.query(`DELETE FROM ${schema}.lead_score_rules WHERE id = $1`, [id]);
    return { id };
};

// Calcula o score de uma oportunidade a partir das regras ativas.
const computeScore = async (schema, opp, rules = null) => {
    const activeRules = rules || (await getActiveRules(schema));
    let score = 0;
    for (const rule of activeRules) {
        if (matches(opp, rule)) score += Number(rule.points) || 0;
    }
    return score;
};

// Recalcula e persiste o score de uma oportunidade.
const recomputeOpportunity = async (schema, opp) => {
    try {
        const score = await computeScore(schema, opp);
        await pool.query(`UPDATE ${schema}.opportunities SET score = $1 WHERE id = $2`, [score, opp.id]);
        return score;
    } catch (e) {
        console.error('LeadScore: erro ao recalcular:', e.message);
        return opp.score || 0;
    }
};

// Recalcula todas as oportunidades abertas do tenant.
const recomputeAll = async (schema) => {
    const rules = await getActiveRules(schema);
    const opps = await pool.query(`SELECT * FROM ${schema}.opportunities WHERE status = 'open'`);
    let updated = 0;
    for (const opp of opps.rows) {
        const score = await computeScore(schema, opp, rules);
        await pool.query(`UPDATE ${schema}.opportunities SET score = $1 WHERE id = $2`, [score, opp.id]);
        updated++;
    }
    return { updated };
};

module.exports = {
    listRules,
    createRule,
    deleteRule,
    computeScore,
    recomputeOpportunity,
    recomputeAll,
};
