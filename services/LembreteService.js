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
        const { tag, filas, schema } = job.data;
        
        const socketIo = getGlobalSocket();
        if (!socketIo) {
            console.error('Socket não disponível para emitir lembrete');
            return;
        }
        
        if(tag === 'geral'){
            console.log('Emitindo lembrete geral');
            socketIo.emit('lembrete', job.data);
        } else if(tag === 'setorial' && filas && filas.length > 0){
            console.log(`Emitindo lembrete setorial para filas: ${filas.join(', ')}`);
            filas.forEach(filaId => {
                socketIo.to(`fila_${filaId}`).emit('lembrete', job.data);
            });
        } else if(tag === 'pessoal'){
            console.log(`Emitindo lembrete pessoal para usuário: ${job.data.user_id}`);
            socketIo.to(`user_${job.data.user_id}`).emit('lembrete', job.data);
        }
        
        console.log(`Lembrete ${job.data.lembrete_name} processado com sucesso`);
    } catch (error) {
        console.error('Erro ao processar lembrete:', error);
        throw error;
    }
}, { connection: redisConnection });

const agendarLembrete = async (lembrete) => {
    await lembreteQueue.add('notificar', lembrete, {
        jobId: lembrete.id, 
        user: lembrete.user_id,
        delay: Math.max(0, lembrete.date * 1000 - Date.now()),
        removeOnComplete: true,
        removeOnFail: true,
    });
};

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

const createLembrete = async (lembrete_name, tag, message, date, icone, user_id, schema, filas = [], google_event_id = null) => {
    try {
        const lembreteId = uuidv4();
        const result = await pool.query(
            `INSERT INTO ${schema}.lembretes(id, lembrete_name, tag, message, date, icone, user_id, google_event_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [lembreteId, lembrete_name, tag, message, date, icone, user_id, google_event_id]
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
            google_event_id: google_event_id
        });
        
        const lembreteComFilas = {
            ...result.rows[0],
            filas: tag === 'setorial' ? filas : []
        };
        
        console.log(`Emitindo lembrete-criado para schema: ${schema}`);
        const socketIo = getGlobalSocket();
        if (socketIo) {
            socketIo.emit('lembrete-criado', {
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
    createLembrete,
    getLembretes,
    updateLembretes,
    deleteLembrete,
    setGlobalSocket
}