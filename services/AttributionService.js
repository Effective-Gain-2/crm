const pool = require('../db/queries');

// Dimensões permitidas (whitelist -> coluna real). Evita SQL injection no GROUP BY.
const DIMENSIONS = {
    source: 'source',
    utm_source: 'utm_source',
    campaign: 'utm_campaign',
    campaign_name: 'campaign_name',
    ad: 'ad_id',
};

// Monta o filtro opcional (funnel + intervalo de datas).
const buildFilter = ({ funnel, from, to }) => {
    const clauses = [];
    const params = [];
    let i = 1;
    if (funnel) {
        clauses.push(`funnel = $${i++}`);
        params.push(funnel);
    }
    if (from) {
        clauses.push(`created_at >= $${i++}`);
        params.push(from);
    }
    if (to) {
        clauses.push(`created_at <= $${i++}`);
        params.push(to);
    }
    return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
};

// Relatório agregado por dimensão (fonte/campanha/ad).
const report = async (schema, { dimension = 'source', funnel, from, to } = {}) => {
    const col = DIMENSIONS[dimension] || 'source';
    const { where, params } = buildFilter({ funnel, from, to });
    const res = await pool.query(
        `SELECT COALESCE(NULLIF(${col}, ''), '(sem origem)') AS key,
                COUNT(*)::int AS leads,
                COALESCE(SUM(value), 0) AS total_value,
                COUNT(*) FILTER (WHERE status = 'won')::int AS won_count,
                COALESCE(SUM(value) FILTER (WHERE status = 'won'), 0) AS won_value,
                COALESCE(ROUND(AVG(score)), 0)::int AS avg_score
           FROM ${schema}.opportunities
           ${where}
          GROUP BY key
          ORDER BY leads DESC`,
        params
    );
    return res.rows.map((r) => ({
        ...r,
        conversion_rate: r.leads > 0 ? Math.round((r.won_count / r.leads) * 100) : 0,
    }));
};

// Totais gerais do período.
const summary = async (schema, { funnel, from, to } = {}) => {
    const { where, params } = buildFilter({ funnel, from, to });
    const res = await pool.query(
        `SELECT COUNT(*)::int AS leads,
                COALESCE(SUM(value), 0) AS total_value,
                COUNT(*) FILTER (WHERE status = 'won')::int AS won_count,
                COALESCE(SUM(value) FILTER (WHERE status = 'won'), 0) AS won_value,
                COALESCE(ROUND(AVG(score)), 0)::int AS avg_score
           FROM ${schema}.opportunities
           ${where}`,
        params
    );
    const row = res.rows[0] || {};
    return { ...row, conversion_rate: row.leads > 0 ? Math.round((row.won_count / row.leads) * 100) : 0 };
};

module.exports = { report, summary, DIMENSIONS };
