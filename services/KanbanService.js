const pool = require("../db/queries");
const { v4: uuidv4 } = require("uuid");
const { get } = require("../routes/ConnectionRoutes");

const createKanbanStage = async (name, pos, color, sector, schema) => {
  const stageExists = await pool.query(
    `SELECT * FROM ${schema}.kanban_${sector} WHERE etapa=$1`,
    [name]
  );
  if (stageExists.rowCount > 0) {
    return stageExists.rows[0];
  } else {
    const result = await pool.query(
      `INSERT INTO ${schema}.kanban_${sector} (id, etapa, pos, color) VALUES ($1, $2, $3, $4) RETURNING *`,
      [uuidv4(), name, pos, color]
    );
    return result.rows[0];
  }
};

const insertInKanbanStage = async (stageName, connection_id, number, schema) => {
  const stageId = await pool.query(
    `SELECT id FROM ${schema}.kanban_vendas WHERE etapa=$1`,
    [stageName]
  );

  if (stageId.rowCount > 0) {
    const existingChat = await pool.query(
      `SELECT * FROM ${schema}.chats WHERE connection_id=$1 AND contact_phone=$2`,
      [connection_id, number]
    );

    if (existingChat.rowCount > 0) {
      const result = await pool.query(
        `UPDATE ${schema}.chats SET etapa_id=$1 WHERE connection_id=$2 AND contact_phone=$3 RETURNING *`,
        [stageId.rows[0].id, connection_id, number]
      );
      console.log("Chat atualizado:", result.rows[0]);
      return result.rows[0];
    } else {
      const contactName = await pool.query(
        `SELECT contact_name FROM ${schema}.contacts WHERE number=$1`,
        [number]
      );
      const queueId = await pool.query(
        `SELECT * FROM ${schema}.connections WHERE id=$1`,
        [connection_id]
      )
      const newChat = await pool.query(
        `INSERT INTO ${schema}.chats 
         (id, chat_id, connection_id, queue_id, isgroup, contact_name, assigned_user, status, created_at, messages, contact_phone, etapa_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [
          uuidv4(), 
          `${number}@s.whatsapp.net`, 
          connection_id,
          queueId.rows[0].queue_id,
          false,
          contactName.rows[0]?.contact_name ?? 'Sem nome',
          null,
          null,
          new Date().getTime(), 
          JSON.stringify([]),
          number,
          stageId.rows[0].id
        ]
      );
    return newChat.rows[0];
    }
  } else {
    console.error(`Etapa "${stageName}" não encontrada no esquema "${schema}".`);
    return null;
  }
};

const getChatsInKanbanStage = async (stage, sector, schema) => {
  const stageId = await pool.query(
    `SELECT id FROM ${schema}.kanban_${sector} WHERE etapa=$1`,
    [stage]
  );

  if (stageId.rowCount > 0) {
    const result = await pool.query(
      `SELECT * FROM ${schema}.chats WHERE etapa_id=$1`,
      [stageId.rows[0].id]
    );
    return result.rows;
  } else {
    console.error(`Etapa "${stage}" não encontrada no esquema "${schema}".`);
    return [];
  }
};

const getKanbanStages = async(funil, schema)=>{
  const stages = await pool.query(
    `SELECT * FROM ${schema}.kanban_${funil} `  
  )
  return stages.rows
}

const getFunis = async (schema) => {
  try{
    const kanbans = await pool.query(
      `SELECT tablename FROM pg_tables WHERE schemaname=$1 and tablename LIKE 'kanban_%'`,[schema]
    )
    const funis = kanbans.rows.map(item => {
    return item.tablename.split('_')[1]; 
    });
    return {
      name: funis
    }
  }catch(error) {
    console.error('Erro ao buscar funis:', error);
    return [];
  }
}
const getChatsInKanban = async (sector, schema) => {
  try {
    const etapas = await pool.query(
      `SELECT id FROM ${schema}.kanban_${sector}`
    );
    const etapaIds = etapas.rows.map(e => e.id);

    if (etapaIds.length === 0) return [];

    const chats = await pool.query(
      `SELECT * FROM ${schema}.chats WHERE etapa_id = ANY($1::uuid[]) and status <> 'closed'`,
      [etapaIds]
    );

    return chats.rows;
  } catch (error) {
    console.error(error);
    return [];
  }
};

const changeKanbanStage = async (chat_id, stage_id, schema) => {
  await pool.query(
    `UPDATE ${schema}.chats set etapa_id=$1 where id=$2`,
    [stage_id, chat_id]
  )

}

const updateStageName = async (etapa_id, etapa_nome, color, sector, schema) => {
  if(color){
    await pool.query(
    `UPDATE ${schema}.kanban_${sector} set etapa=$1, color=$3 where id=$2`,[etapa_nome, etapa_id, color]
  )
  }else{
    await pool.query(
        `UPDATE ${schema}.kanban_${sector} set etapa=$1 where id=$2`,[etapa_nome, etapa_id]
      )
  }
}

const updateStageIndex = async (etapa_id, index, sector, schema) => {
  await pool.query(
    `UPDATE ${schema}.kanban_${sector} set pos=$1 where id=$2`,[index, etapa_id]
  )
}

const createFunil = async (sector, schema) => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS ${schema}.kanban_${sector}(
      id uuid primary key,
      etapa text not null,
      pos int,
      color text
    )`
  )
}
const deleteEtapa = async (etapa_id, sector, schema) => {
  await pool.query(
    `DELETE FROM ${schema}.kanban_${sector} where id=$1`, [etapa_id]
  )
  
}
module.exports = {
  createKanbanStage,
  insertInKanbanStage,
  getChatsInKanbanStage,
  getKanbanStages,
  getFunis,
  getChatsInKanban,
  changeKanbanStage,
  updateStageName,
  updateStageIndex,
  createFunil,
  deleteEtapa
};