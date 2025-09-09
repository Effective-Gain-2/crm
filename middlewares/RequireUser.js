const requireUser = async (req, res, next) => {
    if(!req.user_id){
        return res.status(403).json({
            error: 'Usuário não autenticado ou token inválido'
        })
    }
    return next()
}