const pool = require("../db/queries")

const getDailyCostController = async (req, res) => {
  const { call_date } = req.params;
  const tenant_id = req.schema;
  const total = await pool.query(`SELECT * FROM ${tenant_id}.v_dashboard_daily;`)
  const costs = await pool.query(`SELECT call_date, total_cost_brl, avg_cost_brl FROM ${tenant_id}.v_dashboard_daily WHERE tenant_id = $1 AND call_date = $2;`, [tenant_id, call_date])
  console.log(costs.rows, total.rows)
  return res.status(200).json(costs.rows[0] || { call_date, total_cost_brl: 0, avg_cost_brl: 0 })
}

const getVoiceSummaryController = async (req, res) => {
  try {

    const tenant_id = req.schema
    const days = req.params.days || 7

    const summary = await pool.query(`
      SELECT
        SUM(total_attempts) AS total_attempts,
        SUM(completed) AS completed,
        ROUND(AVG(pickup_pct),1) AS pickup_pct,
        ROUND(AVG(avg_duration_s),0) AS avg_duration_s,
        SUM(hot_count) AS hot_count,
        SUM(warm_count) AS warm_count,
        SUM(cold_count) AS cold_count,
        ROUND(SUM(total_cost_brl),2) AS total_cost_brl
      FROM ${tenant_id}.v_dashboard_daily
      WHERE tenant_id = $1
      AND call_date >= CURRENT_DATE - ($2 || ' days')::interval
    `, [tenant_id, days])

    return res.json(summary.rows[0])

  } catch (error) {
    console.error('Erro ao buscar summary', error)
    return res.status(500).json({ error: 'Erro interno' })
  }
}

const getVoiceTranscriptsController = async (req, res) => {
  try {
    const tenant_id = req.schema;
    const transcripts = await pool.query(
      `SELECT 
      vt.id,
      vt.call_id,
      vt.transcript_raw,
      vt.extracted_data,
      vt.extraction_at,
      vc.phone_dialed
    FROM ${tenant_id}.voice_transcripts vt
    LEFT JOIN ${tenant_id}.voice_calls vc 
      ON vc.id = vt.call_id
    ORDER BY vt.extraction_at DESC
    LIMIT 500;`
    );

    return res.status(200).json({ data: transcripts.rows });
  } catch (error) {
    console.error('Erro ao buscar transcricoes de voz', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
}

module.exports = { getDailyCostController, getVoiceSummaryController, getVoiceTranscriptsController }