const { text } = require("express")
const { getAjudaMensagens, upsertAjudaTextos } = require("../services/AjudaService")

const getAjudaMensagensController = async (req,res) => {
    try {
        const result = await getAjudaMensagens()
        res.status(200).json({success:true, result})
    } catch (error) {
        console.error(error)
        res.status(500).json({success:false})
    }
}

const upsertAjudaTextosController = async (req, res) => {
    const {section, texto} = req.body
    try {
        const result = await upsertAjudaTextos(section, texto)
        res.status(200).json({success:true, result})
    } catch (error) {
        console.error(error)
        res.status(500).json({success:false})
    }
}

module.exports={
    getAjudaMensagensController,
    upsertAjudaTextosController
}