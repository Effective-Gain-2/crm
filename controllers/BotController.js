const { insertBotInTable, deleteBotInTable, getBots, getFunctions, insertBotFunctions, deleteAllBotFunctions } = require("../services/BotService")
const { createAssistant, deleteAssistant } = require("../services/OpenAi")

const createAssistantController = async (req, res) => {
    const {name, instructions, model, schema} = req.body
    try {
        const result = await createAssistant(name, instructions, model)
        await insertBotInTable(result.id, name, instructions, model, false, schema)
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

const deleteAssistantController = async (req, res) => {
    const {assistant_id, schema} = req.params
    try {
        await deleteAssistant(assistant_id)
        await deleteBotInTable(assistant_id, schema)
        res.status(200).json({
            success:true,
            message:'Assistente deletado com sucesso'
        })
    } catch (error) {
        console.error(error)
        res.status(400).json({
            success:false,
            message:'Erro ao deletar assistente'
        })
    }
}
const getBotsController = async (req, res) => {
    const {schema} = req.params
    try {
        if(!schema){
            return res.status(400).json({
                success:false,
                message:'Schema não informado'
            })
        }
        const result = await getBots(schema)
        res.status(200).json({
            success:true,
            data:result
        })
        
    } catch (error) {
        console.error(error)
        res.status(500).json({
            success:false,
            message:'Erro ao buscar assistentes'
        })
    }
}
const getFunctionsController = async (req, res) => {
    const {schema} = req.params
    try {
        const result = await getFunctions(schema)
        res.status(200).json({
            success:true,
            data:result
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({
            success:false,
            message:'Erro ao buscar funções'
        })
    }
}
const insertBotFunctionsController = async (req, res) => {
    const {assistant_id, function_id, schema} = req.body
    try {
        await deleteAllBotFunctions(assistant_id, schema)
        const result = await insertBotFunctions(assistant_id, function_id, schema)
        res.status(200).json({
            success:true,
            data:result
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({
            success:false,
            message:'Erro ao inserir funções no assistente'
        })
    }
}
module.exports={
    createAssistantController,
    deleteAssistantController,
    getBotsController,
    getFunctionsController,
    insertBotFunctionsController
}