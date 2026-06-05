const pool = require('../db/queries');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const TagService = require('./TagService');
const KanbanService = require('./KanbanService');

const KEY_NAME = 'lead_webhook';

// Tabela de chaves de integração por schema. Uma chave ativa por "name"
// (regenerar substitui a anterior, invalidando-a). Padrão defensivo.
const ensureIntegrationKeys = async (schema) => {
  await pool.query(`CREATE TABLE IF NOT EXISTS ${schema}.integration_keys (
    name TEXT PRIMARY KEY,
    token TEXT NOT NULL,
    created_at BIGINT
  )`);
};

const getApiKey = async (schema) => {
  await ensureIntegrationKeys(schema);
  const r = await pool.query(`SELECT token, created_at FROM ${schema}.integration_keys WHERE name = $1`, [KEY_NAME]);
  return r.rows[0] || null;
};

const regenerateApiKey = async (schema) => {
  await ensureIntegrationKeys(schema);
  const token = crypto.randomBytes(24).toString('hex');
  const r = await pool.query(
    `INSERT INTO ${schema}.integration_keys (name, token, created_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (name) DO UPDATE SET token = EXCLUDED.token, created_at = EXCLUDED.created_at
     RETURNING token, created_at`,
    [KEY_NAME, token, Date.now()]
  );
  return r.rows[0];
};

const validateApiKey = async (schema, token) => {
  if (!token) return false;
  const current = await getApiKey(schema);
  return !!current && current.token === token;
};

// Resolve uma etapa de kanban por numeric_id OU uuid (varre todos os funis).
const resolveStage = async (idOrNumeric, schema) => {
  const raw = String(idOrNumeric || '').trim();
  if (!raw) return null;
  const stages = await KanbanService.getAllStages(schema);
  if (/^\d{6,}$/.test(raw)) {
    const byNum = stages.find((s) => String(s.numeric_id) === raw);
    if (byNum) return byNum;
  }
  return stages.find((s) => String(s.id) === raw) || null;
};

// Cria um lead: contato + chat (vira card do kanban via etapa_id), opcionalmente
// com tag e etapa. Dispara os triggers lead_created / tag_added / kanban_stage_changed.
const createLead = async ({ number, name, tag, kanban }, schema) => {
  const { fireTrigger } = require('./WorkflowTrigger');
  const contactNumber = String(number).trim();
  const contactName = (name && String(name).trim()) || contactNumber;

  // 1. upsert contato
  await pool.query(
    `INSERT INTO ${schema}.contacts (number, contact_name) VALUES ($1, $2)
     ON CONFLICT (number) DO UPDATE SET contact_name = COALESCE(${schema}.contacts.contact_name, EXCLUDED.contact_name)`,
    [contactNumber, contactName]
  );

  // 2. resolve tag e etapa (aceitam numeric_id ou uuid)
  const tagRow = tag ? await TagService.resolveTag(tag, schema) : null;
  const stageRow = kanban ? await resolveStage(kanban, schema) : null;
  const stageId = stageRow ? stageRow.id : null;

  // 3. cria o chat (lead). connection/queue nulos — é um lead avulso.
  const chatId = uuidv4();
  const now = Date.now();
  const chatResult = await pool.query(
    `INSERT INTO ${schema}.chats
       (id, chat_id, connection_id, queue_id, isGroup, contact_name, assigned_user, status, created_at, messages, contact_phone, etapa_id, updated_time, unreadmessages)
     VALUES ($1, $2, NULL, NULL, false, $3, NULL, 'open', $4, '[]'::jsonb, $5, $6, $7, false)
     RETURNING *`,
    [chatId, contactNumber, contactName, now, contactNumber, stageId, now]
  );
  const chat = chatResult.rows[0];

  // 4. tag -> chat_tag + contacts_stage quando houver etapa
  if (tagRow) {
    await pool.query(
      `INSERT INTO ${schema}.chat_tag (chat_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [chatId, tagRow.id]
    );
  }
  if (stageId) {
    await pool.query(
      `INSERT INTO ${schema}.contacts_stage (stage, contact_number) VALUES ($1, $2)
       ON CONFLICT (contact_number, stage) DO NOTHING`,
      [stageId, contactNumber]
    );
  }

  const context = {
    trigger: 'lead_created',
    chat,
    contact: { name: contactName, number: contactNumber },
    lead: { number: contactNumber, name: contactName },
    tag_id: tagRow ? tagRow.id : null,
    stage_id: stageId,
  };

  // 5. dispara triggers (fire-and-forget)
  fireTrigger(schema, 'lead_created', { ...context, tag_id: context.tag_id, stage_id: context.stage_id });
  if (tagRow) fireTrigger(schema, 'tag_added', { ...context, tag_id: tagRow.id });
  if (stageId) fireTrigger(schema, 'kanban_stage_changed', { ...context, from_stage_id: null, to_stage_id: stageId });

  // 6. avisa a UI ao vivo
  if (global.socketIoServer) {
    global.socketIoServer.to(`schema_${schema}`).emit('chats_updated', chat);
    if (stageId) global.socketIoServer.to(`schema_${schema}`).emit('leadMoved', { chat_id: chatId, stage_id: stageId });
    if (tagRow) global.socketIoServer.to(`schema_${schema}`).emit('tagUpdated', { chat_id: chatId, tag_id: tagRow.id, checked: true });
  }

  return {
    chat,
    contact: { number: contactNumber, name: contactName },
    tag: tagRow ? { id: tagRow.id, name: tagRow.name, numeric_id: tagRow.numeric_id } : null,
    stage: stageRow ? { id: stageRow.id, etapa: stageRow.etapa, funil: stageRow.funil, numeric_id: stageRow.numeric_id } : null,
  };
};

// Lista os leads (= contatos) do schema, enriquecidos com etapa do kanban e
// tags (derivadas dos chats do contato).
const listLeads = async (schema) => {
  const contacts = await pool.query(
    `SELECT number, contact_name FROM ${schema}.contacts ORDER BY contact_name NULLS LAST, number`
  );

  // mapa stage_uuid -> nome da etapa
  const stages = await KanbanService.getAllStages(schema);
  const stageById = {};
  for (const s of stages) stageById[String(s.id)] = s.etapa;

  // mapa number -> stage_uuid
  const cs = await pool.query(`SELECT contact_number, stage FROM ${schema}.contacts_stage`);
  const stageByNumber = {};
  for (const row of cs.rows) stageByNumber[row.contact_number] = row.stage;

  // mapa number -> [tags]
  const tagRows = await pool.query(
    `SELECT ch.contact_phone AS number, array_agg(DISTINCT t.name) AS tags
       FROM ${schema}.chats ch
       JOIN ${schema}.chat_tag ct ON ct.chat_id = ch.id
       JOIN ${schema}.tag t ON t.id = ct.tag_id
      GROUP BY ch.contact_phone`
  ).catch(() => ({ rows: [] }));
  const tagsByNumber = {};
  for (const row of tagRows.rows) tagsByNumber[row.number] = row.tags || [];

  return contacts.rows.map((c) => ({
    number: c.number,
    name: c.contact_name,
    stage: stageById[String(stageByNumber[c.number])] || null,
    tags: tagsByNumber[c.number] || [],
  }));
};

// Remove um lead (contato) e tudo que depende dele: chats do contato (e seus
// chat_tag/messages), placement no kanban e custom values.
const deleteLead = async (number, schema) => {
  const chats = await pool.query(`SELECT id FROM ${schema}.chats WHERE contact_phone = $1`, [number]);
  const ids = chats.rows.map((r) => r.id);
  if (ids.length) {
    await pool.query(`DELETE FROM ${schema}.chat_tag WHERE chat_id = ANY($1::uuid[])`, [ids]);
    await pool.query(`DELETE FROM ${schema}.messages WHERE chat_id = ANY($1::uuid[])`, [ids]);
    await pool.query(`DELETE FROM ${schema}.chats WHERE id = ANY($1::uuid[])`, [ids]);
  }
  await pool.query(`DELETE FROM ${schema}.contacts_stage WHERE contact_number = $1`, [number]);
  try { await pool.query(`DELETE FROM ${schema}.contact_custom_values WHERE contact_number = $1`, [number]); } catch (_) {}
  const r = await pool.query(`DELETE FROM ${schema}.contacts WHERE number = $1`, [number]);
  return r.rowCount > 0;
};

const deleteLeads = async (numbers, schema) => {
  let deleted = 0;
  for (const number of (numbers || [])) {
    // eslint-disable-next-line no-await-in-loop
    if (await deleteLead(number, schema)) deleted++;
  }
  return { deleted };
};

// Apaga 100% dos leads (contatos) — GUARDA: só permitido no effective_gain.
// Nenhum outro schema pode ter seus leads apagados em massa por esta função.
const deleteAllLeads = async (schema) => {
  if (schema !== 'effective_gain') {
    throw new Error('Exclusão em massa permitida apenas no schema effective_gain');
  }
  const counts = {};
  const safe = async (label, sql) => {
    try { const r = await pool.query(sql); counts[label] = r.rowCount; } catch (e) { counts[label] = `erro: ${e.message}`; }
  };
  await safe('chat_tag', `DELETE FROM ${schema}.chat_tag`);
  await safe('messages', `DELETE FROM ${schema}.messages`);
  await safe('chats', `DELETE FROM ${schema}.chats`);
  await safe('contacts_stage', `DELETE FROM ${schema}.contacts_stage`);
  await safe('contact_custom_values', `DELETE FROM ${schema}.contact_custom_values`);
  await safe('contacts', `DELETE FROM ${schema}.contacts`);
  return counts;
};

module.exports = {
  ensureIntegrationKeys,
  getApiKey,
  regenerateApiKey,
  validateApiKey,
  createLead,
  listLeads,
  deleteLead,
  deleteLeads,
  deleteAllLeads,
};
