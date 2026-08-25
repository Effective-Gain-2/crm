const pool = require('../db/queries')

const createQueue=async(queue, super_user, distribution, schema)=>{
    const result = await pool.query(
        `INSERT INTO ${schema}.queues (id, name, color, users, superuser, distribution) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
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

// Simétrico ao updateUserQueues, mas do lado da fila: troca o conjunto de
// atendentes DESTA fila sem tocar nas outras filas de cada usuário.
// Em transação: sem isso, uma falha entre o DELETE e os INSERTs deixaria a fila VAZIA —
// que é justamente o estado em que a distribuição automática manda tudo para espera.
const setQueueUsers = async (queueId, userIds, schema) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM ${schema}.queue_users WHERE queue_id = $1`, [queueId]
    );
    for (const userId of userIds || []) {
      await client.query(
        `INSERT INTO ${schema}.queue_users (user_id, queue_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
        [userId, queueId]
      );
    }
    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Números (conexões WhatsApp) que atendem esta fila. O vínculo mora em
// connections.queue_id — uma conexão serve UMA fila, uma fila pode ter várias conexões.
// É daqui que o chat herda a fila (ChatService: connections.queue_id -> chats.queue_id).
const getQueueConnections = async (queueId, schema) => {
  const result = await pool.query(
    `SELECT id, name, number, status FROM ${schema}.connections WHERE queue_id = $1 ORDER BY name`,
    [queueId]
  );
  return result.rows;
};

// Troca o conjunto de conexões DESTA fila: solta as que saíram e prende as que entraram.
// Em transação — um estado parcial deixaria número sem fila (chat cai em espera) ou
// número apontando para fila errada.
const setQueueConnections = async (queueId, connectionIds, schema) => {
  const ids = connectionIds || [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Solta as conexões que apontavam para esta fila e não estão mais na lista.
    await client.query(
      `UPDATE ${schema}.connections SET queue_id = NULL
        WHERE queue_id = $1 AND NOT (id = ANY($2::uuid[]))`,
      [queueId, ids]
    );
    if (ids.length > 0) {
      // Prende as escolhidas. Uma conexão que servia outra fila passa a servir esta.
      await client.query(
        `UPDATE ${schema}.connections SET queue_id = $1 WHERE id = ANY($2::uuid[])`,
        [queueId, ids]
      );
    }
    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
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

// Edição da fila. A tela de Filas manda só nome/superusuário/distribuição — a cor não
// aparece no formulário, então COALESCE preserva a que já está gravada em vez de apagá-la
// a cada salvamento. superuser é nullable (ON DELETE SET NULL): '' vira NULL.
const updateQueue = async (queueId, name, color, super_user, distribution, schema) => {
    const result = await pool.query(
        `UPDATE ${schema}.queues
            SET name = $1,
                color = COALESCE($2, color),
                superuser = $3,
                distribution = COALESCE($4, false)
          WHERE id = $5
      RETURNING *`,
        [name, color ?? null, super_user || null, distribution, queueId]
    );
    return result.rows[0];
};

// ---- Liderança de fila (papel LIDER) ----
// Fila liderada = queues.superuser = local_user_id do líder.
const getLedQueues = async (userId, schema) => {
    const result = await pool.query(
        `SELECT id FROM ${schema}.queues WHERE superuser = $1`, [userId]
    );
    return result.rows.map(r => r.id);
};

// Todos os user_ids das filas lideradas (a equipe do líder), incluindo ele mesmo.
const getTeamUserIds = async (userId, schema) => {
    const result = await pool.query(
        `SELECT DISTINCT qu.user_id
           FROM ${schema}.queue_users qu
           JOIN ${schema}.queues q ON q.id = qu.queue_id
          WHERE q.superuser = $1`,
        [userId]
    );
    const ids = new Set(result.rows.map(r => r.user_id));
    ids.add(userId);
    return [...ids];
};

module.exports = {
    createQueue,
    getUserQueues,
    getChatsInQueue,
    getAllQueues,
    deleteQueue,
    getQueueById,
    transferQueue,
    updateUserQueues,
    setQueueUsers,
    getQueueConnections,
    setQueueConnections,
    updateWebhookUrl,
    toggleWebhookStatus,
    getUsersInQueue,
    updateQueue,
    getLedQueues,
    getTeamUserIds
};
