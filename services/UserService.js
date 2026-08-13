const pool = require('../db/queries')
const { hash, compare } = require('bcrypt');

const createUser = async (user, schema) => {

  const passwordHash = await hash(user.getPassword(), 10);

    const result = await pool.query(
        `INSERT INTO ${schema}.users (id, name, email, password, permission) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
            user.getId(),
            user.getName(),
            user.getEmail(),
            passwordHash,
            user.getPermission()
        ]
    );

    return result.rows[0];
};

const changePassword = async (user_mail, new_password, schema) => {
  const passwordHash = await hash(new_password, 10)

  const result = await pool.query(
    `UPDATE ${schema}.users SET password = $1 WHERE email = $2 RETURNING *`,
    [passwordHash, user_mail]
  );

  return result.rows[0];
}

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

const getIp = async(req)=>{
   if (!req || !req.headers) {
     return 'unknown';
   }
   let ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection?.remoteAddress || 'unknown';
  if (Array.isArray(ip)) ip = ip[0];
  if (ip && ip.includes(',')) ip = ip.split(',')[0];
  return ip ? ip.replace('::ffff:', '').trim() : 'unknown';
}



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
    console.log(userId, schema)
    const result = await pool.query(
      `UPDATE ${schema}.users SET online=false WHERE id=$1`,[userId]
    )
    console.log(`✅ Usuário ${userId} marcado como offline. Linhas afetadas: ${result.rowCount}`);
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
    changeOnline, 
  changeOffline, 
  getOnlineUsers, 
  getLastAssignedUser, 
  updateLastAssignedUser,
  deleteUser,
  updateUser,
  getUserById,
  getIp,
};