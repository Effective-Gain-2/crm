const pool = require('../db/queries');
const { generateConversationalReply } = require('./OpenAi');
const { sendTextMessage } = require('../requests/evolution');

const onlyDigits = (s) => (s ? String(s).replace(/\D/g, '') : '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DEFAULT_CONFIG = { status: 'disabled', max_messages: 10, wait_seconds: 0, reactivate_seconds: 0 };

// ---- Config POR NUMERO, com padrao da empresa como fallback ----
// connection_id preenchido = agente daquele numero; NULL = padrao da empresa.
// Numero sem agente proprio herda o padrao; se o padrao estiver 'disabled', aquele
// numero simplesmente nao tem robo — que e o cenario pedido pelo Luiz.
const getConfig = async (schema, connectionId = null) => {
    if (connectionId) {
        const doNumero = await pool.query(
            `SELECT * FROM ${schema}.ai_agent_config WHERE connection_id = $1 LIMIT 1`, [String(connectionId)]
        ).catch(() => ({ rows: [] }));
        if (doNumero.rows[0]) return doNumero.rows[0];
    }
    const padrao = await pool.query(
        `SELECT * FROM ${schema}.ai_agent_config WHERE connection_id IS NULL ORDER BY created_at ASC LIMIT 1`
    ).catch(() => ({ rows: [] }));
    if (padrao.rows[0]) return padrao.rows[0];
    // Base antiga: a linha unica existente vira o padrao da empresa
    const legado = await pool.query(`SELECT * FROM ${schema}.ai_agent_config ORDER BY created_at ASC LIMIT 1`);
    return legado.rows[0] || null;
};

// Lista todas as configuracoes (padrao + por numero) para a tela
const listConfigs = async (schema) => {
    const res = await pool.query(`SELECT * FROM ${schema}.ai_agent_config ORDER BY connection_id NULLS FIRST, created_at ASC`);
    return res.rows;
};

const CAMPOS_CONFIG = ['name', 'status', 'persona', 'business_name', 'knowledge_base', 'wait_seconds', 'max_messages', 'reactivate_seconds'];

// Salva a config de UM numero (connection_id) ou a PADRAO da empresa (connection_id nulo).
const upsertConfig = async (schema, fields) => {
    const connectionId = fields.connection_id && fields.connection_id !== 'padrao'
        ? String(fields.connection_id)
        : null;

    const busca = connectionId
        ? await pool.query(`SELECT * FROM ${schema}.ai_agent_config WHERE connection_id = $1 LIMIT 1`, [connectionId]).catch(() => ({ rows: [] }))
        : await pool.query(`SELECT * FROM ${schema}.ai_agent_config WHERE connection_id IS NULL ORDER BY created_at ASC LIMIT 1`).catch(() => ({ rows: [] }));

    let existing = busca.rows[0] || null;

    // Base antiga (linha unica criada antes do agente por numero): vira o padrao da empresa
    if (!existing && !connectionId) {
        const legado = await pool.query(`SELECT * FROM ${schema}.ai_agent_config ORDER BY created_at ASC LIMIT 1`);
        existing = legado.rows[0] || null;
    }

    if (!existing) {
        const cols = CAMPOS_CONFIG.filter((k) => fields[k] !== undefined);
        const vals = cols.map((k) => fields[k]);
        cols.push('connection_id');
        vals.push(connectionId);
        const placeholders = cols.map((_, i) => `$${i + 1}`);
        const res = await pool.query(
            `INSERT INTO ${schema}.ai_agent_config (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
            vals
        );
        return res.rows[0];
    }

    const sets = [];
    const vals = [];
    let i = 1;
    for (const k of CAMPOS_CONFIG) {
        if (fields[k] !== undefined) {
            sets.push(`${k} = $${i++}`);
            vals.push(fields[k]);
        }
    }
    if (sets.length === 0) return existing;
    vals.push(existing.id);
    const res = await pool.query(
        `UPDATE ${schema}.ai_agent_config SET ${sets.join(', ')}, updated_at = now() WHERE id = $${i} RETURNING *`,
        vals
    );
    return res.rows[0];
};

// ---- Sessão por conversa ----
const getSession = async (schema, contactNumber) => {
    const res = await pool.query(`SELECT * FROM ${schema}.ai_agent_sessions WHERE contact_number = $1`, [contactNumber]);
    return res.rows[0] || null;
};

const incrementSession = async (schema, contactNumber) => {
    await pool.query(
        `INSERT INTO ${schema}.ai_agent_sessions (contact_number, msg_count, updated_at)
         VALUES ($1, 1, now())
         ON CONFLICT (contact_number) DO UPDATE SET msg_count = ${schema}.ai_agent_sessions.msg_count + 1, updated_at = now()`,
        [contactNumber]
    );
};

// Handoff: hibernar o bot para este contato quando um humano assume.
const hibernateOnHumanSend = async (schema, number) => {
    const contactNumber = onlyDigits(number);
    if (!contactNumber) return;
    try {
        const config = (await getConfig(schema)) || DEFAULT_CONFIG;
        const seconds = Number(config.reactivate_seconds) > 0 ? Number(config.reactivate_seconds) : 3600; // default 1h
        await pool.query(
            `INSERT INTO ${schema}.ai_agent_sessions (contact_number, hibernate_until, updated_at)
             VALUES ($1, now() + ($2 || ' seconds')::interval, now())
             ON CONFLICT (contact_number) DO UPDATE SET hibernate_until = now() + ($2 || ' seconds')::interval, updated_at = now()`,
            [contactNumber, String(seconds)]
        );
    } catch (e) {
        console.error('AiAgent: erro ao hibernar:', e.message);
    }
};

const buildSystemPrompt = (config, docsText = '') => {
    const parts = [];
    parts.push(
        `Você é ${config.name || 'um assistente virtual'}${config.business_name ? ` da empresa ${config.business_name}` : ''}.`
    );
    if (config.persona) parts.push(config.persona);
    parts.push('Responda de forma cordial, objetiva e em português brasileiro, no tom de um atendimento por WhatsApp. Não invente informações que não estejam na base de conhecimento; quando não souber, ofereça encaminhar para um atendente humano.');
    const kb = [config.knowledge_base, docsText].filter(Boolean).join('\n\n');
    if (kb) parts.push(`\nBase de conhecimento:\n${kb}`);
    return parts.join('\n\n');
};

// ---- Documentos da base de conhecimento ----
const KB_MAX_CHARS = 12000;

const extractText = async (buffer, filename, mime) => {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const textLike = ['txt', 'md', 'markdown', 'csv', 'json', 'log', 'html', 'htm'];
    if (textLike.includes(ext) || (mime || '').startsWith('text/')) {
        let t = buffer.toString('utf8');
        if (ext === 'html' || ext === 'htm') t = t.replace(/<[^>]+>/g, ' ');
        return t;
    }
    if (ext === 'pdf' || mime === 'application/pdf') {
        try {
            const pdfParse = require('pdf-parse');
            const data = await pdfParse(buffer);
            return data.text || '';
        } catch (e) {
            console.error('AiAgent: falha ao extrair PDF:', e.message);
            return '';
        }
    }
    if (ext === 'docx') {
        try {
            const mammoth = require('mammoth');
            const res = await mammoth.extractRawText({ buffer });
            return res.value || '';
        } catch (e) {
            console.error('AiAgent: falha ao extrair DOCX (mammoth ausente?):', e.message);
            return '';
        }
    }
    return '';
};

const addDocument = async (schema, filename, mime, buffer) => {
    const content = (await extractText(buffer, filename, mime)) || '';
    const res = await pool.query(
        `INSERT INTO ${schema}.ai_agent_documents (filename, mime, content_text, char_count)
         VALUES ($1, $2, $3, $4) RETURNING id, filename, mime, char_count, created_at`,
        [filename, mime || null, content, content.length]
    );
    return res.rows[0];
};

const listDocuments = async (schema) => {
    const res = await pool.query(
        `SELECT id, filename, mime, char_count, created_at FROM ${schema}.ai_agent_documents ORDER BY created_at DESC`
    );
    return res.rows;
};

const deleteDocument = async (schema, id) => {
    await pool.query(`DELETE FROM ${schema}.ai_agent_documents WHERE id = $1`, [id]);
    return { id };
};

const getDocumentsText = async (schema) => {
    try {
        const res = await pool.query(
            `SELECT filename, content_text FROM ${schema}.ai_agent_documents WHERE content_text IS NOT NULL AND content_text <> '' ORDER BY created_at ASC`
        );
        let out = '';
        for (const row of res.rows) {
            if (out.length >= KB_MAX_CHARS) break;
            const chunk = `# ${row.filename}\n${row.content_text}`;
            out += (out ? '\n\n' : '') + chunk.slice(0, KB_MAX_CHARS - out.length);
        }
        return out;
    } catch (e) {
        return '';
    }
};

// Núcleo: decide e responde a uma mensagem recebida (piloto automático).
// Deve ser chamado apenas para mensagens do cliente (fromMe === false).
const handleIncoming = async (schema, chat, number, instanceName, userText) => {
    try {
        const contactNumber = onlyDigits(number);
        if (!contactNumber || !userText) return;

        // Config do NUMERO por onde a mensagem entrou (cai no padrao da empresa se nao houver)
        const config = await getConfig(schema, chat && chat.connection_id);
        if (!config || config.status !== 'autopilot') return;        // só responde em piloto automático
        if (chat && chat.isboton === false) return;                  // handoff manual (bot desligado no chat)

        const session = await getSession(schema, contactNumber);
        if (session?.hibernate_until && new Date(session.hibernate_until) > new Date()) return; // hibernando
        if (session && Number(session.msg_count) >= Number(config.max_messages || 10)) return;  // limite

        if (Number(config.wait_seconds) > 0) await sleep(Number(config.wait_seconds) * 1000);

        // Chave de API POR EMPRESA (controle de custo por cliente); fallback env; sem chave → não responde
        const { getOpenAiKey, logAiUsage } = require('./IntegrationService');
        const keyInfo = await getOpenAiKey(schema);
        if (!keyInfo) {
            console.warn(`AiAgent: empresa ${schema} sem chave OpenAI — agente inativo.`);
            return;
        }

        const docsText = await getDocumentsText(schema);
        const result = await generateConversationalReply(buildSystemPrompt(config, docsText), [], userText, keyInfo.key);
        if (!result?.text) return;

        await sendTextMessage(instanceName, result.text, contactNumber, null, 'agente_ia');
        await incrementSession(schema, contactNumber);
        // Medição de custo por empresa
        logAiUsage(schema, {
            model: result.model,
            prompt_tokens: result.usage?.prompt_tokens,
            completion_tokens: result.usage?.completion_tokens,
            contact_number: contactNumber,
        });
        // A resposta enviada volta pela Evolution (fromMe=true) e é persistida/emitida pelo /webhook/chat.
        console.log(`AiAgent: respondeu ${contactNumber} no schema ${schema}`);
    } catch (error) {
        console.error('AiAgent handleIncoming erro:', error.message);
    }
};

module.exports = {
    listConfigs,
    getConfig,
    upsertConfig,
    getSession,
    hibernateOnHumanSend,
    handleIncoming,
    buildSystemPrompt,
    addDocument,
    listDocuments,
    deleteDocument,
    getDocumentsText,
};
