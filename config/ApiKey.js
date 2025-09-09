const pool = require("../db/queries");
const crypto = require('crypto');

const createAPIKey = async () => {
    const apiKey = crypto.randomBytes(32).toString('hex');
    await pool.query(`INSERT INTO effective_gain.api_keys(chave) VALUES($1)`, [apiKey]);
    return apiKey;
  };

  const verifyAPIKey = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.headers.authorization?.split(' ')[1];
    
    if (!apiKey) {
      return res.status(401).json({ message: 'API key não fornecida' });
    }
    
    try {
      const result = await pool.query(`
        SELECT * FROM effective_gain.api_keys 
        WHERE chave = $1
      `, [apiKey]);
      
      if (result.rows.length === 0) {
        return res.status(401).json({ message: 'API key inválida ou expirada' });
      }
      
      req.apiKey = result.rows[0];

      next();
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao verificar API key' });
    }
  };

module.exports={
    createAPIKey,
    verifyAPIKey
}