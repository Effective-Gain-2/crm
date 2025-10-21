const axios = require('axios')


const listTemplates = async (wa_id, token) => {
    console.log('entroue')
    const response = axios.get(`https://graph.facebook.com/v24.0/${wa_id}/message_templates`,{
        headers:{
            Authorization:`Bearer ${token}`
        }
    })
    return response
}

const createTemplate = async (wa_id, token, name, language, category, parameter, components) => {
        const response = await axios.post(`https://graph.facebook.com/v24.0/${wa_id}/message_templates`,{
            name:name,
            language:language,
            category:category,
            parameter_format:parameter,
            components:components
        },
    {headers:{
        Authorization:`Bearer ${token}`
    }})
    return response
}

module.exports={
    createTemplate,listTemplates
}