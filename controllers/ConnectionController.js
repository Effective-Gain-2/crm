const Connection = require("../entities/Connection")
const { v4: uuidv4 } = require('uuid');
const { createConnection, setQueue, getAllConnections, deleteConnection, updateWebhookUrl, toggleWebhookStatus, searchConnById } = require("../services/ConnectionService");
const { deleteInstance, getConnectionHealth } = require("../requests/evolution");
const { deleteEverythingApiOfc, getAllApiConnections } = require("../services/ApiConnection");

const createConnectionController = async(req, res)=>{
    try{
        const {name, number} = req.body
        const conn = new Connection(
            uuidv4(),
            name,
            number,
            []
        )
        const schema = req.schema
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
        const schema = req.schema;
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
        const schema = req.schema;
        
        if (!schema || schema === 'null' || schema === 'undefined') {
            return res.status(400).json({
                error: 'Schema é obrigatório'
            });
        }
        
        const result = await getAllConnections(schema)
        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao buscar todas as conexões:', error.message);
        res.status(500).json({ error: 'Erro ao buscar todas as conexões' });
    }
};

const getAllConnectionsWithStatusController = async (req, res) => {
    try {
        const schema = req.schema;
        
        if (!schema || schema === 'null' || schema === 'undefined') {
            return res.status(400).json({
                error: 'Schema é obrigatório'
            });
        }
        
        const result = await getAllConnections(schema);
        let connectionStatus = []
        for (const connection of result){
            const connstatus = await getConnectionHealth(connection.name)
            if(connstatus.status===404 || connstatus.status==='404'){
                const status = {
                    connection:connection,
                    status:'closed'
                }
                connectionStatus.push(status)
            }else{
                const status = {
                    connection:connection,
                    status: connstatus[0].connectionStatus
                }
                connectionStatus.push(status)
            }
        }
        res.status(200).json(connectionStatus);
    } catch (error) {
        console.error('Erro ao buscar todas as conexões:', error.message);
        res.status(500).json({ error: 'Erro ao buscar todas as conexões' });
    }
}
const deleteConnectionController =async (req, res) => {
    try {
        const {connection_id, instanceName} = req.params
        const schema = req.schema;
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
    const {connection_id} = req.params
    const schema = req.schema
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

const deleteApiOfcDataController = async (req, res) => {
    try {
        const { phone_id} = req.params;
        const schema = req.schema;
        await deleteEverythingApiOfc(phone_id, schema);
        res.status(200).json({
            success: true,
            message: 'Dados da API OFC apagados com sucesso'
        });
    } catch (error) {
        console.error('Erro ao apagar dados API OFC:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao apagar dados da API OFC'
        });
    }
}

const getAllApiOfcConnectionsController = async (req, res) => {
    try {
        const { schema } = req.schema;

        if (!schema || schema === 'null' || schema === 'undefined') {
            return res.status(400).json({
                success: false,
                error: 'Schema é obrigatório'
            });
        }

        const result = await getAllApiConnections(schema);
        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao buscar conexões API OFC:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar conexões API OFC'
        });
    }
}

module.exports = {
    createConnectionController, 
    setQueueController,
    getAllConnectionsController,
    deleteConnectionController,
    searchConnByIdController,
    getAllConnectionsWithStatusController,
    deleteApiOfcDataController,
    getAllApiOfcConnectionsController
}