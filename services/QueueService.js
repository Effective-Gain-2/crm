const pool = require('../db/queries')

const createQueue=async(queue, super_user, distribution, stage_id, schema)=>{
    const result = await pool.query(
        `INSERT INTO ${schema}.queues (id, name, color, users, superuser, distribution, stage_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
            queue.getId(),
            queue.getName(),
            queue.getColor(),
            queue.getUsers(),
            super_user,
            distribution,
            stage_id
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
        console.error("Usuário não encontrado.");
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
        console.error('Fila não encontrada');
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

const transferQueue = async (chatId, newQueueId, schema) => {
  const result = await pool.query(
    `UPDATE ${schema}.chats SET queue_id = $1, status=$3 WHERE id = $2 RETURNING *`,
    [newQueueId, chatId, 'open']
  );
  return result.rows[0];
};

const updateUserQueues = async (userId, queueIds, schema) => {
  try {
    await pool.query(
      `DELETE FROM ${schema}.queue_users WHERE user_id = $1`,
      [userId]
    );

    if (queueIds && queueIds.length > 0) {
      for (const queueId of queueIds) {
        await pool.query(
          `INSERT INTO ${schema}.queue_users (user_id, queue_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, queueId]
        );
      }
    }

    return { success: true, message: 'Filas do usuário atualizadas com sucesso' };
  } catch (error) {
    console.error('Erro ao atualizar filas do usuário:', error);
    throw error;
  }
};

const updateWebhookUrl = async(queue_id, webhook_url, schema)=>{
    const result = await pool.query(
        `UPDATE ${schema}.queues SET webhook_url=$1 WHERE id=$2 RETURNING *`,[webhook_url, queue_id]
    )
    return result.rows[0]
}

const toggleWebhookStatus = async(queue_id, status, schema)=>{
    const result = await pool.query(
        `UPDATE ${schema}.queues SET is_webhook_on=$1 WHERE id=$2 RETURNING *`,[status, queue_id]
    )
    return result.rows[0]
}

const getUsersInQueue = async (queue_id, schema) => {
    const result = await pool.query(
        `SELECT * FROM ${schema}.queue_users WHERE queue_id=$1`,[queue_id]
    )
    return result.rows
}

const updateQueue = async (queueId, name, color, super_user, distribution, stage_id, schema) => {
    const result = await pool.query(
        `UPDATE ${schema}.queues SET name=$1, color=$2, superuser=$3, stage_id=$6, distribution=$4 WHERE id=$5 RETURNING *`,
        [name, color, super_user, distribution, queueId, stage_id]
    );
    return result.rows[0];
};

const updateAssistantId = async (queue_id, assistant_id, schema) => {
    // Garante que a coluna existe — schemas antigos podem não ter sido
    // re-provisionados desde que a feature de bot foi adicionada.
    await pool.query(`ALTER TABLE ${schema}.queues ADD COLUMN IF NOT EXISTS assistant_id text`)
    const result = await pool.query(`UPDATE ${schema}.queues SET assistant_id=$1 WHERE id=$2 RETURNING *`,[assistant_id, queue_id])
    return result.rows[0]
}


module.exports = {
    createQueue,
    addUserinQueue,
    getUserQueues, 
    getChatsInQueue,
    getAllQueues,
    deleteQueue,
    getQueueById,
    transferQueue,
    updateUserQueues,
    updateWebhookUrl,
    toggleWebhookStatus,
    getUsersInQueue,
    updateQueue,
    updateAssistantId
};
