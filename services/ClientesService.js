const pool = require('../db/queries');

const createCliente = async (cliente, schema) => {
  const result = await pool.query(
    `INSERT INTO ${schema}.clientes (id, nome, numero, email, idade) 
     VALUES (gen_random_uuid(), $1, $2, $3, $4) 
     RETURNING *`,
    [cliente.nome || null, cliente.numero || null, cliente.email || null, cliente.idade || null]
  );
  return result.rows[0];
};

const getAllClientes = async (schema) => {
  const result = await pool.query(`SELECT * FROM ${schema}.clientes ORDER BY nome ASC`);
  return result.rows;
};

const getClienteById = async (id, schema) => {
  const result = await pool.query(`SELECT * FROM ${schema}.clientes WHERE id = $1`, [id]);
  return result.rows[0];
};

const updateCliente = async (id, cliente, schema) => {
  const result = await pool.query(
    `UPDATE ${schema}.clientes 
     SET nome = $1, numero = $2, email = $3, idade = $4 
     WHERE id = $5 RETURNING *`,
    [cliente.nome || null, cliente.numero || null, cliente.email || null, cliente.idade || null, id]
  );
  return result.rows[0];
};

const deleteCliente = async (id, schema) => {
  await pool.query(`DELETE FROM ${schema}.clientes WHERE id = $1`, [id]);
};

module.exports = { createCliente, getAllClientes, getClienteById, updateCliente, deleteCliente };
