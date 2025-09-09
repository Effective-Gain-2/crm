const { insertLimits, updateLimits, getLimitsBySchema } = require("../services/LimitsService")

const insertLimitsController = async (req, res) => {
    const {name, is_on, quantity, schema}=req.body
    try {
        const result = await insertLimits(name, is_on, quantity||null, schema)
        res.status(200).json({
            success:true,
            data:result
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({
            success:false,
            message:'Erro ao inserir limite'
        })
    }
}

const updateLimitsController = async (req, res) => {
    const {name, is_on, quantity, schema}=req.body
    try {
        const result = await updateLimits(name, is_on, quantity, schema)
        res.status(200).json({
            success:true,
            data:result
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({
            success:false,
            message:'Erro ao atualizar limite'
        })
    }
}

const getLimitsBySchemaController = async (req, res) => {
    const {schema} = req.params
    try {
        const result = await getLimitsBySchema(schema)
        res.status(200).json({
            success:true,
            data:result
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({
            success:false,
            message:'Erro ao carregar limites'
        })
    }
}

module.exports={
    insertLimitsController,
    updateLimitsController,
    getLimitsBySchemaController
}