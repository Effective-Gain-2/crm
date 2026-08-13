const { createLembrete, getLembretes, updateLembretes, deleteLembrete, setLembreteStatus, snoozeLembrete, getLembretesByContact, getLembretesByOpportunity } = require("../services/LembreteService")
const { getPreferencesByUser } = require('../services/UserPreferencesService');
const { google } = require('googleapis');

const createLembreteController = async (req, res) => {
    const {lembrete_name, tag, message, date, icone, filas, contact_number, chat_id, opportunity_id, recurrence} = req.body
    const schema = req.auth.schema;
    // Alvo do lembrete: operacional só cria para si; líder para a equipe; master/técnico livre
    let user_id = req.body.user_id || req.auth.local_user_id;
    try {
        if (user_id !== req.auth.local_user_id) {
            if (req.auth.role === 'operacional') {
                user_id = req.auth.local_user_id;
            } else if (req.auth.role === 'lider') {
                const { getTeamUserIds } = require('../services/QueueService');
                const team = await getTeamUserIds(req.auth.local_user_id, schema);
                if (!team.includes(user_id)) user_id = req.auth.local_user_id;
            }
        }
        const result = await createLembrete(lembrete_name, tag, message, date, icone, user_id, schema, filas, null,
            { contact_number, chat_id, opportunity_id, recurrence })
        res.status(201).json(result);

    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Erro ao criar lembrete' });
    }
}

const setLembreteStatusController = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        if (!['done', 'pending'].includes(status)) return res.status(400).json({ error: 'status inválido' });
        const result = await setLembreteStatus(id, status, req.auth.schema);
        res.status(200).json(result);
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Erro ao atualizar status do lembrete' });
    }
}

const snoozeLembreteController = async (req, res) => {
    const { id } = req.params;
    const { minutes } = req.body;
    try {
        const result = await snoozeLembrete(id, minutes, req.auth.schema);
        res.status(200).json(result);
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Erro ao adiar lembrete' });
    }
}

const getLembretesByContactController = async (req, res) => {
    try {
        const result = await getLembretesByContact(req.params.number, req.auth.schema);
        res.status(200).json(result);
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Erro ao buscar lembretes do contato' });
    }
}

const getLembretesByOpportunityController = async (req, res) => {
    try {
        const result = await getLembretesByOpportunity(req.params.id, req.auth.schema);
        res.status(200).json(result);
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Erro ao buscar lembretes da oportunidade' });
    }
}

const getLembretesController = async (req, res) => {
    const {schema} = req.params
    try {
        const result = await getLembretes(schema)
        res.status(200).json(result);
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Erro ao buscar lembretes' });
    }
}

const updateLembretesController = async (req, res) => {
    const {id, lembrete_name, tag, message, date, icone, schema, filas} = req.body
    try {
        const result = await updateLembretes(id, lembrete_name, tag, message, date, icone, schema, filas)
        res.status(200).json(result);
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Erro ao atualizar lembrete' });
    }
}

const deleteLembreteController = async (req, res) => {
    const {id, schema, user_id} = req.body;
    try {
        // Buscar o lembrete antes de deletar para pegar o google_event_id
        const lembreteResult = await require('../db/queries').query(`SELECT * FROM ${schema}.lembretes WHERE id = $1`, [id]);
        const lembrete = lembreteResult.rows[0];
        if (lembrete && lembrete.google_event_id) {
            // Buscar tokens do Google do usuário
            const prefs = await getPreferencesByUser(lembrete.user_id || user_id, schema);
            if (prefs && prefs.google_tokens) {
                const tokens = JSON.parse(prefs.google_tokens);
                const oauth2Client = new google.auth.OAuth2(
                  process.env.GOOGLE_CLIENT_ID,
                  process.env.GOOGLE_CLIENT_SECRET,
                  'http://localhost:3002/calendar/callback'
                );
                oauth2Client.setCredentials(tokens);
                const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
                try {
                    await calendar.events.delete({
                        calendarId: 'primary',
                        eventId: lembrete.google_event_id
                    });
                } catch (err) {
                    console.error('Erro ao deletar evento do Google Calendar:', err.message);
                }
            }
        }
        const result = await deleteLembrete(id, schema);
        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao deletar lembrete' });
    }
}

module.exports = {
    setLembreteStatusController,
    snoozeLembreteController,
    getLembretesByContactController,
    getLembretesByOpportunityController,
    createLembreteController,
    getLembretesController,
    updateLembretesController,
    deleteLembreteController
}