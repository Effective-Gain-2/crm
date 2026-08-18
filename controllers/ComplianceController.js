const { statusDasConexoes } = require('../services/ComplianceService');
const pool = require('../db/queries');

// Painel de risco por numero: quanto ja saiu hoje, quanto falta, pausas e bloqueios.
const statusController = async (req, res) => {
  try {
    const schema = req.params?.schema || req.auth?.schema;
    const result = await statusDasConexoes(schema);
    res.status(200).json(result);
  } catch (error) {
    console.error('Compliance status:', error.message);
    res.status(500).json({ error: 'Nao foi possivel ler o status de compliance' });
  }
};

// Ultimos bloqueios (auditoria) — para entender POR QUE algo nao saiu
const bloqueiosController = async (req, res) => {
  try {
    const schema = req.params?.schema || req.auth?.schema;
    const r = await pool.query(
      `SELECT e.created_at, e.contact_phone, e.tipo, e.origem, e.motivo, c.name AS conexao
         FROM ${schema}.envio_log e
         LEFT JOIN ${schema}.connections c ON c.id::text = e.connection_id
        WHERE e.status = 'bloqueado'
        ORDER BY e.created_at DESC
        LIMIT 100`
    );
    res.status(200).json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Nao foi possivel ler os bloqueios' });
  }
};

// Ajuste por numero: teto manual (null = automatico pelo warm-up), bloquear lista fria
// e retomada manual de uma conexao pausada.
const configurarController = async (req, res) => {
  try {
    const schema = req.body?.schema || req.auth?.schema;
    const { connection_id, limite_diario, bloquear_frios, retomar } = req.body || {};
    if (!connection_id) return res.status(400).json({ error: 'connection_id obrigatorio' });

    if (limite_diario !== undefined) {
      await pool.query(`UPDATE ${schema}.connections SET limite_diario = $2 WHERE id = $1`,
        [connection_id, limite_diario === null || limite_diario === '' ? null : Number(limite_diario)]);
    }
    if (bloquear_frios !== undefined) {
      await pool.query(`UPDATE ${schema}.connections SET bloquear_frios = $2 WHERE id = $1`,
        [connection_id, !!bloquear_frios]);
    }
    if (retomar) {
      await pool.query(`UPDATE ${schema}.connections SET bloqueado_ate = NULL, bloqueio_motivo = NULL WHERE id = $1`,
        [connection_id]);
    }
    const result = await statusDasConexoes(schema);
    res.status(200).json(result);
  } catch (error) {
    console.error('Compliance configurar:', error.message);
    res.status(500).json({ error: 'Nao foi possivel salvar a configuracao' });
  }
};

module.exports = { statusController, bloqueiosController, configurarController };
