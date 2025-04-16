const { v4: uuidv4 } = require('uuid');
const { createInstance, fetchInstanceEvo, sendTextMessage } = require('../requests/evolution');
const Connections = require('../entities/Connection');
const { createConnection, fetchInstance, searchConnById } = require('../services/ConnectionService');

const createInstanceController = async(req, res)=>{
    try{
        console.log("Corpo da requisição:", req.body);
        const {instanceName, number} = req.body
        const schema = req.body.schema || 'crm'

        const result = await createInstance({
            instanceName: instanceName,
            number:number
          });
          
          const conn = new Connections(result.instance.instanceId, instanceName, number)
          await createConnection(conn, schema)
          

        res.status(201).json({
            result
        })
    }catch(error){
        console.error("Erro ao criar instancia:", error.message);
        res.status(500).json({ error: 'Erro ao criar instancia' });
    }
}

const fetchInstanceController = async (req, res) => {
    try {
      const schema = req.query.schema || 'crm';
  
      const instances = await fetchInstance(schema);
  
      if (!instances.length) {
        return res.status(404).json({ message: 'Nenhuma instância encontrada' });
      }
  
      const instanceName = instances[0].name;
      const result = await fetchInstanceEvo(instanceName);
  
      res.status(200).json({ result });
    } catch (error) {
      console.error('Erro ao buscar instâncias:', error.message);
      res.status(500).json({ error: 'Erro ao buscar instâncias' });
    }
  };

const sendTextMessageController = async(req, res)=>{
  try{
    const body = req.body
    console.log(req.body)
    const schema = req.body.schema || 'crm'
    const instance = await searchConnById(schema, body.connectionId)
    console.log(instance)
    const result = await sendTextMessage(instance.name, body.text, body.number)
    res.status(200).json({ result });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error.message);
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
}

module.exports = {
    createInstanceController, fetchInstanceController, sendTextMessageController
}