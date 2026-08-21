    const Queue = require("../entities/Queue");
const { v4: uuidv4 } = require('uuid');
const { createQueue, getUserQueues, getAllQueues, deleteQueue, getQueueById, transferQueue, updateQueue, updateUserQueues, setQueueUsers, toggleWebhookStatus, updateWebhookUrl, getUsersInQueue } = require("../services/QueueService");
const { validarUrlDeWebhook } = require("../services/QueueWebhookService");
const { setUserChat } = require("../services/ChatService");
const { getUserById } = require("../services/UserService");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


const createQueueController = async(req, res)=>{
    try{
        const {name, color, super_user, distribution} = req.body;
        // req.schema é o schema já resolvido pelo enforceSchema a partir do token; ler o
        // corpo direto reabriria a porta para o cliente escolher o schema.
        const schema = req.schema || req.body.schema;

        if (!name || !String(name).trim()) {
            return res.status(400).json({ error: 'O nome da fila é obrigatório' });
        }

        const queue = new Queue(uuidv4(), String(name).trim(), color)

        const result = await createQueue(
            queue,
            super_user || null,
            distribution === true || distribution === 'true',
            schema
        )
        global.socketIoServer?.to(`schema_${schema}`).emit('new_queue', result)
        res.status(201).json({
            result
        })
    }catch(error){
        // 23505 = nome duplicado (queues.name é UNIQUE); 23503 = superusuário inexistente
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Já existe uma fila com esse nome' });
        }
        if (error.code === '23503') {
            return res.status(400).json({ error: 'Super-usuário informado não existe' });
        }
        console.error("Erro ao criar fila:", error.message);
        res.status(500).json({ error: 'Erro ao criar fila' });
    }
}

const getUserQueuesController=async(req,res)=>{
    try{
        const {userId}=req.params
        const schema = req.params.schema

        if (!schema || schema === 'null' || schema === 'undefined') {
            return res.status(400).json({
                error: 'Schema é obrigatório'
            });
        }

        const result = await getUserQueues(userId, schema)
        res.status(200).json({
            result
        })
    }catch(error){
        console.error(error)
        res.status(500).json({ error: 'Erro ao buscar filas do usuário' });
    }
    
}

const getAllQueuesControllers = async(req, res)=> {
    try{
        const {schema} = req.params
        
        if (!schema || schema === 'null' || schema === 'undefined') {
            return res.status(400).json({
                error: 'Schema é obrigatório'
            });
        }
        
        const result = await getAllQueues(schema)
        res.status(200).json({
            result
        })
    }catch(error){
        console.error(error)
        res.status(500).json({ error: 'Erro ao buscar filas' });
    }
}
const deleteQueueController = async(req, res)=>{
    try{
        const {queueId, schema} = req.params;
        const result = await deleteQueue(queueId, schema)
        res.status(200).json({success:true})
    }catch(error){
        console.error(error)
        res.status(500).json({ error: 'Erro ao deletar fila' });
}
}
const getQueueByIdController = async(req, res)=> {
    try{
        const {queue_id, schema} = req.params
        
        if (!schema || schema === 'null' || schema === 'undefined') {
            return res.status(400).json({
                error: 'Schema é obrigatório'
            });
        }
        
        if(queue_id === null || queue_id === 'null' || queue_id === undefined){
            res.status(200).json({
                success:true,
                message:'Conexão sem fila'
            })
            
        }else{
            console.log('------------------------')
            const result = await getQueueById(queue_id, schema)
            res.status(200).json({
                result
            })
        }
    }catch(error){
        console.error(error)
        res.status(500).json({ error: 'Erro ao buscar fila' });
    }
}


const transferQueueController = async (req, res) => {
  try {
    const { chatId, newQueueId, schema } = req.body;
    const result = await transferQueue(chatId, newQueueId, schema);
    const updatedChat = await setUserChat(chatId, schema);
    if (updatedChat.assigned_user) {
      global.socketIoServer.to(`user_${updatedChat.assigned_user}`).emit('chats_updated', [updatedChat]);
    }
    res.status(200).json({ result });
  } catch (error) {
    console.error('Erro ao transferir fila:', error.message);
    res.status(500).json({ error: 'Erro ao transferir fila' });
  }
};

const updateUserQueuesController = async (req, res) => {
  try {
    const { userId, queueIds, schema } = req.body;

    if (!userId || !schema) {
      return res.status(400).json({ error: 'userId e schema são obrigatórios' });
    }

    const result = await updateUserQueues(userId, queueIds, schema);
    res.status(200).json({ 
      success: true, 
      message: 'Filas do usuário atualizadas com sucesso',
      result 
    });
  } catch (error) {
    console.error('Erro ao atualizar filas do usuário:', error);
    res.status(500).json({ error: 'Erro ao atualizar filas do usuário' });
  }
};

const updateWebhookUrlController = async (req, res) => {
    const { queue_id, webhook_url } = req.body;
    const schema = req.schema || req.body.schema;
    try {
        // Recusa a URL na hora de salvar, com o motivo na tela: sem isso o único registro
        // de uma URL inválida seria um log de worker que ninguém lê.
        if (webhook_url) {
            const check = await validarUrlDeWebhook(webhook_url);
            if (!check.ok) {
                return res.status(400).json({ success: false, error: `Webhook recusado: ${check.motivo}` });
            }
        }

        const result = await updateWebhookUrl(queue_id, webhook_url, schema)
        res.status(200).json({
            success:true,
            data:result
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({
            success:false
        })
    }
}
const toggleWebhookStatusController = async (req, res) => {
    const { queue_id, status, schema } = req.body;
    try {
        const result = await toggleWebhookStatus(queue_id, status, schema)
        res.status(200).json({
            success:true,
            data:result
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({
            success:false
        })
    }
}
const getUsersInQueueController = async (req, res) => {
    try {
        const { queue_id, schema } = req.params;
        
        if (!schema || schema === 'null' || schema === 'undefined') {
            return res.status(400).json({
                error: 'Schema é obrigatório'
            });
        }
        
        const result = await getUsersInQueue(queue_id, schema);

        const usersData = [];
        for (const user of result) {
            const userData = await getUserById(user.user_id, schema);
            if (userData) {
                const { password, ...safe } = userData;
                usersData.push(safe);
            }
        }

        res.status(200).json({
            success: true,
            data: result,
            users: usersData
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false
        });
    }
};

// PUT /queue/update-queue — edição da fila pela tela de Filas.
// A rota não existia: o modal "Editar Fila" chamava este endpoint e recebia 404,
// virando o toast "Não foi possível concluir a ação (erro 404)".
const updateQueueController = async (req, res) => {
    try {
        const { queueId, name, color, super_user, distribution } = req.body;
        const schema = req.schema || req.body.schema;

        if (!queueId || !UUID_RE.test(String(queueId))) {
            return res.status(400).json({ error: 'Fila inválida' });
        }
        if (!name || !String(name).trim()) {
            return res.status(400).json({ error: 'O nome da fila é obrigatório' });
        }

        const result = await updateQueue(
            queueId,
            String(name).trim(),
            color,
            super_user,
            distribution === true || distribution === 'true',
            schema
        );

        if (!result) {
            return res.status(404).json({ error: 'Fila não encontrada' });
        }

        global.socketIoServer?.to(`schema_${schema}`).emit('queue_updated', result);

        res.status(200).json({ success: true, result });
    } catch (error) {
        // 23505 = nome duplicado (queues.name é UNIQUE); 23503 = superusuário inexistente
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Já existe uma fila com esse nome' });
        }
        if (error.code === '23503') {
            return res.status(400).json({ error: 'Super-usuário informado não existe' });
        }
        console.error('Erro ao atualizar fila:', error.message);
        res.status(500).json({ error: 'Erro ao atualizar fila' });
    }
};

// PUT /queue/set-queue-users — define os atendentes DESTA fila.
// Não dá para reaproveitar o update-user-queues: ele apaga todas as filas do usuário e
// reinsere a lista recebida, o que arrancaria o atendente das outras filas dele.
const setQueueUsersController = async (req, res) => {
    try {
        const { queueId, userIds } = req.body;
        const schema = req.schema || req.body.schema;

        if (!queueId || !UUID_RE.test(String(queueId))) {
            return res.status(400).json({ error: 'Fila inválida' });
        }
        if (userIds !== undefined && !Array.isArray(userIds)) {
            return res.status(400).json({ error: 'userIds deve ser uma lista' });
        }
        const ids = (userIds || []).map(String);
        if (ids.some(id => !UUID_RE.test(id))) {
            return res.status(400).json({ error: 'Lista de atendentes inválida' });
        }

        await setQueueUsers(queueId, ids, schema);

        global.socketIoServer?.to(`schema_${schema}`).emit('queue_users_updated', { queueId, userIds: ids });

        res.status(200).json({ success: true, queueId, userIds: ids });
    } catch (error) {
        if (error.code === '23503') {
            return res.status(400).json({ error: 'Atendente informado não existe' });
        }
        console.error('Erro ao definir atendentes da fila:', error.message);
        res.status(500).json({ error: 'Erro ao definir atendentes da fila' });
    }
};

module.exports = {
    createQueueController,
    getUserQueuesController,
    getAllQueuesControllers,
    deleteQueueController,
    getQueueByIdController,
    transferQueueController,
    updateQueueController,
    updateUserQueuesController,
    setQueueUsersController,
    updateWebhookUrlController,
    toggleWebhookStatusController,
    getUsersInQueueController
}