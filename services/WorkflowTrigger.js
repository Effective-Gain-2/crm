const pool = require('../db/queries');
const WorkflowService = require('./WorkflowService');
const { startRun } = require('./WorkflowExecutor');

// Dispara TODOS os workflows ativos para um trigger_type compatível.
// O caller passa: schema, trigger_type, e o payload (que vira context inicial).
// Filtros opcionais do trigger_config são aplicados antes de iniciar o run.
const fireTrigger = async (schema, trigger_type, payload) => {
  try {
    const workflows = await WorkflowService.findActiveByTrigger(schema, trigger_type);
    for (const wf of workflows) {
      if (!matchTriggerFilters(wf, payload)) continue;
      await startRun(schema, wf, payload, payload).catch((err) => {
        console.error(`Falha ao iniciar workflow ${wf.id}:`, err.message);
      });
    }
  } catch (err) {
    console.error('fireTrigger erro:', err.message);
  }
};

const matchTriggerFilters = (workflow, payload) => {
  const cfg = workflow.trigger_config || {};
  switch (workflow.trigger_type) {
    case 'kanban_stage_changed': {
      if (cfg.from_stage_id && payload.from_stage_id !== cfg.from_stage_id) return false;
      if (cfg.to_stage_id && payload.to_stage_id !== cfg.to_stage_id) return false;
      return true;
    }
    case 'tag_added':
    case 'tag_removed': {
      if (cfg.tag_id && payload.tag_id !== cfg.tag_id) return false;
      return true;
    }
    case 'new_message':
    case 'first_message': {
      // permite filtrar por queue
      if (cfg.queue_id && payload.queue_id !== cfg.queue_id) return false;
      return true;
    }
    case 'no_reply': {
      // payload.hours_idle deve ser >= cfg.hours
      if (cfg.hours && Number(payload.hours_idle || 0) < Number(cfg.hours)) return false;
      return true;
    }
    default:
      return true;
  }
};

// Cron simples para o trigger no_reply: a cada 15min varre chats abertos
// onde a última mensagem é do cliente e está estagnada há >= X horas.
let noReplyInterval = null;
const startNoReplyScanner = () => {
  if (noReplyInterval) return;
  const intervalMs = 15 * 60 * 1000;
  const tick = async () => {
    try {
      const schemas = await pool.query(
        `SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog','information_schema','pg_toast','public')`
      );
      for (const { schema_name: schema } of schemas.rows) {
        try {
          const wfs = await WorkflowService.findActiveByTrigger(schema, 'no_reply');
          if (wfs.length === 0) continue;
          for (const wf of wfs) {
            const hours = Number(wf.trigger_config?.hours || 24);
            const cutoff = Date.now() - hours * 60 * 60 * 1000;
            // chats onde a ultima mensagem é do cliente, antes do cutoff,
            // e nenhuma mensagem nova depois.
            const rows = await pool.query(
              `WITH last_msg AS (
                 SELECT chat_id, MAX(created_at) AS last_ts
                 FROM ${schema}.messages
                 GROUP BY chat_id
               )
               SELECT c.*, lm.last_ts
               FROM ${schema}.chats c
               JOIN last_msg lm ON lm.chat_id = c.id
               WHERE c.status <> 'closed'
                 AND lm.last_ts < $1
                 AND NOT EXISTS (
                   SELECT 1 FROM ${schema}.workflow_runs r
                   WHERE r.workflow_id = $2
                     AND (r.context->>'chat_id') = c.id::text
                     AND r.started_at > lm.last_ts
                 )
                 AND EXISTS (
                   SELECT 1 FROM ${schema}.messages m
                   WHERE m.chat_id = c.id AND m.created_at = lm.last_ts AND m.from_me = false
                 )
               LIMIT 50`,
              [cutoff, wf.id]
            );
            for (const chat of rows.rows) {
              const hoursIdle = (Date.now() - Number(chat.last_ts)) / (60 * 60 * 1000);
              await startRun(schema, wf, { trigger: 'no_reply', chat_id: chat.id, hours_idle: hoursIdle }, {
                chat,
                contact: { name: chat.contact_name, number: chat.contact_phone },
                trigger: 'no_reply',
                hours_idle: hoursIdle,
              }).catch((err) => console.error('no_reply trigger falhou:', err.message));
            }
          }
        } catch (err) {
          console.error(`no_reply scanner schema ${schema} falhou:`, err.message);
        }
      }
    } catch (err) {
      console.error('no_reply scanner tick falhou:', err.message);
    }
  };
  noReplyInterval = setInterval(tick, intervalMs);
  // primeiro tick logo após startup, mas com um pequeno delay pra outros workers subirem
  setTimeout(tick, 30 * 1000);
};

module.exports = {
  fireTrigger,
  startNoReplyScanner,
};
