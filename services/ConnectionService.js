const pool = require("../db/queries")

const createConnection = async(connection, schema)=>{
    const connectionExists = await pool.query(
        `SELECT * FROM ${schema}.connections WHERE number=$1`, [connection.getNumber()]
    )
    if(connectionExists.rowCount>0){
        const existing = connectionExists.rows[0];
        // Instância recriada na Evolution → novo instanceId. Atualiza o vínculo
        // (antes mantinha o id antigo: chats duplicados + chat sem fila a cada mensagem).
        if (existing.id !== connection.getId()) {
            await pool.query(
                `UPDATE ${schema}.chats SET connection_id=$1 WHERE connection_id=$2`,
                [connection.getId(), existing.id]
            ).catch(() => {});
            const updated = await pool.query(
                `UPDATE ${schema}.connections SET id=$1, name=$2, status='connecting' WHERE number=$3 RETURNING *`,
                [connection.getId(), connection.getName(), connection.getNumber()]
            );
            return updated.rows[0];
        }
        return existing;
    }else{
        const result = await pool.query(
            `INSERT INTO ${schema}.connections (id, name, number, status) VALUES ($1, $2, $3, 'connecting') RETURNING *`,
        [
            connection.getId(),
            connection.getName(),
            connection.getNumber()
        ]
        );
        return result.rows[0]
    }
}

// Status da conexão (connected/disconnected/connecting) — alimentado pelo webhook CONNECTION_UPDATE
const setConnectionStatusByName = async (instanceName, status, schema) => {
    const result = await pool.query(
        `UPDATE ${schema}.connections SET status=$1 WHERE name=$2 RETURNING *`,
        [status, instanceName]
    );
    return result.rows[0];
}
const fetchInstance = async(schema)=>{
    const result = await pool.query(
        `SELECT * FROM ${schema}.connections`
    )
    return result.rows
}
const searchConnById = async (instanceId, schema) => {
    try {
      const query = `
        SELECT * 
        FROM "${schema}".connections 
        WHERE id = $1
      `;
      const result = await pool.query(query, [instanceId]);
      return result.rows[0];
    } catch (err) {
      console.error('Erro ao buscar conexão por ID:', err);
      throw err;
    }
};
const setQueue = async(connection_id, queue_id, schema)=>{
    const result = await pool.query(`UPDATE ${schema}.connections SET queue_id=$1 WHERE id=$2 RETURNING *`,
    [
        queue_id,
        connection_id
    ]
    );
    return result.rows[0]
}

const getAllConnections = async (schema) => {
    try {
        const result = await pool.query(`SELECT * FROM ${schema}.connections`);
        return result.rows;
    } catch (error) {
        console.error('Erro ao buscar todas as conexões:', error.message);
        throw new Error('Erro ao buscar todas as conexões');
    }
};

const deleteConnection = async (connection_id, schema) => {
    try {
        const result = await pool.query(
            `DELETE FROM ${schema}.connections where id=$1`,[connection_id]
        )
        return result.rows
    } catch (error) {
        console.error(error)
    }
}


module.exports = {
    createConnection,
    fetchInstance,
    searchConnById,
    setQueue,
    getAllConnections,
    deleteConnection,
    setConnectionStatusByName
}