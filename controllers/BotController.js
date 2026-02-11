const { insertBotInTable, deleteBotInTable, getBots, getFunctions, insertBotFunctions, deleteAllBotFunctions, updateBotInTable } = require("../services/BotService")
const { createAssistant, deleteAssistant, updateAssistant } = require("../services/OpenAi")

const createAssistantController = async (req, res) => {
    const {name, instructions, model} = req.body
    const schema = req.schema
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
    const {assistant_id} = req.params
    const schema = req.schema
    try {
        await deleteAssistant(assistant_id)
    } catch (error) {
        res.status(500).json({
            success:false,
            message:'Erro ao deletar assistente IA'
        })
    }finally{
        try {
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
}
const getBotsController = async (req, res) => {
    const schema = req.schema
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
    const schema = req.schema
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
    const {assistant_id, function_id} = req.body
    const schema = req.schema
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
const updateBotController = async (req, res) => {
    const {assistant_id} = req.params
    const {name, instructions, model, functions} = req.body
    const schema = req.schema
    try {
        let tools = []
        if(functions && functions.length>0){
            for(const func of functions){
                await insertBotFunctions(assistant_id, func.id, schema)
                tools.push({
                type: 'function',
                function: {
                    name: func.name,
                    description: func.label,
                    parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                    }
                }
                })
            }
        }
        const result = await updateAssistant(assistant_id, name, instructions, model, tools)
        await updateBotInTable(assistant_id, name, instructions, model, null, schema)
        res.status(200).json({
            success:true,
            message:'Assistente atualizado com sucesso'
        })

    } catch (error) {
        console.error(error)
        res.status(500).json({
            success:false,
            message:'Erro ao atualizar assistente'
        })
    }
}
module.exports={
    createAssistantController,
    deleteAssistantController,
    getBotsController,
    getFunctionsController,
    insertBotFunctionsController,
    updateBotController
}