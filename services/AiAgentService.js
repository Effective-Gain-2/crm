const pool = require('../db/queries');
const { generateConversationalReply } = require('./OpenAi');
const { sendTextMessage } = require('../requests/evolution');

const onlyDigits = (s) => (s ? String(s).replace(/\D/g, '') : '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DEFAULT_CONFIG = { status: 'disabled', max_messages: 10, wait_seconds: 0, reactivate_seconds: 0 };

// ---- Config (1 linha "principal" por tenant) ----
const getConfig = async (schema) => {
    const res = await pool.query(`SELECT * FROM ${schema}.ai_agent_config ORDER BY created_at ASC LIMIT 1`);
    return res.rows[0] || null;
};

const upsertConfig = async (schema, fields) => {
    const existing = await getConfig(schema);
    const allowed = ['name', 'status', 'persona', 'business_name', 'knowledge_base', 'wait_seconds', 'max_messages', 'reactivate_seconds'];
    if (!existing) {
        const cols = allowed.filter((k) => fields[k] !== undefined);
        const vals = cols.map((k) => fields[k]);
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
    for (const k of allowed) {
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

const buildSystemPrompt = (config) => {
    const parts = [];
    parts.push(
        `Você é ${config.name || 'um assistente virtual'}${config.business_name ? ` da empresa ${config.business_name}` : ''}.`
    );
    if (config.persona) parts.push(config.persona);
    parts.push('Responda de forma cordial, objetiva e em português brasileiro, no tom de um atendimento por WhatsApp. Não invente informações que não estejam na base de conhecimento; quando não souber, ofereça encaminhar para um atendente humano.');
    if (config.knowledge_base) parts.push(`\nBase de conhecimento:\n${config.knowledge_base}`);
    return parts.join('\n\n');
};

// Núcleo: decide e responde a uma mensagem recebida (piloto automático).
// Deve ser chamado apenas para mensagens do cliente (fromMe === false).
const handleIncoming = async (schema, chat, number, instanceName, userText) => {
    try {
        const contactNumber = onlyDigits(number);
        if (!contactNumber || !userText) return;

        const config = await getConfig(schema);
        if (!config || config.status !== 'autopilot') return;        // só responde em piloto automático
        if (chat && chat.isboton === false) return;                  // handoff manual (bot desligado no chat)

        const session = await getSession(schema, contactNumber);
        if (session?.hibernate_until && new Date(session.hibernate_until) > new Date()) return; // hibernando
        if (session && Number(session.msg_count) >= Number(config.max_messages || 10)) return;  // limite

        if (Number(config.wait_seconds) > 0) await sleep(Number(config.wait_seconds) * 1000);

        const reply = await generateConversationalReply(buildSystemPrompt(config), [], userText);
        if (!reply) return;

        await sendTextMessage(instanceName, reply, contactNumber);
        await incrementSession(schema, contactNumber);
        // A resposta enviada volta pela Evolution (fromMe=true) e é persistida/emitida pelo /webhook/chat.
        console.log(`AiAgent: respondeu ${contactNumber} no schema ${schema}`);
    } catch (error) {
        console.error('AiAgent handleIncoming erro:', error.message);
    }
};

module.exports = {
    getConfig,
    upsertConfig,
    getSession,
    hibernateOnHumanSend,
    handleIncoming,
    buildSystemPrompt,
};
