// Registro de eventos de webhook recebidos (HubSpot, Meta, ...).
//
// Por que existe: o padrão de ingestão do CRM responde 200 na hora e processa depois
// (exigência dos provedores). Se o processamento estoura — token expirado, etapa
// inexistente, provedor fora do ar — o lead some sem deixar rastro. Aqui fica o
// payload cru, o erro e o contador de tentativas, para auditoria e replay.
const pool = require('../db/queries');

// Grava o evento como 'pending'. Devolve { id, duplicate }.
// duplicate = true quando o provedor reenviou um evento já recebido (timeout do nosso
// lado, por exemplo) — o chamador deve responder 200 e NÃO reprocessar.
const record = async (schema, { provider, event_type, external_id, payload }) => {
    try {
        const res = await pool.query(
            `INSERT INTO ${schema}.webhook_events (provider, event_type, external_id, payload)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (provider, event_type, external_id) WHERE external_id IS NOT NULL AND external_id <> ''
             DO NOTHING
             RETURNING id`,
            [provider, event_type || null, external_id || null, payload ? JSON.stringify(payload) : null]
        );
        if (res.rows[0]) return { id: res.rows[0].id, duplicate: false };

        const existing = await pool.query(
            `SELECT id, status FROM ${schema}.webhook_events
              WHERE provider = $1 AND event_type IS NOT DISTINCT FROM $2 AND external_id = $3 LIMIT 1`,
            [provider, event_type || null, external_id]
        );
        // Reenvio de evento que falhou antes NÃO é duplicata: é a chance de acertar.
        const row = existing.rows[0];
        return { id: row?.id || null, duplicate: row?.status === 'done' };
    } catch (e) {
        // Log de auditoria não pode derrubar a ingestão do lead.
        console.error(`webhook_events: falha ao registrar (${provider}):`, e.message);
        return { id: null, duplicate: false };
    }
};

const markDone = async (schema, id) => {
    if (!id) return;
    await pool.query(
        `UPDATE ${schema}.webhook_events SET status = 'done', processed_at = now(), error_message = NULL WHERE id = $1`,
        [id]
    ).catch((e) => console.error('webhook_events markDone:', e.message));
};

const markFailed = async (schema, id, error) => {
    if (!id) return;
    await pool.query(
        `UPDATE ${schema}.webhook_events
            SET status = 'failed', processed_at = now(),
                error_message = $2, retry_count = retry_count + 1
          WHERE id = $1`,
        [id, String(error?.message || error || '').slice(0, 2000)]
    ).catch((e) => console.error('webhook_events markFailed:', e.message));
};

// Eventos que falharam — alimenta a tela de diagnóstico e o replay manual.
const listFailed = async (schema, { provider, limit = 100 } = {}) => {
    const lim = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const res = await pool.query(
        `SELECT id, provider, event_type, external_id, error_message, retry_count, received_at, processed_at
           FROM ${schema}.webhook_events
          WHERE status = 'failed' ${provider ? 'AND provider = $2' : ''}
          ORDER BY received_at DESC
          LIMIT $1`,
        provider ? [lim, provider] : [lim]
    );
    return res.rows;
};

const getPayload = async (schema, id) => {
    const res = await pool.query(`SELECT * FROM ${schema}.webhook_events WHERE id = $1`, [id]);
    return res.rows[0] || null;
};

module.exports = { record, markDone, markFailed, listFailed, getPayload };
