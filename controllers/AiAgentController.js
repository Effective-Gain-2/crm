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

// ---- Chaves de API por cliente (write-only) + uso de IA ----
const { setSetting, deleteSetting, listSettingKeys, getAiUsageSummary } = require('../services/IntegrationService');

const ALLOWED_KEYS = ['openai_api_key', 'meta_page_access_token', 'meta_verify_token', 'meta_app_secret'];

const getIntegrationsController = async (req, res) => {
    try {
        const schema = req.auth.schema;
        const keys = await listSettingKeys(schema);
        const usage = await getAiUsageSummary(schema);
        const hasEnvFallback = !!process.env.OPENAI_KEY;
        res.status(200).json({ keys, usage, has_env_fallback: hasEnvFallback });
    } catch (error) {
        console.error('Erro ao listar integrações:', error);
        res.status(500).json({ error: 'Erro ao listar integrações' });
    }
};

const setIntegrationController = async (req, res) => {
    try {
        const schema = req.auth.schema;
        const { key, value } = req.body;
        if (!ALLOWED_KEYS.includes(key)) return res.status(400).json({ error: 'Chave não suportada' });
        if (!value) return res.status(400).json({ error: 'Valor obrigatório' });
        await setSetting(schema, key, value, req.auth.account_id);
        res.status(200).json({ success: true, key });
    } catch (error) {
        console.error('Erro ao salvar integração:', error);
        res.status(500).json({ error: 'Erro ao salvar integração' });
    }
};

const deleteIntegrationController = async (req, res) => {
    try {
        const schema = req.auth.schema;
        const { key } = req.params;
        if (!ALLOWED_KEYS.includes(key)) return res.status(400).json({ error: 'Chave não suportada' });
        await deleteSetting(schema, key);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Erro ao remover integração:', error);
        res.status(500).json({ error: 'Erro ao remover integração' });
    }
};

module.exports = {
    getConfigController,
    updateConfigController,
    uploadDocumentController,
    listDocumentsController,
    deleteDocumentController,
    getIntegrationsController,
    setIntegrationController,
    deleteIntegrationController,
};
