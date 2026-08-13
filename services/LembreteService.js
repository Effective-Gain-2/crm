const { v4: uuidv4 } = require('uuid');
const pool = require('../db/queries');
const { Queue, Worker } = require('bullmq'); 
const IORedis = require('ioredis');
const createRedisConnection = require('../config/Redis');
const redisConnection = createRedisConnection();

// Usar o socket global do index.js
let globalSocketIo = null;

const setGlobalSocket = (socket) => {
    globalSocketIo = socket;
};

const getGlobalSocket = () => {
    return globalSocketIo;
};

const lembreteQueue = new Queue('lembretes', { connection: redisConnection });

const lembreteWorker = new Worker('lembretes', async job => {
    try {
        console.log(`Processando lembrete: ${job.data.lembrete_name}`);
        const { tag, filas, schema } = job.data;
        
        const socketIo = getGlobalSocket();
        if (!socketIo) {
            console.error('Socket não disponível para emitir lembrete');
            return;
        }
        
        if(tag === 'geral'){
            console.log('Emitindo lembrete geral');
            socketIo.to(`schema_${schema}`).emit('lembrete', job.data);
        } else if(tag === 'setorial' && filas && filas.length > 0){
            console.log(`Emitindo lembrete setorial para filas: ${filas.join(', ')}`);
            filas.forEach(filaId => {
                socketIo.to(`fila_${filaId}`).emit('lembrete', job.data);
            });
        } else if(tag === 'pessoal'){
            console.log(`Emitindo lembrete pessoal para usuário: ${job.data.user_id}`);
            socketIo.to(`user_${job.data.user_id}`).emit('lembrete', job.data);
        }
        
        // Recorrência: reagenda a próxima ocorrência
        if (job.data.recurrence) {
            const next = nextOccurrence(job.data.date, job.data.recurrence);
            if (next) {
                await pool.query(
                    `UPDATE ${schema}.lembretes SET date = $1, status = 'pending' WHERE id = $2`,
                    [next, job.data.id]
                ).catch((e) => console.error('Recorrência update:', e.message));
                await agendarLembrete({ ...job.data, date: next });
            }
        }

        console.log(`Lembrete ${job.data.lembrete_name} processado com sucesso`);
    } catch (error) {
        console.error('Erro ao processar lembrete:', error);
        throw error;
    }
}, { connection: redisConnection });

// Próxima ocorrência de um lembrete recorrente (date em epoch segundos)
const nextOccurrence = (dateSec, recurrence) => {
    const d = new Date(Number(dateSec) * 1000);
    if (recurrence === 'daily') d.setDate(d.getDate() + 1);
    else if (recurrence === 'weekly') d.setDate(d.getDate() + 7);
    else if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1);
    else return null;
    return Math.floor(d.getTime() / 1000);
};

const agendarLembrete = async (lembrete) => {
    // Remove o job anterior — sem isso, editar a data NÃO reagendava (BullMQ ignora jobId duplicado)
    try {
        const existing = await lembreteQueue.getJob(lembrete.id);
        if (existing) await existing.remove();
    } catch (e) { /* job pode não existir */ }
    await lembreteQueue.add('notificar', lembrete, {
        jobId: lembrete.id,
        user: lembrete.user_id,
        delay: Math.max(0, lembrete.date * 1000 - Date.now()),
        removeOnComplete: true,
        removeOnFail: true,
    });
};

// Re-hidrata os jobs a partir do banco no boot (Redis volátil não perde lembretes)
const rehydrateLembretes = async () => {
    try {
        const companies = await pool.query(`SELECT schema_name FROM effective_gain.companies`);
        let count = 0;
        for (const row of companies.rows) {
            const schema = row.schema_name;
            try {
                const pend = await pool.query(
                    `SELECT l.*, COALESCE(json_agg(lq.queue_id) FILTER (WHERE lq.queue_id IS NOT NULL), '[]') AS filas
                       FROM ${schema}.lembretes l
                       LEFT JOIN ${schema}.lembretes_queues lq ON lq.lembrete_id = l.id
                      WHERE l.date > EXTRACT(EPOCH FROM now()) AND COALESCE(l.status, 'pending') = 'pending'
                      GROUP BY l.id`
                );
                for (const lembrete of pend.rows) {
                    await agendarLembrete({ ...lembrete, schema, filas: lembrete.filas || [] });
                    count++;
                }
            } catch (e) { /* schema sem tabela */ }
        }
        if (count > 0) console.log(`Lembretes re-hidratados: ${count}`);
    } catch (e) {
        console.error('Erro ao re-hidratar lembretes:', e.message);
    }
};
// aguarda o boot completar antes de re-hidratar
setTimeout(rehydrateLembretes, 10000);

const salvarFilasLembrete = async (lembreteId, filas, schema) => {
    if (!filas || filas.length === 0) return;
    
    await pool.query(
        `DELETE FROM ${schema}.lembretes_queues WHERE lembrete_id = $1`,
        [lembreteId]
    );
    
    for (const filaId of filas) {
        await pool.query(
            `INSERT INTO ${schema}.lembretes_queues(lembrete_id, queue_id) VALUES($1, $2)`,
            [lembreteId, filaId]
        );
    }
};

const buscarFilasLembrete = async (lembreteId, schema) => {
    const result = await pool.query(
        `SELECT queue_id FROM ${schema}.lembretes_queues WHERE lembrete_id = $1`,
        [lembreteId]
    );
    return result.rows.map(row => row.queue_id);
};

const createLembrete = async (lembrete_name, tag, message, date, icone, user_id, schema, filas = [], google_event_id = null, links = {}) => {
    try {
        const lembreteId = uuidv4();
        const result = await pool.query(
            `INSERT INTO ${schema}.lembretes(id, lembrete_name, tag, message, date, icone, user_id, google_event_id, contact_number, chat_id, opportunity_id, recurrence, status, created_at)
             VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', EXTRACT(EPOCH FROM now())) RETURNING *`,
            [lembreteId, lembrete_name, tag, message, date, icone, user_id, google_event_id,
             links.contact_number || null, links.chat_id || null, links.opportunity_id || null, links.recurrence || null]
        );
        
        if (tag === 'setorial' && filas && filas.length > 0) {
            await salvarFilasLembrete(lembreteId, filas, schema);
        }
        
        const lembrete = await agendarLembrete({
            id: lembreteId,
            lembrete_name,
            tag,
            message,
            date,
            user_id,
            schema,
            filas: tag === 'setorial' ? filas : [],
            google_event_id: google_event_id,
            contact_number: links.contact_number || null,
            chat_id: links.chat_id || null,
            opportunity_id: links.opportunity_id || null,
            recurrence: links.recurrence || null
        });
        
        const lembreteComFilas = {
            ...result.rows[0],
            filas: tag === 'setorial' ? filas : []
        };
        
        console.log(`Emitindo lembrete-criado para schema: ${schema}`);
        const socketIo = getGlobalSocket();
        if (socketIo) {
            socketIo.to(`schema_${schema}`).emit('lembrete-criado', {
                lembrete: lembreteComFilas
            });
        }
        
        return lembreteComFilas;
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const getLembretes = async (schema) => {
    try {
        const result = await pool.query(
            `SELECT * FROM ${schema}.lembretes ORDER BY date ASC`
        );
        
        const lembretesComFilas = await Promise.all(
            result.rows.map(async (lembrete) => {
                if (lembrete.tag === 'setorial') {
                    const filas = await buscarFilasLembrete(lembrete.id, schema);
                    return { ...lembrete, filas };
                }
                return { ...lembrete, filas: [] };
            })
        );
        
        return lembretesComFilas;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

const updateLembretes = async (id, lembrete_name, tag, message, date, icone, schema, filas = [], google_event_id = null) => {
    try {
        const result = await pool.query(
            `UPDATE ${schema}.lembretes SET lembrete_name=$1, tag=$2, message=$3, date=$4, icone=$5, google_event_id=$6 WHERE id=$7 RETURNING *`,
            [lembrete_name, tag, message, date, icone, google_event_id, id]
        );
        
        // Atualiza as filas se for setorial
        if (tag === 'setorial') {
            await salvarFilasLembrete(id, filas, schema);
        } else {
            // Remove todas as filas se não for setorial
            await pool.query(
                `DELETE FROM ${schema}.lembretes_queues WHERE lembrete_id = $1`,
                [id]
            );
        }
        
        await agendarLembrete({
            id,
            lembrete_name,
            tag,
            message,
            date,
            icone,
            schema,
            filas: tag === 'setorial' ? filas : [],
            google_event_id: google_event_id
        });
        
        // Retorna o lembrete atualizado com as filas
        const lembreteAtualizado = {
            ...result.rows[0],
            filas: tag === 'setorial' ? filas : []
        };
        
        return lembreteAtualizado;
    } catch (error) {
        console.error(error);
        throw error;
    }
};

// Concluir / adiar lembrete
const setLembreteStatus = async (id, status, schema) => {
    const done_at = status === 'done' ? Math.floor(Date.now() / 1000) : null;
    const result = await pool.query(
        `UPDATE ${schema}.lembretes SET status = $1, done_at = $2 WHERE id = $3 RETURNING *`,
        [status, done_at, id]
    );
    if (status === 'done') {
        try {
            const job = await lembreteQueue.getJob(id);
            if (job) await job.remove();
        } catch (e) { /* sem job */ }
    }
    return result.rows[0];
};

const snoozeLembrete = async (id, minutes, schema) => {
    const newDate = Math.floor(Date.now() / 1000) + (Number(minutes) || 30) * 60;
    const result = await pool.query(
        `UPDATE ${schema}.lembretes SET date = $1, status = 'pending' WHERE id = $2 RETURNING *`,
        [newDate, id]
    );
    const lembrete = result.rows[0];
    if (lembrete) await agendarLembrete({ ...lembrete, schema, filas: [] });
    return lembrete;
};

const getLembretesByContact = async (contact_number, schema) => {
    const result = await pool.query(
        `SELECT * FROM ${schema}.lembretes WHERE contact_number = $1 ORDER BY date DESC`, [contact_number]
    );
    return result.rows;
};

const getLembretesByOpportunity = async (opportunity_id, schema) => {
    const result = await pool.query(
        `SELECT * FROM ${schema}.lembretes WHERE opportunity_id = $1 ORDER BY date DESC`, [opportunity_id]
    );
    return result.rows;
};

const deleteLembrete = async (id, schema) => {
    try {
        // Remove as relações com filas primeiro
        await pool.query(
            `DELETE FROM ${schema}.lembretes_queues WHERE lembrete_id = $1`,
            [id]
        );
        
        // Remove o lembrete
        const result = await pool.query(`DELETE FROM ${schema}.lembretes where id=$1 RETURNING *`, [id]);
        
        // Remove o job da fila
        await lembreteQueue.remove(id);
        
        return result.rows[0];
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports={
    setLembreteStatus,
    snoozeLembrete,
    getLembretesByContact,
    getLembretesByOpportunity,
    rehydrateLembretes,
    createLembrete,
    getLembretes,
    updateLembretes,
    deleteLembrete,
    setGlobalSocket
}