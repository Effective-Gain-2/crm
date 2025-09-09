const Connection = require("../entities/Connection")
const { v4: uuidv4 } = require('uuid');
const { createConnection, setQueue, getAllConnections, deleteConnection, updateWebhookUrl, toggleWebhookStatus, searchConnById } = require("../services/ConnectionService");
const { deleteInstance } = require("../requests/evolution");

const createConnectionController = async(req, res)=>{
    try{
        const {name, number} = req.body
        const conn = new Connection(
            uuidv4(),
            name,
            number,
            []
        )
        const schema = req.body.schema
        const result = await createConnection(conn, schema);

      res.status(201).json(result);
    }catch (err) {
        console.error("Erro ao criar conexão:", err.message);
        res.status(500).json({ error: 'Erro ao conexão' });
      }
}
const setQueueController = async(req, res)=>{
    try{
        const {connection_id, queue_id} = req.body
        const schema = req.body.schema;
        const result = await setQueue(connection_id, queue_id, schema);

      res.status(201).json({
        success: true,
        data: result
      });
    }catch (err) {
        console.error("Erro ao criar conexão:", err.message);
        res.status(500).json({ error: 'Erro ao conexão' });
      }
}

const getAllConnectionsController = async (req, res) => {
    try {
        const schema = req.params.schema;
        
        if (!schema || schema === 'null' || schema === 'undefined') {
            return res.status(400).json({
                error: 'Schema é obrigatório'
            });
        }
        
        const result = await getAllConnections(schema);
        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao buscar todas as conexões:', error.message);
        res.status(500).json({ error: 'Erro ao buscar todas as conexões' });
    }
};
const deleteConnectionController =async (req, res) => {
    try {
        const {connection_id, instanceName, schema} = req.params
        const result = await deleteConnection(connection_id, schema)
        await deleteInstance(instanceName)

        res.status(200).json({result})
    } catch (error) {
        console.error(error)
        res.stats(500).json({
            error:'Erro ao deletar conexão'
        })
    }
}
const searchConnByIdController = async (req, res) => {
    const {connection_id, schema} = req.params
    try {
        const result = await searchConnById(connection_id, schema)
        res.status(200).json({
            success: true,
            data: result
        })
        
    } catch (error) {
        console.error(error)
        res.status(500).json({
            success:false,

        })
    }
}

module.exports = {
    createConnectionController, 
    setQueueController,
    getAllConnectionsController,
    deleteConnectionController,
    searchConnByIdController
}