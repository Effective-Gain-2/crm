const { getConfig, upsertConfig, addDocument, listDocuments, deleteDocument } = require('../services/AiAgentService');

const VALID_STATUS = ['disabled', 'suggestive', 'autopilot'];

const getConfigController = async (req, res) => {
    try {
        const { schema } = req.params;
        const config = await getConfig(schema);
        res.status(200).json({ config });
    } catch (error) {
        console.error('Erro ao buscar config do agente:', error);
        res.status(500).json({ error: 'Erro ao buscar configuração do agente' });
    }
};

const updateConfigController = async (req, res) => {
    try {
        const { schema, ...fields } = req.body;
        if (!schema) return res.status(400).json({ error: 'schema é obrigatório' });
        if (fields.status && !VALID_STATUS.includes(fields.status)) {
            return res.status(400).json({ error: `status inválido (use: ${VALID_STATUS.join(', ')})` });
        }
        const config = await upsertConfig(schema, fields);
        res.status(200).json({ config });
    } catch (error) {
        console.error('Erro ao salvar config do agente:', error);
        res.status(500).json({ error: 'Erro ao salvar configuração do agente' });
    }
};

const uploadDocumentController = async (req, res) => {
    try {
        const schema = req.body.schema || req.query.schema;
        if (!schema) return res.status(400).json({ error: 'schema é obrigatório' });
        if (!req.file) return res.status(400).json({ error: 'arquivo é obrigatório' });
        const doc = await addDocument(schema, req.file.originalname, req.file.mimetype, req.file.buffer);
        res.status(201).json({ document: doc });
    } catch (error) {
        console.error('Erro ao enviar documento:', error);
        res.status(500).json({ error: 'Erro ao enviar documento' });
    }
};

const listDocumentsController = async (req, res) => {
    try {
        const { schema } = req.params;
        const documents = await listDocuments(schema);
        res.status(200).json({ documents });
    } catch (error) {
        console.error('Erro ao listar documentos:', error);
        res.status(500).json({ error: 'Erro ao listar documentos' });
    }
};

const deleteDocumentController = async (req, res) => {
    try {
        const { id, schema } = req.params;
        await deleteDocument(schema, id);
        res.status(200).json({ deleted: true, id });
    } catch (error) {
        console.error('Erro ao excluir documento:', error);
        res.status(500).json({ error: 'Erro ao excluir documento' });
    }
};

module.exports = {
    getConfigController,
    updateConfigController,
    uploadDocumentController,
    listDocumentsController,
    deleteDocumentController,
};
