const pool = require("../db/queries")

const createConnection = async(connection, schema)=>{
    const connectionExists = await pool.query(
        `SELECT * FROM ${schema}.connections WHERE number=$1`, [connection.getNumber()]
    )
    if(connectionExists.rowCount>0){
        return connectionExists.rows[0]
    }else{
        const result = await pool.query(`INSERT INTO ${schema}.connections (id, name, number) VALUES ($1, $2, $3)`,
        [
            connection.getId(),
            connection.getName(),
            connection.getNumber()
        ]
        );
        return result.rows[0]
    }
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
const setQueue = async(connectionNumber, queueName, schema)=>{
    const queueId = await pool.query(
        `SELECT id FROM ${schema}.queues WHERE name=$1`, [queueName]
    )
    if(queueId.rowCount>0){
        const result = await pool.query(`UPDATE ${schema}.connections SET queue_id=$1 WHERE number=$2`,
        [
            queueId.rows[0].id,
            connectionNumber
        ]
        );
        return result.rows[0]
    }
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
    deleteConnection
}