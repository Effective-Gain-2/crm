const pool = require("../db/queries");
const { v4: uuidv4 } = require("uuid");
const { get } = require("../routes/ConnectionRoutes");
const SocketServer = require("../server");
const { getContactByNumber } = require("./ContactService");

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

const insertContactInKanban = async (number, stage_id, schema) => {
  const result = await pool.query(`INSERT INTO ${schema}.contacts_stage(contact_number, stage) VALUES ($1, $2) RETURNING *`, [number, stage_id])
  return result.rows[0]
}

const updateContactInKanban = async (number, stage_id, schema) => {
  const result = await pool.query(`UPDATE ${schema}.contacts_stage SET stage=$1 WHERE contact_number=$2 RETURNING *`, [stage_id, number])
  return result.rows[0]
}

const insertInKanbanStage = async (stageName, sector, number, schema) => {
  // Verifica se a tabela do kanban existe
  const tableExists = await pool.query(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = $1 
      AND table_name = $2
    )`,
    [schema, `kanban_${sector}`]
  );

  if (!tableExists.rows[0].exists) {
    console.error(`Tabela kanban_${sector} não existe no esquema ${schema}`);
    return null;
  }

  // Busca o id da etapa
  const stageIdResult = await pool.query(
    `SELECT id FROM ${schema}.kanban_${sector} WHERE etapa=$1`,
    [stageName]
  );

  if (stageIdResult.rowCount === 0) {
    console.error(`Etapa ${stageName} não encontrada no kanban_${sector}`);
    return null;
  }
  const stageId = stageIdResult.rows[0].id;

  // Busca o contato
  const contact = await pool.query(
    `SELECT * FROM ${schema}.contacts WHERE number=$1`,
    [number]
  );
  if (contact.rowCount === 0) {
    console.error(`Contato ${number} não encontrado no schema ${schema}`);
    return null;
  }

  // Verifica se já existe relação na contacts_stage
  const existing = await pool.query(
    `SELECT * FROM ${schema}.contacts_stage WHERE contact_number=$1`,
    [number]
  );

  let result;
  if (existing.rowCount > 0) {
    // Atualiza a etapa do contato
    result = await pool.query(
      `UPDATE ${schema}.contacts_stage SET stage=$1 WHERE contact_number=$2 RETURNING *`,
      [stageId, number]
    );
  } else {
    // Insere o contato na etapa
    result = await pool.query(
      `INSERT INTO ${schema}.contacts_stage(contact_number, stage) VALUES ($1, $2) RETURNING *`,
      [number, stageId]
    );
  }

  // Emite evento de contato importado
  global.socketIoServer.to(`schema_${schema}`).emit('contatosImportados', {
    contato: contact.rows[0],
    sector: sector,
    schema: schema
  });

  return contact.rows[0];
}


const getChatsInKanbanStage = async (stage, schema) => {
  if (stage) {
    const result = await pool.query(
      `SELECT * FROM ${schema}.chats WHERE etapa_id=$1 AND status<>$2`,
      [stage, 'closed']
    );
    return result.rows;
  } else {
    console.error(`Etapa "${stage}" não encontrada no esquema "${schema}".`);
    return [];
  }
};

const getContactsInKanbanStage = async (stage, schema) => {
  if (stage) {
    // Busca todos os números de contato na etapa
    const result = await pool.query(
      `SELECT c.* FROM ${schema}.contacts_stage cs
       JOIN ${schema}.contacts c ON cs.contact_number = c.number
       WHERE cs.stage = $1`,
      [stage]
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
const deleteFunil = async (sector, schema) => {
  try {
    await pool.query(`DROP TABLE ${schema}.kanban_${sector} CASCADE`)
  } catch (error) {
    console.error(error)
  }
}
const deleteEtapa = async (etapa_id, sector, schema) => {
  await pool.query(
    `DELETE FROM ${schema}.kanban_${sector} where id=$1`, [etapa_id]
  )
  
}
const getCustomFields = async (schema) => {
  const result = await pool.query(
    `SELECT * FROM ${schema}.custom_fields`
  )
  return result.rows
}

module.exports = {
  createKanbanStage,
  insertInKanbanStage,
  getChatsInKanbanStage,
  getContactsInKanbanStage,
  getKanbanStages,
  getFunis,
  getChatsInKanban,
  changeKanbanStage,
  updateContactInKanban,
  updateStageName,
  updateStageIndex,
  createFunil,
  deleteFunil,
  deleteEtapa,
  getCustomFields
};