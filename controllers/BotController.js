const { insertBotInTable, deleteBotInTable, getBots, getFunctions, insertBotFunctions, deleteAllBotFunctions, updateBotInTable, setBotTestMode, getBotTestNumbers, addBotTestNumber, removeBotTestNumber } = require("../services/BotService")
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
const setTestModeController = async (req, res) => {
    const { assistant_id } = req.params
    const { test_mode } = req.body
    const schema = req.schema
    try {
        const result = await setBotTestMode(assistant_id, test_mode, schema)
        if (!result) {
            return res.status(404).json({ success: false, message: 'Assistente não encontrado' })
        }
        res.status(200).json({ success: true, data: result })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: 'Erro ao atualizar modo de teste' })
    }
}

const getTestNumbersController = async (req, res) => {
    const { assistant_id } = req.params
    const schema = req.schema
    try {
        const result = await getBotTestNumbers(assistant_id, schema)
        res.status(200).json({ success: true, data: result })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: 'Erro ao buscar números de teste' })
    }
}

const addTestNumberController = async (req, res) => {
    const { assistant_id } = req.params
    const { number } = req.body
    const schema = req.schema
    try {
        const result = await addBotTestNumber(assistant_id, number, schema)
        if (!result) {
            return res.status(200).json({ success: true, data: null, message: 'Número já cadastrado' })
        }
        res.status(201).json({ success: true, data: result })
    } catch (error) {
        console.error(error)
        res.status(400).json({ success: false, message: error.message || 'Erro ao adicionar número' })
    }
}

const removeTestNumberController = async (req, res) => {
    const { assistant_id, id } = req.params
    const schema = req.schema
    try {
        const result = await removeBotTestNumber(id, assistant_id, schema)
        if (!result) {
            return res.status(404).json({ success: false, message: 'Número não encontrado' })
        }
        res.status(200).json({ success: true, data: result })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: 'Erro ao remover número' })
    }
}

module.exports={
    createAssistantController,
    deleteAssistantController,
    getBotsController,
    getFunctionsController,
    insertBotFunctionsController,
    updateBotController,
    setTestModeController,
    getTestNumbersController,
    addTestNumberController,
    removeTestNumberController
}