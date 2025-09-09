const { setPreference, getPreferencesByUser, updatePreference } = require("../services/UserPreferencesService")

const setPreferenceController = async (req, res) => {
    const {user_id, key, value, schema, userRole} = req.body
    try {
        const result = await setPreference(user_id, key, value, schema, userRole)
        res.status(201).json({
            success:true, 
            data:result
        })
    } catch (error) {
        console.error(error)
        res.status(400).json({
            success:false,
            message:'Erro ao definir preferência'
        })
    }
}

const getPreferencesByUserController = async (req, res) => {
    const {user_id, schema} = req.params
    try {
        if(!user_id){
            res.status(404).json({
                success:false,
                message:'Usuario não encontrado'
            })
        }else{
            const result = await getPreferencesByUser(user_id, schema)
            res.status(200).json({
                success:true,
                data:result
            })
        }
        
    } catch (error) {
        console.error(error)
        res.status(400).json({
            success:false,
            message:'Erro ao buscar preferência'
        })
    }
}

const updatePreferenceController = async (req, res) => {
    const {user_id, key, value, schema} = req.body
    try {
        const result = await updatePreference(user_id, key, value, schema)
        res.status(200).json({
            success:true,
            data:result
        })
    } catch (error) {
        console.error(error)
        res.status(400).json({
            success:false,
            message:'Erro ao atualizar preferência'
        })
    }
}

module.exports = {
    setPreferenceController,
    getPreferencesByUserController,
    updatePreferenceController,

}