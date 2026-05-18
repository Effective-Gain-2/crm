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
    const { ensureShiftColumns } = require('./ShiftService');
    await ensureShiftColumns(schema);
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
        `SELECT * FROM ${schema}.users WHERE email = $1`,
        [userMail]
      );
      
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const isValidPassword = await compare(userPassword, user.password);
        if (!isValidPassword) {
          throw new Error('Senha incorreta');
        } else {
          const companyName = await pool.query(
            `SELECT * FROM effective_gain.companies WHERE schema_name = $1`,
            [schema]
          );
          return {
            company: companyName.rows[0],
            user: user
          };
        }
      }
    } catch (err) {
      if (!err.message.includes("relation") && !err.message.includes("does not exist")) {
        console.error(`Erro no schema ${schema}:`, err.message);
      }
    }
  }

  return null; 
};

  const updateUser=async(userId, userName, userEmail, userRole, schema, opts = {})=>{
    const { ensureShiftColumns } = require('./ShiftService');
    await ensureShiftColumns(schema);
    const sets = ['name=$1', 'email=$2', 'permission=$3'];
    const values = [userName, userEmail, userRole];
    let idx = 4;
    if (opts.shift_start !== undefined) { sets.push(`shift_start=$${idx++}`); values.push(opts.shift_start || null); }
    if (opts.shift_end !== undefined)   { sets.push(`shift_end=$${idx++}`);   values.push(opts.shift_end   || null); }
    values.push(userId);
    const result = await pool.query(
      `UPDATE ${schema}.users SET ${sets.join(', ')} WHERE id=$${idx} RETURNING *`,
      values
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
    const result = await pool.query(`SELECT * FROM ${schema}.users WHERE online=true and permission ='user'`);
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
    // Validar parâmetros antes de executar
    if (!queue || !user_id || !schema) {
      console.error('Erro: Parâmetros inválidos para updateLastAssignedUser:', { queue, user_id, schema });
      throw new Error('Parâmetros inválidos para updateLastAssignedUser');
    }
    
    await pool.query(
      `DELETE FROM ${schema}.last_assigned_user WHERE queue_id = $1`,
      [queue]
    );
    await pool.query(
      `INSERT INTO ${schema}.last_assigned_user (queue_id, user_id) VALUES ($1, $2)`,
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

const getLoginAttempts = async(ip, schema)=>{
  const result = await pool.query(
    `SELECT * FROM ${schema}.login_data WHERE ip = $1`, [ip]
  );
  return result.rows[0] || null;
}

const saveLoginAttempt = async(ip, schema)=>{
  try {
    const existingAttempt = await pool.query(
      `SELECT * FROM ${schema}.login_data WHERE ip = $1`, [ip]
    );
    
    if (existingAttempt.rows.length > 0) {
      // Atualiza tentativa existente
      await pool.query(
        `UPDATE ${schema}.login_data SET attempts = attempts + 1, last_attempt = EXTRACT(EPOCH FROM NOW()) * 1000 WHERE ip = $1`,
        [ip]
      );
    } else {
      // Cria nova tentativa
      await pool.query(
        `INSERT INTO ${schema}.login_data (id, ip, attempts, last_attempt) VALUES (gen_random_uuid(), $1, 1, EXTRACT(EPOCH FROM NOW()) * 1000)`,
        [ip]
      );
    }
  } catch (error) {
    console.error('Erro ao salvar tentativa de login:', error);
  }
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
  getUserById,
  getIp,
  getLoginAttempts,
  saveLoginAttempt
};