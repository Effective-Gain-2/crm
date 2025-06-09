const Queue = require("../entities/Queue");
const { v4: uuidv4 } = require('uuid');
const { createQueue, addUserinQueue, getUserQueues, getAllQueues, deleteQueue, getQueueById } = require("../services/QueueService");

const createQueueController = async(req, res)=>{
    try{
        const {name, color, super_user, distribution} = req.body;

        const queue = new Queue(uuidv4(), name, color)
        
        const schema = req.body.schema || 'effective_gain'
        const result = createQueue(queue, super_user, distribution, schema)
        
        res.status(201).json({
            result
        })
    }catch(error){
        console.error("Erro ao criar fila:", error.message);
        res.status(500).json({ error: 'Erro ao criar fila' });
    }
}

const addUserinQueueController = async(req, res)=>{    
   try{
    const {user, queue}=req.body;
    const schema = req.body.schema || 'effective_gain';

    console.log("Body recebido:", req.body);
    
    const result = addUserinQueue(user, queue, schema)

    res.status(201).json({
        result
    })
    }catch(error){
        console.log(error)
    }
}

const getUserQueuesController=async(req,res)=>{
    try{
        const {userId}=req.params
        const schema = req.params.schema

        const result = await getUserQueues(userId, schema)
        res.status(201).json({
            result
        })
    }catch(error){
        console.log(error)
    }
    
}

const getAllQueuesControllers = async(req, res)=>{
    try{
        const {schema} = req.params

        const result = await getAllQueues(schema)

        res.status(201).json({
            result
        })
    }catch(error){
        console.log(error)
    }

}
const deleteQueueController = async(req, res)=>{
    try{
        const {queueId, schema} = req.params;
        const result = await deleteQueue(queueId, schema)
    }catch(error){
        console.log(error)
        res.status(500).json({ error: 'Erro ao deletar fila' });
}
}
const getQueueByIdController = async(req, res)=>{
    try{
        const {queue_id, schema} = req.params
        console.log(queue_id, schema)
        const result = await getQueueById(queue_id, schema)
        res.status(201).json({
            result
        })
    }catch(error){
        console.log(error)
        res.status(500).json({ error: 'Erro ao buscar fila' });
}
}
module.exports = {
    createQueueController,
    addUserinQueueController,
    getUserQueuesController,
    getAllQueuesControllers,
    deleteQueueController,
    getQueueByIdController
}