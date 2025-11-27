const pool = require('../db/queries');

exports.getAjudaTextos = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT section, texto FROM effective_gain.ajuda_textos');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar textos de ajuda.' });
  }
};

exports.updateAjudaTexto = async (req, res) => {
  const { section, texto } = req.body;
  try {
    await pool.query(
      'UPDATE effective_gain.ajuda_textos SET texto = $1 WHERE section = $2',
      [texto, section]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar texto de ajuda.' });
  }
};