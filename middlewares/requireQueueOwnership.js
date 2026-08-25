// Posse de fila: líder só configura as filas que lidera (queues.superuser = ele).
// Master e técnico continuam mexendo em qualquer fila da empresa.
//
// Roda SEMPRE depois de requireRole('lider') — quem não é gestor já foi barrado lá;
// aqui a pergunta é só "esta fila é dele?".
const pool = require('../db/queries');
const { ROLE_LEVEL } = require('./auth');

// O id da fila chega em nomes diferentes conforme a rota: corpo (update-queue,
// set-queue-users, set-queue-connections) ou URL (delete-queue), em camelCase ou snake.
const extrairQueueId = (req) =>
    req.body?.queueId || req.body?.queue_id || req.params?.queueId || req.params?.queue_id;

const requireQueueOwnership = async (req, res, next) => {
    try {
        const nivel = ROLE_LEVEL[req.auth?.role] || 0;
        // master(3) e tecnico(4) mandam em todas as filas.
        if (nivel >= ROLE_LEVEL.master) return next();

        const queueId = extrairQueueId(req);
        if (!queueId) {
            return res.status(400).json({ error: 'Fila não informada' });
        }

        const schema = req.schema || req.auth?.schema;
        const result = await pool.query(
            `SELECT superuser FROM ${schema}.queues WHERE id = $1`, [queueId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Fila não encontrada' });
        }
        if (result.rows[0].superuser !== req.auth?.local_user_id) {
            return res.status(403).json({ error: 'Você só pode configurar as filas que lidera' });
        }
        next();
    } catch (error) {
        console.error('Erro ao verificar posse da fila:', error.message);
        res.status(500).json({ error: 'Erro ao verificar permissão na fila' });
    }
};

module.exports = { requireQueueOwnership };
