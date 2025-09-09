const { createLembrete, getLembretes, updateLembretes, deleteLembrete } = require("../services/LembreteService")
const { getPreferencesByUser } = require('../services/UserPreferencesService');
const { google } = require('googleapis');

const createLembreteController = async (req, res) => {
    const {lembrete_name, tag, message, date, icone, user_id, schema, filas} = req.body

    try {
        const result = await createLembrete(lembrete_name, tag, message, date, icone, user_id, schema, filas)
        res.status(201).json(result);

    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Erro ao criar lembrete' });
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
    createLembreteController,
    getLembretesController,
    updateLembretesController,
    deleteLembreteController
}