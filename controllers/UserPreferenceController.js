const { setPreference, getPreferencesByUser, updatePreference } = require("../services/UserPreferencesService")

// user_id e schema vêm sempre do token — nunca do corpo/URL, que o cliente controla.
// O front continua enviando os campos antigos; eles são simplesmente ignorados.
const authContext = (req) => ({
    user_id: req.auth?.local_user_id || req.user_id,
    schema: req.auth?.schema,
    role: req.auth?.role
})

const setPreferenceController = async (req, res) => {
    const {key, value} = req.body
    const {user_id, schema, role} = authContext(req)
    try {
        if(!user_id || !schema){
            return res.status(401).json({
                success:false,
                message:'Sessão inválida'
            })
        }
        if(!key || typeof key !== 'string'){
            return res.status(400).json({
                success:false,
                message:'Chave de preferência inválida'
            })
        }
        const result = await setPreference(user_id, key, value, schema, role)
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
    const {user_id, schema} = authContext(req)
    try {
        if(!user_id || !schema){
            res.status(401).json({
                success:false,
                message:'Sessão inválida'
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
    const {key, value} = req.body
    const {user_id, schema} = authContext(req)
    try {
        if(!user_id || !schema){
            return res.status(401).json({
                success:false,
                message:'Sessão inválida'
            })
        }
        if(!key || typeof key !== 'string'){
            return res.status(400).json({
                success:false,
                message:'Chave de preferência inválida'
            })
        }
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
