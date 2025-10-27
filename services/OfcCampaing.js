const axios = require('axios')


const listTemplates = async (wa_id, token) => {
    const response = axios.get(`https://graph.facebook.com/v24.0/${wa_id}/message_templates`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
    return response
}

const createTemplate = async (wa_id, token, name, language, category, parameter, components) => {
    console.log(components)
    try {
        const response = await axios.post(`https://graph.facebook.com/v24.0/${wa_id}/message_templates`, {
            name: name,
            language: language,
            category: category,
            parameter_format: parameter,
            components: [
                components.header?.text && {
                    type: "HEADER",
                    format: components.header?.format,
                    text: components.header?.text
                },
                components.body?.text && {
                    type: "BODY",
                    text: components.body?.text
                },
                components.footer?.text && {
                    type: "FOOTER",
                    text: components.footer?.text
                }
            ].filter(Boolean)
        },
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
        return response
    } catch (error) {
        console.error('Erro ao criar template:', error.response ? error.response.data : error.message);
    }
}

const sendTemplateMessage = async (phone_id, token, template_name, recive_number) => {
    try {
        await axios.post(`https://graph.facebook.com/v24.0/${phone_id}/messages`, {
            messaging_product: "whatsapp",
            to: recive_number,
            type: "template",
            template: {
                name: template_name,
                language: { code: "pt_BR" }
            },
        }, { headers: { Authorization: `Bearer ${token}` } })
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error.response ? error.response.data : error.message);
    }

}
const deleteTemplate = async (wa_id, template_name, token) => {
    try {
        await axios.delete(`https://graph.facebook.com/v24.0/${wa_id}/message_templates?name=${template_name}`,
            { headers: { Authorization: `Bearer ${token}` } }
        )
    } catch (error) {
        console.error('Erro ao deletar template:', error.response ? error.response.data : error.message);
    }
}

const editTemplate = async (template_id, token, components) => {
    try {
        await axios.post(`https://graph.facebook.com/v24.0/${template_id}`, {
            components: components
        }, { headers: { Authorization: `Bearer ${token}` } })
    } catch (error) {
        console.error(error.response ? error.response.data : error.message);
    }
}
module.exports = {
    createTemplate, listTemplates, sendTemplateMessage, deleteTemplate, editTemplate
}