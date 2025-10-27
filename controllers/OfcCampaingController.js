const { getContactsInKanbanStage } = require("../services/KanbanService");
const { listTemplates, createTemplate, sendTemplateMessage, deleteTemplate, editTemplate } = require("../services/OfcCampaing");

const token = process.env.WHATSAPP_API_TOKEN

const listTemplatesController = async (req, res) => {
    const {wa_id} = req.params;
    try {
        const result = await listTemplates(wa_id, token)
        res.status(200).json({success:true, data:result.data.data})
    } catch (error) {
        console.error(error)
        res.status(500).json({success:false})
    }
}

const createTemplateController = async (req, res) => {
    const {wa_id, name, language, category, parameter, components } = req.body;
    try {
        const result = await createTemplate(wa_id, token, name, language, category, parameter, components)
        res.status(200).json({success:true, data:result.data})
    } catch (error) {
        console.error(error)
        res.status(500).json({success:false})
    }
}

const sendTemplateMessageController = async (req, res) => {
    const {phone_id, template_name, etapa_id, schema} = req.body;
    try {
        const contatos = await getContactsInKanbanStage(etapa_id, schema)
        for(const contato of contatos){
            const recive_number = contato.number
            await sendTemplateMessage(phone_id, token, template_name, recive_number)
        }
        res.status(200).json({success:true})
    } catch (error) {
        console.error(error)
        res.status(500).json({success:false})
    }
}

const deleteTemplateController = async (req, res) => {
    const {wa_id, template_name} = req.params;
    try{
        await deleteTemplate(wa_id, template_name, token)
        res.status(200).json({success:true})
    }catch{
        res.status(500).json({success:false})
    }
}

const editTemplateController = async (req, res) => {
    const {template_id, name, language, category, parameter, components} = req.body;
    console.log(req.body)
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
  }
].filter(Boolean);
        await editTemplate(template_id, token, componentsArray)
        res.status(200).json({success:true})
    } catch (error) {
        console.error(error.data.error)
        res.status(500).json({success:false})
    }
}

module.exports = {
    listTemplatesController,
    createTemplateController,
    sendTemplateMessageController,
    deleteTemplateController,
    editTemplateController
}