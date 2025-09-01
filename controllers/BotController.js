const { createAssistant } = require("../services/OpenAi")

const createAssistantController = async (req, res) => {
    const {name, instructions, model} = req.body
    try {
        const result = await createAssistant(name, instructions, model)
        res.status(200).json({
            success:true,
            data:result
        })
    } catch (error) {
        console.error(error)
        res.status(400).json({
            success:false,
            message:'Erro ao criar assistente'
        })
    }
}

module.exports={
    createAssistantController
}