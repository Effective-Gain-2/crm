const pool = require('../db/queries')

const createQueue=async(queue, super_user, distribution, schema)=>{
    const result = await pool.query(
        `INSERT INTO ${schema}.queues (id, name, color, users, superuser, distribution) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
            queue.getId(),
            queue.getName(),
            queue.getColor(),
            queue.getUsers(),
            super_user,
            distribution
        ]
    );
    return result.rows[0]
};

const addUserinQueue = async (username, queue, schema) => {
    const usuario = await pool.query(
        `SELECT * FROM ${schema}.users WHERE name=$1`,
        [username]
    );
    
    const userData = usuario.rows[0];

    if (!userData) {
        console.log("Usuário não encontrado.");
        return;
    }

    const queueExist = await pool.query(
        `SELECT * FROM ${schema}.queues WHERE name=$1`,
        [queue]
    )
    
    if (queueExist.rowCount > 0) {
        const result = await pool.query(
            `INSERT INTO ${schema}.queue_users (user_id, queue_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`, [userData.id, queueExist.rows[0].id] 
        )
        return result.rows[0];
    } else {
        console.log('Fila não encontrada');
    }
};

const getUserQueues = async(user_id, schema)=>{
    const queue = await pool.query(
        `SELECT * FROM ${schema}.queue_users where user_id=$1`,[user_id]
    )

    const queueData = [];

    for (let i = 0; i < queue.rowCount; i++) {
    const result = await pool.query(
        `SELECT * FROM ${schema}.queues WHERE id = $1`,
        [queue.rows[i].queue_id]
    );

    queueData.push(result.rows[0]);
    }

    return queueData;
}

const getChatsInQueue = async(QueueId, schema)=>{
    const result = await pool.query(
        `SELECT * FROM ${schema}.chats where queue_id=$1`, [QueueId]
    )
    return result.rows
}

const getAllQueues = async(schema)=>{
    const result = await pool.query(
        `SELECT * FROM ${schema}.queues`
    )
    return result.rows
}

const deleteQueue = async(queueId, schema)=>{
    const result = await pool.query(
        `DELETE FROM ${schema}.queues WHERE id=$1`, [queueId]
    )
    return result.rowCount > 0;
}

const getQueueById = async(queue_id, schema)=>{
    const result = await pool.query(
        `SELECT * FROM ${schema}.queues where id=$1`,[queue_id]
    )
    return result.rows
}

module.exports = {
    createQueue,
    addUserinQueue,
    getUserQueues, 
    getChatsInQueue,
    getAllQueues,
    deleteQueue,
    getQueueById
}