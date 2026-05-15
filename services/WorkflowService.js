const pool = require('../db/queries');
const crypto = require('crypto');

const TRIGGER_TYPES = [
  'new_message',
  'first_message',
  'kanban_stage_changed',
  'tag_added',
  'tag_removed',
  'no_reply',
  'webhook',
];

const ACTION_TYPES = [
  'send_message',
  'add_tag',
  'remove_tag',
  'move_kanban',
  'transfer_queue',
  'assign_user',
  'toggle_bot',
  'delay',
  'webhook_out',
];

const ensureTables = async (schema) => {
  await pool.query(`CREATE TABLE IF NOT EXISTS ${schema}.workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    trigger_type TEXT NOT NULL,
    trigger_config JSONB DEFAULT '{}'::jsonb,
    graph JSONB DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
    webhook_token TEXT,
    created_at BIGINT,
    updated_at BIGINT
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS workflows_trigger_idx ON ${schema}.workflows(trigger_type, enabled)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS workflows_webhook_idx ON ${schema}.workflows(webhook_token)`);

  await pool.query(`CREATE TABLE IF NOT EXISTS ${schema}.workflow_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID,
    trigger_payload JSONB DEFAULT '{}'::jsonb,
    context JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'pending',
    current_node_id TEXT,
    started_at BIGINT,
    finished_at BIGINT,
    error TEXT
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS workflow_runs_workflow_idx ON ${schema}.workflow_runs(workflow_id, started_at DESC)`);

  await pool.query(`CREATE TABLE IF NOT EXISTS ${schema}.workflow_run_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID,
    node_id TEXT,
    action_type TEXT,
    input JSONB,
    output JSONB,
    status TEXT,
    started_at BIGINT,
    finished_at BIGINT,
    error TEXT
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS workflow_run_steps_run_idx ON ${schema}.workflow_run_steps(run_id, started_at)`);
};

const listWorkflows = async (schema) => {
  await ensureTables(schema);
  const r = await pool.query(
    `SELECT id, name, description, enabled, trigger_type, trigger_config, webhook_token, created_at, updated_at
     FROM ${schema}.workflows ORDER BY created_at DESC`
  );
  return r.rows;
};

const getWorkflow = async (schema, id) => {
  await ensureTables(schema);
  const r = await pool.query(`SELECT * FROM ${schema}.workflows WHERE id = $1`, [id]);
  return r.rows[0] || null;
};

const findByWebhookToken = async (schema, token) => {
  await ensureTables(schema);
  const r = await pool.query(
    `SELECT * FROM ${schema}.workflows WHERE webhook_token = $1 AND enabled = TRUE LIMIT 1`,
    [token]
  );
  return r.rows[0] || null;
};

const findActiveByTrigger = async (schema, trigger_type) => {
  await ensureTables(schema);
  const r = await pool.query(
    `SELECT * FROM ${schema}.workflows WHERE trigger_type = $1 AND enabled = TRUE`,
    [trigger_type]
  );
  return r.rows;
};

const createWorkflow = async (schema, payload) => {
  await ensureTables(schema);
  if (!TRIGGER_TYPES.includes(payload.trigger_type)) {
    throw new Error(`Trigger inválido: ${payload.trigger_type}`);
  }
  const now = Date.now();
  const webhookToken = payload.trigger_type === 'webhook' ? crypto.randomBytes(24).toString('hex') : null;
  const r = await pool.query(
    `INSERT INTO ${schema}.workflows(name, description, enabled, trigger_type, trigger_config, graph, webhook_token, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      payload.name,
      payload.description || null,
      payload.enabled !== false,
      payload.trigger_type,
      JSON.stringify(payload.trigger_config || {}),
      JSON.stringify(payload.graph || { nodes: [], edges: [] }),
      webhookToken,
      now,
      now,
    ]
  );
  return r.rows[0];
};

const updateWorkflow = async (schema, id, payload) => {
  await ensureTables(schema);
  if (payload.trigger_type && !TRIGGER_TYPES.includes(payload.trigger_type)) {
    throw new Error(`Trigger inválido: ${payload.trigger_type}`);
  }
  const fields = [];
  const values = [];
  let idx = 1;
  const push = (col, val) => { fields.push(`${col}=$${idx++}`); values.push(val); };
  if (payload.name !== undefined) push('name', payload.name);
  if (payload.description !== undefined) push('description', payload.description);
  if (payload.enabled !== undefined) push('enabled', !!payload.enabled);
  if (payload.trigger_type !== undefined) push('trigger_type', payload.trigger_type);
  if (payload.trigger_config !== undefined) push('trigger_config', JSON.stringify(payload.trigger_config));
  if (payload.graph !== undefined) push('graph', JSON.stringify(payload.graph));
  push('updated_at', Date.now());
  values.push(id);
  const r = await pool.query(
    `UPDATE ${schema}.workflows SET ${fields.join(', ')} WHERE id=$${idx} RETURNING *`,
    values
  );
  return r.rows[0];
};

const deleteWorkflow = async (schema, id) => {
  await ensureTables(schema);
  await pool.query(`DELETE FROM ${schema}.workflow_run_steps WHERE run_id IN (SELECT id FROM ${schema}.workflow_runs WHERE workflow_id=$1)`, [id]);
  await pool.query(`DELETE FROM ${schema}.workflow_runs WHERE workflow_id=$1`, [id]);
  const r = await pool.query(`DELETE FROM ${schema}.workflows WHERE id=$1 RETURNING id`, [id]);
  return r.rows[0] || null;
};

const regenerateWebhookToken = async (schema, id) => {
  await ensureTables(schema);
  const token = crypto.randomBytes(24).toString('hex');
  const r = await pool.query(
    `UPDATE ${schema}.workflows SET webhook_token=$1, updated_at=$2 WHERE id=$3 RETURNING *`,
    [token, Date.now(), id]
  );
  return r.rows[0];
};

const insertRun = async (schema, { workflow_id, trigger_payload, context }) => {
  await ensureTables(schema);
  const r = await pool.query(
    `INSERT INTO ${schema}.workflow_runs(workflow_id, trigger_payload, context, status, started_at)
     VALUES ($1, $2, $3, 'pending', $4) RETURNING *`,
    [workflow_id, JSON.stringify(trigger_payload || {}), JSON.stringify(context || {}), Date.now()]
  );
  return r.rows[0];
};

const updateRun = async (schema, id, patch) => {
  await ensureTables(schema);
  const fields = [];
  const values = [];
  let idx = 1;
  const push = (col, val) => { fields.push(`${col}=$${idx++}`); values.push(val); };
  if (patch.status !== undefined) push('status', patch.status);
  if (patch.current_node_id !== undefined) push('current_node_id', patch.current_node_id);
  if (patch.context !== undefined) push('context', JSON.stringify(patch.context));
  if (patch.finished_at !== undefined) push('finished_at', patch.finished_at);
  if (patch.error !== undefined) push('error', patch.error);
  if (!fields.length) return null;
  values.push(id);
  const r = await pool.query(
    `UPDATE ${schema}.workflow_runs SET ${fields.join(', ')} WHERE id=$${idx} RETURNING *`,
    values
  );
  return r.rows[0];
};

const insertStep = async (schema, { run_id, node_id, action_type, input, output, status, started_at, finished_at, error }) => {
  await ensureTables(schema);
  const r = await pool.query(
    `INSERT INTO ${schema}.workflow_run_steps(run_id, node_id, action_type, input, output, status, started_at, finished_at, error)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      run_id,
      node_id,
      action_type,
      JSON.stringify(input || {}),
      JSON.stringify(output || {}),
      status,
      started_at,
      finished_at || Date.now(),
      error || null,
    ]
  );
  return r.rows[0];
};

const listRecentRuns = async (schema, workflow_id, limit = 25) => {
  await ensureTables(schema);
  const r = await pool.query(
    `SELECT * FROM ${schema}.workflow_runs WHERE workflow_id = $1 ORDER BY started_at DESC LIMIT $2`,
    [workflow_id, limit]
  );
  return r.rows;
};

const listRunSteps = async (schema, run_id) => {
  await ensureTables(schema);
  const r = await pool.query(
    `SELECT * FROM ${schema}.workflow_run_steps WHERE run_id = $1 ORDER BY started_at`,
    [run_id]
  );
  return r.rows;
};

module.exports = {
  TRIGGER_TYPES,
  ACTION_TYPES,
  ensureTables,
  listWorkflows,
  getWorkflow,
  findByWebhookToken,
  findActiveByTrigger,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  regenerateWebhookToken,
  insertRun,
  updateRun,
  insertStep,
  listRecentRuns,
  listRunSteps,
};
