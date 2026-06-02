/**
 * Endpoint público de cadastro — apenas autenticado via pre-shared key
 * (CRM_SERVICE_KEY). Pensado para ser chamado pelo BFF do allpfit ou por
 * uma página de signup pública.
 *
 * Modo de uso esperado:
 *   POST /api/signup
 *   Header: x-crm-service-key: <CRM_SERVICE_KEY>
 *   Body:   { name, email, password, permission?, schema? }
 *
 * Hash bcrypt cost 10 (mesmo do createUser do UserService).
 * Idempotente: se o e-mail já existir no schema, retorna 409 sem sobrescrever.
 */
const { Users } = require('../entities/Users');
const { createUser, searchUser } = require('../services/UserService');
const pool = require('../db/queries');
const { v4: uuidv4 } = require('uuid');

async function signupController(req, res) {
  // Auth via pre-shared key (NÃO use JWT aqui — é um endpoint pré-login)
  const serviceKey = req.headers['x-crm-service-key'];
  if (!serviceKey || serviceKey !== process.env.CRM_SERVICE_KEY) {
    return res.status(401).json({ error: 'invalid service key' });
  }

  const { name, email, password, permission, schema: bodySchema } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email e password são obrigatórios' });
  }
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'senha precisa de no mínimo 6 caracteres' });
  }

  const schema = bodySchema || req.headers['x-crm-schema'] || process.env.DEFAULT_SCHEMA;
  if (!schema) {
    return res.status(400).json({ error: 'schema não definido (envie via body, header x-crm-schema ou DEFAULT_SCHEMA env)' });
  }

  // Sanitiza schema — só letras, números e underscore (defesa contra injection
  // no template string da query). createUser usa ${schema} cru.
  if (!/^[a-zA-Z0-9_]+$/.test(schema)) {
    return res.status(400).json({ error: 'schema inválido' });
  }

  try {
    // Checa duplicata por e-mail dentro do schema
    const existing = await pool.query(
      `SELECT id, email FROM ${schema}.users WHERE email = $1`,
      [email]
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({
        error: 'email já cadastrado nesse schema',
        existing: { id: existing.rows[0].id, email: existing.rows[0].email },
      });
    }

    const user = new Users(
      uuidv4(),
      name,
      email,
      password,
      permission || 'admin'
    );

    const created = await createUser(user, schema);

    return res.status(201).json({
      success: true,
      user: {
        id:         created.id,
        name:       created.name,
        email:      created.email,
        permission: created.permission,
      },
      schema,
    });
  } catch (err) {
    console.error('[signup] erro:', err.message);
    return res.status(500).json({ error: 'erro interno ao criar usuário' });
  }
}

module.exports = { signupController };
