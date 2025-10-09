const pool = require("../db/queries")

const getAjudaMensagens = async () => {
    const result = await pool.query(`SELECT * FROM effective_gain.ajuda_textos`)
    return result.rows
}

const upsertAjudaTextos = async (section, texto) => {
    const result = await pool.query(`INSERT INTO effective_gain.ajuda_textos(section, texto) VALUES ($1, $2) ON CONFLICT (section) UPDATE SET texto=EXCLUDED.texto RETURNING *`, [section, texto])
    return result.rows[0]
}

module.exports={
    getAjudaMensagens,
    upsertAjudaTextos
}