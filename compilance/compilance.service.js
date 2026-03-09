const pool = require('../db/queries');

const { getDDDTimezone } = require('./ddd-timezone.map');



async function canCall(leadId, phone, tenantId) {

    const client = await pool.connect();

    await client.query(`SET search_path TO "${tenantId}", public`)

    try {
        const r = { allowed: false, reasons: [] };

        const cleaned = phone.replace(/\D/g, '');



        // 1. Consentimento 

        const c = await client.query(`SELECT id FROM lead_consents WHERE lead_id=$1 AND consent_type='ai_call' AND revoked_at IS NULL LIMIT 1`, [leadId]);
        
        if (!c.rows.length) { r.reasons.push('NO_CONSENT'); return r; }



        // 2. Lista DNC/NMP 

        const dnc = await client.query('SELECT 1 FROM dnc_list WHERE phone=$1 LIMIT 1', [cleaned]);

        if (dnc.rows.length) { r.reasons.push('DNC_BLOCKED'); return r; }



        // 3. Horário por DDD 

        const ddd = cleaned.length >= 4 ? cleaned.substring(2, 4) : '11';

        const tz = getDDDTimezone(ddd);

        const fmt = new Intl.DateTimeFormat('pt-BR', {
            hour: 'numeric', hour12: false,

            weekday: 'short', timeZone: tz
        });

        const parts = fmt.formatToParts(new Date());

        const hour = parseInt(parts.find(p => p.type === 'hour').value);

        const day = parts.find(p => p.type === 'weekday').value.toLowerCase();

        const isSun = day.startsWith('dom');

        const isSat = day.startsWith('s\u00e1b') || day.startsWith('sab');

        const ok = isSun ? false : isSat ? (hour >= 10 && hour < 16) : (hour >= 9 && hour < 21);

        if (!ok) { r.reasons.push('OUTSIDE_HOURS'); r.localHour = hour; r.tz = tz; return r; }



        // 4. Tentativas 24h 

        const att = await client.query(

            `SELECT COUNT(*) FROM voice_calls WHERE lead_id=$1 AND created_at > NOW()-INTERVAL '24 hours'`, [leadId]);

        if (parseInt(att.rows[0].count) >= parseInt(process.env.MAX_ATTEMPTS_PER_24H || '4')) {

            r.reasons.push('MAX_ATTEMPTS'); return r;

        }



        // 5. Cost cap 

        const cost = await client.query(

            `SELECT COALESCE(SUM(vc2.cost_total_brl),0) AS total FROM voice_calls vc1 

     JOIN voice_costs vc2 ON vc2.call_id=vc1.id 

     WHERE vc1.lead_id=$1 AND vc2.recorded_at>CURRENT_DATE`,

            [leadId,]);

        if (parseFloat(cost.rows[0].total) >= parseFloat(process.env.COST_CAP_PER_LEAD_BRL || '10')) {

            r.reasons.push('COST_CAP'); return r;

        }



        r.allowed = true;

        return r;

    } catch (error) {
        console.error('Error in canCall:', error);
        throw error;
    } finally {
        await client.release();
    }
}



module.exports = { canCall }