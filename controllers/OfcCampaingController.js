const { text } = require("express");
const { getContactsInKanbanStage } = require("../services/KanbanService");
const { listTemplates, createTemplate, sendTemplateMessage, deleteTemplate, editTemplate } = require("../services/OfcCampaing");
const { getCustomValueById } = require("../services/ContactService");
const { getApiConnections } = require("../services/ApiConnection");
const { decryptText } = require("../utils/crypt");

const token = process.env.WHATSAPP_API_TOKEN

const listTemplatesController = async (req, res) => {
    const { wa_id, schema } = req.params;
    const token_phone = await getApiConnections(wa_id, schema)
    try {
        const result = await listTemplates(token_phone.waba_id, token_phone.token)
        res.status(200).json({ success: true, data: result.data.data })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false })
    }
}

const createTemplateController = async (req, res) => {
    const { wa_id, name, language, category, parameter, components, schema } = req.body;
    try {
        const token_phone = await getApiConnections(wa_id, schema)
        const result = await createTemplate(token_phone.waba_id, token_phone.token, name, language, category, parameter, components)
        res.status(200).json({ success: true, data: result.data })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false })
    }
}

const sendTemplateMessageController = async (req, res) => {
    const { phone_id, template_name, etapa_id, variables, schema } = req.body;
    try {
        const token_phone = await getApiConnections(phone_id, schema)
        const contatos = await getContactsInKanbanStage(etapa_id, schema)
        for (const contato of contatos) {
            let variablesArray = []
            const recive_number = contato.number
            for (const variable of (variables || [])) {
                try {
                    switch (variable.value) {
                        case 'nome':
                            variablesArray.push({ label: variable.label, value: contato.contact_name })
                            break
                        case 'numero':
                            variablesArray.push({ label: variable.label, value: contato.number })
                            break
                        default:
                            const result = await getCustomValueById(variable.id, contato.number, schema)
                            if (result && result.value != null) {
                                variablesArray.push({ label: variable.label, value: result.value })
                            } else {
                                variablesArray.push({ label: variable.label, value: '' })
                            }
                    }
                } catch (err) {
                    console.error('error fetching custom value for variable', variable, err)
                    variablesArray.push({ label: variable.label, value: '' })
                }
            }
            
            await sendTemplateMessage(token_phone.phone_id, token_phone.token, template_name, recive_number, variablesArray)
        }
        res.status(200).json({ success: true })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false })
    }
}

const deleteTemplateController = async (req, res) => {
    const { wa_id, template_name } = req.params;
    try {
        await deleteTemplate(wa_id, template_name, token)
        res.status(200).json({ success: true })
    } catch {
        res.status(500).json({ success: false })
    }
}

const editTemplateController = async (req, res) => {
    const { template_id, name, language, category, parameter, components } = req.body;
    console.log(components.buttons)
    try {
        const componentsArray = [
            components.header?.text && {
                type: "HEADER",
                format: components.header.format,
                text: components.header.text
            },
            components.body?.text && {
                type: "BODY",
                text: components.body.text
            },
            components.footer?.text && {
                type: "FOOTER",
                text: components.footer.text
            },
            components.buttons.length > 0 && {
                type: "buttons",
                buttons: components.buttons.map(button => ({
                    type: button.sub_type,
                    text: button.payload,
                    ...(button.sub_type === 'quick_reply' ? {} : (button.sub_type === 'url' ? { url: button.value } : { phone_number: button.value }))
                }))
            }
        ].filter(Boolean);
        await editTemplate(template_id, token, componentsArray)
        res.status(200).json({ success: true })
    } catch (error) {
        console.error(error.data.error)
        res.status(500).json({ success: false })
    }
}

module.exports = {
    listTemplatesController,
    createTemplateController,
    sendTemplateMessageController,
    deleteTemplateController,
    editTemplateController
}