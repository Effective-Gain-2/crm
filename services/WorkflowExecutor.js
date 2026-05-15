const axios = require('axios');
const { Queue, Worker } = require('bullmq');
const createRedisConnection = require('../config/Redis');
const pool = require('../db/queries');
const { sendTextMessage } = require('../requests/evolution');
const { searchConnById } = require('./ConnectionService');
const { changeKanbanStage, getSpecificContactInKanban, insertContactInKanbanByStageId } = require('./KanbanService');
const WorkflowService = require('./WorkflowService');

const QUEUE_NAME = 'workflow_run';
let queue = null;
let worker = null;
let bullConn = null;

const getQueue = () => {
  if (!queue) {
    bullConn = bullConn || createRedisConnection();
    queue = new Queue(QUEUE_NAME, { connection: bullConn });
  }
  return queue;
};

// Substitui {{var}} no template usando context. Acessa propriedades aninhadas
// via path (ex: {{contact.name}}).
const interpolate = (template, context) => {
  if (typeof template !== 'string') return template;
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const parts = path.split('.');
    let cur = context;
    for (const p of parts) {
      if (cur == null) return '';
      cur = cur[p];
    }
    return cur == null ? '' : String(cur);
  });
};

// Cada ação retorna { ok, output?, error?, delayMs?, contextPatch? }.
// Se delayMs > 0, o executor reenfileira e retoma a partir do PRÓXIMO nó.
const actions = {
  async send_message(config, context, schema) {
    const chat = context.chat;
    if (!chat) return { ok: false, error: 'sem chat no contexto' };
    const conn = await searchConnById(chat.connection_id, schema);
    if (!conn) return { ok: false, error: 'conexão não encontrada' };
    const text = interpolate(config.text || '', context);
    if (!text.trim()) return { ok: false, error: 'mensagem vazia após interpolar' };
    const number = chat.contact_phone || chat.number;
    const result = await sendTextMessage(conn.name, text, number);
    return { ok: true, output: { sent_to: number, text, key: result?.key || null } };
  },

  async add_tag(config, context, schema) {
    const chat = context.chat;
    if (!chat) return { ok: false, error: 'sem chat no contexto' };
    if (!config.tag_id) return { ok: false, error: 'tag_id ausente' };
    await pool.query(
      `INSERT INTO ${schema}.chat_tag(chat_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [chat.id, config.tag_id]
    );
    if (global.socketIoServer) {
      global.socketIoServer.to(`schema_${schema}`).emit('tagUpdated', { chat_id: chat.id, tag_id: config.tag_id, checked: true });
    }
    return { ok: true, output: { tag_id: config.tag_id } };
  },

  async remove_tag(config, context, schema) {
    const chat = context.chat;
    if (!chat) return { ok: false, error: 'sem chat no contexto' };
    if (!config.tag_id) return { ok: false, error: 'tag_id ausente' };
    await pool.query(
      `DELETE FROM ${schema}.chat_tag WHERE chat_id = $1 AND tag_id = $2`,
      [chat.id, config.tag_id]
    );
    if (global.socketIoServer) {
      global.socketIoServer.to(`schema_${schema}`).emit('tagUpdated', { chat_id: chat.id, tag_id: config.tag_id, checked: false });
    }
    return { ok: true, output: { tag_id: config.tag_id } };
  },

  async move_kanban(config, context, schema) {
    const chat = context.chat;
    if (!config.stage_id) return { ok: false, error: 'stage_id ausente' };
    if (chat?.id) {
      await changeKanbanStage(chat.id, config.stage_id, schema);
      if (global.socketIoServer) {
        global.socketIoServer.to(`schema_${schema}`).emit('leadMoved', { chat_id: chat.id, stage_id: config.stage_id });
      }
    } else if (context.contact?.number) {
      const exists = await getSpecificContactInKanban(context.contact.number, schema);
      if (!exists) {
        await insertContactInKanbanByStageId(config.stage_id, context.contact.number, schema);
      }
    }
    return { ok: true, output: { stage_id: config.stage_id } };
  },

  async transfer_queue(config, context, schema) {
    const chat = context.chat;
    if (!chat?.id) return { ok: false, error: 'sem chat no contexto' };
    if (!config.queue_id) return { ok: false, error: 'queue_id ausente' };
    await pool.query(
      `UPDATE ${schema}.chats SET queue_id = $1 WHERE id = $2`,
      [config.queue_id, chat.id]
    );
    return { ok: true, output: { queue_id: config.queue_id } };
  },

  async assign_user(config, context, schema) {
    const chat = context.chat;
    if (!chat?.id) return { ok: false, error: 'sem chat no contexto' };
    if (!config.user_id) return { ok: false, error: 'user_id ausente' };
    await pool.query(
      `UPDATE ${schema}.chats SET assigned_user = $1 WHERE id = $2`,
      [config.user_id, chat.id]
    );
    return { ok: true, output: { user_id: config.user_id } };
  },

  async toggle_bot(config, context, schema) {
    const chat = context.chat;
    if (!chat?.id) return { ok: false, error: 'sem chat no contexto' };
    const newVal = config.enabled !== false;
    await pool.query(
      `ALTER TABLE ${schema}.chats ADD COLUMN IF NOT EXISTS isboton boolean DEFAULT true`
    );
    await pool.query(`UPDATE ${schema}.chats SET isboton = $1 WHERE id = $2`, [newVal, chat.id]);
    return { ok: true, output: { isboton: newVal } };
  },

  async delay(config /* , context, schema */) {
    const ms = Number(config.seconds || 0) * 1000
      + Number(config.minutes || 0) * 60 * 1000
      + Number(config.hours || 0) * 60 * 60 * 1000
      + Number(config.days || 0) * 24 * 60 * 60 * 1000;
    if (ms <= 0) return { ok: true, output: { skipped: true } };
    return { ok: true, output: { delay_ms: ms }, delayMs: ms };
  },

  async webhook_out(config, context /* , schema */) {
    if (!config.url) return { ok: false, error: 'url ausente' };
    const method = (config.method || 'POST').toUpperCase();
    const url = interpolate(config.url, context);
    let body = config.body;
    if (typeof body === 'string') body = interpolate(body, context);
    const headers = config.headers || {};
    try {
      const resp = await axios.request({ url, method, headers, data: body, timeout: 15000 });
      return { ok: true, output: { status: resp.status, data: resp.data } };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
};

const findStartNode = (graph) => {
  const trig = graph.nodes.find((n) => n.type === 'trigger' || n.data?.action === 'trigger');
  if (trig) return trig;
  // se nao houver trigger, comeca pelo no que nao e alvo de nenhuma edge
  const targets = new Set((graph.edges || []).map((e) => e.target));
  return graph.nodes.find((n) => !targets.has(n.id)) || graph.nodes[0];
};

const findNextNode = (graph, currentId) => {
  const edge = (graph.edges || []).find((e) => e.source === currentId);
  if (!edge) return null;
  return graph.nodes.find((n) => n.id === edge.target) || null;
};

const enqueueRun = async (schema, run_id, fromNodeId = null, delayMs = 0) => {
  const q = getQueue();
  await q.add(
    'execute',
    { schema, run_id, fromNodeId },
    {
      delay: delayMs,
      jobId: `run_${run_id}_${fromNodeId || 'start'}_${Date.now()}`,
      removeOnComplete: true,
      removeOnFail: 50,
    }
  );
};

const startRun = async (schema, workflow, trigger_payload, context = {}) => {
  if (!workflow.enabled) return null;
  const run = await WorkflowService.insertRun(schema, {
    workflow_id: workflow.id,
    trigger_payload,
    context,
  });
  await enqueueRun(schema, run.id);
  return run;
};

const runStep = async (schema, run_id, fromNodeId = null) => {
  const run = (await pool.query(`SELECT * FROM ${schema}.workflow_runs WHERE id=$1`, [run_id])).rows[0];
  if (!run) return;
  if (['success', 'failed'].includes(run.status)) return;

  const wf = await WorkflowService.getWorkflow(schema, run.workflow_id);
  if (!wf || !wf.enabled) {
    await WorkflowService.updateRun(schema, run_id, { status: 'failed', finished_at: Date.now(), error: 'workflow desativado ou removido' });
    return;
  }

  const graph = wf.graph || { nodes: [], edges: [] };
  let context = run.context || {};
  let currentNode;

  if (fromNodeId) {
    currentNode = graph.nodes.find((n) => n.id === fromNodeId);
  } else {
    const start = findStartNode(graph);
    currentNode = start ? findNextNode(graph, start.id) : null;
  }

  if (!currentNode) {
    await WorkflowService.updateRun(schema, run_id, { status: 'success', finished_at: Date.now() });
    return;
  }

  await WorkflowService.updateRun(schema, run_id, { status: 'running', current_node_id: currentNode.id });

  // eslint-disable-next-line no-constant-condition
  while (currentNode) {
    const actionType = currentNode.data?.action;
    const config = currentNode.data?.config || {};
    const action = actions[actionType];
    if (!action) {
      await WorkflowService.insertStep(schema, {
        run_id, node_id: currentNode.id, action_type: actionType,
        input: config, output: null, status: 'failed',
        started_at: Date.now(), error: 'action desconhecida',
      });
      await WorkflowService.updateRun(schema, run_id, {
        status: 'failed', finished_at: Date.now(), error: `action desconhecida: ${actionType}`,
      });
      return;
    }

    const stepStart = Date.now();
    let result;
    try {
      result = await action(config, context, schema);
    } catch (err) {
      result = { ok: false, error: err.message || String(err) };
    }

    await WorkflowService.insertStep(schema, {
      run_id,
      node_id: currentNode.id,
      action_type: actionType,
      input: config,
      output: result.output || null,
      status: result.ok ? 'success' : 'failed',
      started_at: stepStart,
      error: result.error || null,
    });

    if (!result.ok) {
      await WorkflowService.updateRun(schema, run_id, {
        status: 'failed', finished_at: Date.now(), error: result.error,
      });
      return;
    }

    if (result.contextPatch) {
      context = { ...context, ...result.contextPatch };
    }

    // delay -> reenfileira a partir do PRÓXIMO nó
    if (result.delayMs && result.delayMs > 0) {
      const nextNode = findNextNode(graph, currentNode.id);
      if (!nextNode) {
        await WorkflowService.updateRun(schema, run_id, {
          status: 'success', finished_at: Date.now(), context,
        });
        return;
      }
      await WorkflowService.updateRun(schema, run_id, {
        status: 'pending', current_node_id: nextNode.id, context,
      });
      await enqueueRun(schema, run_id, nextNode.id, result.delayMs);
      return;
    }

    const nextNode = findNextNode(graph, currentNode.id);
    if (!nextNode) {
      await WorkflowService.updateRun(schema, run_id, {
        status: 'success', finished_at: Date.now(), context,
      });
      return;
    }
    currentNode = nextNode;
    await WorkflowService.updateRun(schema, run_id, { current_node_id: currentNode.id, context });
  }
};

const startExecutorWorker = () => {
  if (worker) return worker;
  bullConn = bullConn || createRedisConnection();
  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { schema, run_id, fromNodeId } = job.data;
      await runStep(schema, run_id, fromNodeId);
    },
    { connection: bullConn }
  );
  worker.on('failed', (job, err) => {
    console.error('workflow_run worker job failed:', job?.id, err.message);
  });
  return worker;
};

module.exports = {
  startExecutorWorker,
  startRun,
  enqueueRun,
};
