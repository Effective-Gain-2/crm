const { createMessageForBlast } = require("../services/MessageBlast");

const createMessageForBlastController = async (req, res) => {
    try{
        const {messageValue, sector, campaing_id, schema} = req.body
        const result = await createMessageForBlast( messageValue, sector, campaing_id, schema);
        res.status(201).json(result);
    }catch (error) {
        console.error('Erro ao criar mensagem para disparo:', error);
        res.status(500).json({
            erro: 'Não foi possível criar a mensagem para disparo',
        });
    }


}

module.exports={
    createMessageForBlastController
}