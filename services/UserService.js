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

  // ---- Elegibilidade para receber lead ----
  // Regra definida pelo Luiz: manda a JORNADA, nao o CRM aberto. Quem esta escalado
  // hoje neste horario recebe lead mesmo com o CRM fechado; quem o lider/master
  // inativou (falta) fica de fora. Sem jornada cadastrada = disponivel sempre, para
  // nao parar a distribuicao de quem ainda nao teve horario configurado.
  const getAvailableUsers = async (schema) => {
    const result = await pool.query(
      `SELECT u.* FROM ${schema}.users u
        WHERE COALESCE(u.inativo, false) = false
          AND (u.inativo_ate IS NULL OR u.inativo_ate < now())
          AND (
                NOT EXISTS (SELECT 1 FROM ${schema}.user_schedule s WHERE s.user_id = u.id)
                OR EXISTS (
                     SELECT 1 FROM ${schema}.user_schedule s
                      WHERE s.user_id = u.id
                        AND s.dia_semana = EXTRACT(DOW FROM (now() AT TIME ZONE 'America/Sao_Paulo'))
                        AND (now() AT TIME ZONE 'America/Sao_Paulo')::time BETWEEN s.hora_inicio AND s.hora_fim
                   )
              )`
    ).catch(async (e) => {
      // Base sem as colunas/tabela novas ainda: cai no comportamento antigo
      console.error('getAvailableUsers (fallback para online):', e.message);
      return await pool.query(`SELECT * FROM ${schema}.users WHERE online = true`);
    });
    return result.rows;
  };

  const getSchedule = async (schema, userId) => {
    const r = await pool.query(
      `SELECT dia_semana, to_char(hora_inicio,'HH24:MI') AS hora_inicio, to_char(hora_fim,'HH24:MI') AS hora_fim
         FROM ${schema}.user_schedule WHERE user_id = $1 ORDER BY dia_semana, hora_inicio`, [userId]
    ).catch(() => ({ rows: [] }));
    return r.rows;
  };

  // Substitui a jornada inteira do usuario (mais simples e previsivel que diffs)
  const setSchedule = async (schema, userId, faixas) => {
    await pool.query(`DELETE FROM ${schema}.user_schedule WHERE user_id = $1`, [userId]);
    for (const f of (faixas || [])) {
      if (f.dia_semana === undefined || !f.hora_inicio || !f.hora_fim) continue;
      await pool.query(
        `INSERT INTO ${schema}.user_schedule (user_id, dia_semana, hora_inicio, hora_fim) VALUES ($1,$2,$3,$4)`,
        [userId, Number(f.dia_semana), f.hora_inicio, f.hora_fim]
      );
    }
    return getSchedule(schema, userId);
  };

  // Ao inativar, os leads do colaborador nao podem ficar orfaos: voltam para o
  // rodizio (setUserChat escolhe entre quem esta escalado agora). Devolve o que moveu
  // para o lider ver o efeito da acao que acabou de tomar.
  const redistribuirLeadsDoUsuario = async (schema, userId) => {
    const { setUserChat } = require('./ChatService');
    const abertos = await pool.query(
      `SELECT id FROM ${schema}.chats WHERE assigned_user = $1 AND status <> 'closed'`, [userId]
    ).catch(() => ({ rows: [] }));
    let movidos = 0;
    for (const chat of abertos.rows) {
      await pool.query(`UPDATE ${schema}.chats SET assigned_user = NULL WHERE id = $1`, [chat.id]).catch(() => {});
      const r = await setUserChat(chat.id, schema).catch(() => null);
      if (r && r.assigned_user) movidos++;
    }
    return { total: abertos.rows.length, movidos };
  };

  const setInativo = async (schema, userId, { inativo, ate, motivo }) => {
    const r = await pool.query(
      `UPDATE ${schema}.users
          SET inativo = $2, inativo_ate = $3, inativo_motivo = $4
        WHERE id = $1 RETURNING id, name, inativo, inativo_ate, inativo_motivo`,
      [userId, !!inativo, ate || null, motivo || null]
    );
    return r.rows[0];
  };

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
  getAvailableUsers,
  getSchedule,
  setSchedule,
  setInativo,
  redistribuirLeadsDoUsuario, 
  getLastAssignedUser, 
  updateLastAssignedUser,
  deleteUser,
  updateUser,
  getUserById,
  getIp,
};