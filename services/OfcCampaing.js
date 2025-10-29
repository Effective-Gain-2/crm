const axios = require('axios')
const { json } = require('express')


const listTemplates = async (wa_id, token) => {
    const response = await axios.get(`https://graph.facebook.com/v24.0/${wa_id}/message_templates`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
    return response
}

const createTemplate = async (wa_id, token, name, language, category, parameter, components) => {
    try {
        const response = await axios.post(`https://graph.facebook.com/v24.0/${wa_id}/message_templates`, {
            name: name,
            language: language,
            category: category,
            parameter_format: 'named',
            components: [
                components.header?.text && {
                    type: "HEADER",
                    format: components.header?.format,
                    text: components.header?.text
                },
                components.body?.text && {
                    type: "BODY",
                    text: components.body.text,
                    ...(components.body.example?.body_text_named_params?.length > 0
                        ? {
                            example: {
                                body_text_named_params: components.body.example.body_text_named_params.map(param => ({
                                    param_name: param.param_name,
                                    example: param.example
                                }))
                            }
                        }
                        : {})
                },
                components.footer?.text && {
                    type: "FOOTER",
                    text: components.footer?.text
                },
                components.buttons?.lenght > 0 && {
                    type: "buttons",
                    buttons: components.buttons.map(button => ({
                        type: button.sub_type,
                        text: button.text,
                        ...(button.sub_type === 'quick_reply' ? {} : (button.sub_type === 'url' ? { url: button.url } : { phone_number: button.phone_number }))
                    }))
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

const sendTemplateMessage = async (phone_id, token, template_name, recive_number, examples) => {
    let examplesArray = []
    examples.map(example => {
        examplesArray.push({
            type: "text",
            parameter_name: example.label,
            text: example.value
        })
    })
    try {
        await axios.post(`https://graph.facebook.com/v24.0/${phone_id}/messages`, {
            messaging_product: "whatsapp",
            to: recive_number,
            type: "template",
            template: {
                name: template_name,
                language: { code: "pt_BR" },
                components: examplesArray.length > 0
                    ? [
                        {
                            type: "body",
                            parameters: examplesArray
                        }
                    ]
                    : []
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