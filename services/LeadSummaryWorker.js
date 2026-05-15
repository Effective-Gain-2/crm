const { Queue, Worker } = require('bullmq');
const createRedisConnection = require('../config/Redis');
const pool = require('../db/queries');
const { generateLeadSummary } = require('./OpenAi');
const { upsertLeadSummary } = require('./LeadSummaryService');

const QUEUE_NAME = 'lead_summary';
const DELAY_MS = 24 * 60 * 60 * 1000; // 24h
const MIN_TOTAL_MESSAGES = 2;          // pula leads que sumiram apos 1 msg

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

// Agenda um resumo para um chat 24h apos a primeira interacao do cliente.
// Idempotente: usa jobId estavel (chat_id) para que retries da mesma
// "primeira mensagem" nao agendem multiplos jobs.
const scheduleLeadSummary = async (schema, chat_id) => {
  if (!schema || !chat_id) return;
  try {
    const q = getQueue();
    await q.add(
      'summarize',
      { schema, chat_id },
      {
        delay: DELAY_MS,
        jobId: `summary_${schema}_${chat_id}`,
        removeOnComplete: true,
        removeOnFail: 50,
      }
    );
  } catch (err) {
    console.error('scheduleLeadSummary falhou:', err.message || err);
  }
};

const startSummaryWorker = () => {
  if (worker) return worker;
  bullConn = bullConn || createRedisConnection();
  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { schema, chat_id } = job.data;
      if (!schema || !chat_id) return;

      // Confirma que o chat ainda existe e nao foi fechado.
      const chatRes = await pool.query(
        `SELECT id, contact_phone, contact_name, status FROM ${schema}.chats WHERE id = $1`,
        [chat_id]
      );
      if (chatRes.rowCount === 0) return;
      const chat = chatRes.rows[0];
      if (chat.status === 'closed') return;

      // Gate: precisa de pelo menos N mensagens (interacao real).
      const msgRes = await pool.query(
        `SELECT id, body, from_me, created_at
         FROM ${schema}.messages
         WHERE chat_id = $1
         ORDER BY created_at ASC`,
        [chat_id]
      );
      if (msgRes.rowCount < MIN_TOTAL_MESSAGES) return;

      const summary = await generateLeadSummary(msgRes.rows, chat.contact_name);
      if (!summary || (!summary.summary && !summary.next_step)) return;

      const saved = await upsertLeadSummary(schema, {
        chat_id,
        contact_phone: chat.contact_phone,
        contact_name: chat.contact_name,
        summary: summary.summary,
        next_step: summary.next_step,
      });

      if (global.socketIoServer) {
        global.socketIoServer
          .to(`schema_${schema}`)
          .emit('lead_summary_ready', saved);
      }
    },
    { connection: bullConn }
  );
  worker.on('failed', (job, err) => {
    console.error('lead_summary worker job failed:', job?.id, err.message);
  });
  return worker;
};

module.exports = {
  scheduleLeadSummary,
  startSummaryWorker,
};
