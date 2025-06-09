const pool = require('../db/queries')


const createUser = async (user, schema) => {

    const result = await pool.query(
        `INSERT INTO ${schema}.users (id, name, email, password, permission) VALUES ($1, $2, $3, $4, $5)`,
        [
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getPassword(),
            user.getPermission()
        ]
    );

    return result.rows[0];
};

const getAllUsers = async (schema) => {
    const result = await pool.query(`SELECT * FROM ${schema}.users`);
    return result.rows;
};

const getUserById = async (user_id, schema)=>{
  const result = await pool.query(
    `select * from ${schema}.users where id=$1`,[user_id]
  )
  return result.rows[0]
}
const searchUser = async (userMail, userPassword) => {
    const availableSchemas = await pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    `);
  
    const schemaNames = availableSchemas.rows.map(row => row.schema_name);
  
    for (const schema of schemaNames) {
      try {
        const result = await pool.query(
          `SELECT * FROM ${schema}.users WHERE email = $1 AND password = $2`,
          [userMail, userPassword]
        );
        
        if (result.rows.length > 0) {
          const companyName = await pool.query(
            `SELECT * FROM effective_gain.companies WHERE schema_name = $1`,
            [schema]
          );

          return {
            company: companyName.rows[0],
            user: result.rows[0]
          };
        }
      } catch (err) {
        if (!err.message.includes("relation") && !err.message.includes("does not exist")) {
          console.error(`Erro no schema ${schema}:`, err.message);
        }
      }
    }
  
    return null; 
  };

  const updateUser=async(userId, userName, userEmail, userRole, schema)=>{
    const result = await pool.query(
      `UPDATE ${schema}.users SET name=$1, email=$2, permission=$3 WHERE id=$4`,
      [userName, userEmail, userRole, userId]
    )
    return result.rows[0]
  }

  const changeOnline = async(userId, schema)=>{
    const result = await pool.query(
      `UPDATE ${schema}.users SET online=true WHERE id=$1`,[userId]
    )
    return result.rows[0]
  }

  const changeOffline = async(userId, schema)=>{
    const result = await pool.query(
      `UPDATE ${schema}.users SET online=false WHERE id=$1`,[userId]
    )
    return result.rows[0]
  }

  const getOnlineUsers = async(schema)=>{
    const result = await pool.query(`SELECT * FROM ${schema}.users WHERE online=true`);
    return result.rows;
  }

  const getLastAssignedUser = async (queue, schema) => {
    const result = await pool.query(
      `SELECT user_id FROM ${schema}.last_assigned_user WHERE queue_id = $1`,
      [queue]
    );
    return result.rows[0] || null;
  };
  const updateLastAssignedUser = async (queue, user_id, schema) => {
    await pool.query(
      `INSERT INTO ${schema}.last_assigned_user (queue_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (queue_id) DO UPDATE SET user_id = $2`,
      [queue, user_id]
    );
};

const deleteUser = async(user_id, schema)=>{
  const result = await pool.query(
    `DELETE FROM ${schema}.users where id=$1`,[user_id]
  )
  if(result.rowCount>0){
    console.log("Excluido com sucesso")
  }
  
  return result.rows[0]
}

module.exports = { createUser, 
  getAllUsers, 
  searchUser, 
  changeOnline, 
  changeOffline, 
  getOnlineUsers, 
  getLastAssignedUser, 
  updateLastAssignedUser,
  deleteUser,
  updateUser,
  getUserById
};