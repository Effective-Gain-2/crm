const pool = require("../db/queries");
const { getContactByNumber } = require("../services/ContactService");

const startCallController = async (req, res) => {
  const { lead_id, phone, tenant_id, correlation_id, source_channel } = req.body;

  if (!lead_id || !phone || !tenant_id)

    return res.status(400).json({ error: 'lead_id, phone e tenant_id obrigatórios' });



  // Idempotency key: lead + janela de 1 minuto 

  const iKey = `call_${lead_id}_${Math.floor(Date.now() / 60000)}`;

  const dup = await pool.query('SELECT id,status FROM voice_calls WHERE idempotency_key=$1', [iKey]);

  if (dup.rows.length)

    return res.json({ call_id: dup.rows[0].id, status: dup.rows[0].status, idempotent: true });



  // Compliance 

  const comp = await canCall(lead_id, phone, tenant_id);

  if (!comp.allowed) {

    const st = 'blocked_' + comp.reasons[0].toLowerCase().replace('_', '-').substring(0, 20);

    const bl = await pool.query(

      `INSERT INTO voice_calls(tenant_id,lead_id,idempotency_key,status,phone_dialed, 

       compliance_checks,metadata_json) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,

      [tenant_id, lead_id, iKey, st, phone, JSON.stringify(comp), JSON.stringify({ correlation_id })]);

    return res.status(403).json({ call_id: bl.rows[0].id, allowed: false, reasons: comp.reasons });

  }



  const row = await pool.query(

    `INSERT INTO voice_calls(tenant_id,lead_id,idempotency_key,status,phone_dialed, 

     compliance_checks,metadata_json,started_at) 

     VALUES($1,$2,$3,'initiated',$4,$5,$6,NOW()) RETURNING id`,

    [tenant_id, lead_id, iKey, phone,

      JSON.stringify({ consent: true, hours: true, dnc: true, attempts: true }),

      JSON.stringify({ correlation_id, source_channel })]);



  return res.status(201).json({ call_id: row.rows[0].id, status: 'initiated', allowed: true });
}

const getLeadsController = async (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: 'phone é obrigatório' });
  const leads = await getContactByNumber(phone, req.schema);
  return res.status(200).json({ leads });
}

const updateCallStatus = async (call_id, status, schema) => {
  try {
    await pool.query(
      `UPDATE ${schema}.voice_calls SET status = $1 WHERE vapi_call_id = $2`,
      [status, call_id]
    );
  } catch (error) {
    console.error('Erro ao atualizar status da chamada:', error);
  }
}


const createCall = async (data) => {
  let status
  switch (data.status) {
    case 'queued':
    case 'started':
      status = 'ringing'
      break;

    case 'ended':
    case 'stopped':
      status = 'completed'
      break;

    case 'in-progress':
      status = 'in_progress'
      break;

    default:
      return null
  }
  console.log('Criando/atualizando chamada com status:', status)

  console.log(data)

  const call = await pool.query(`INSERT INTO ${data.schema}.voice_calls(tenant_id, lead_id, vapi_call_id, idempotency_key, status, attempt_number, phone_dialed, cost_estimated_brl, metadata_json, started_at, completed_at, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (vapi_call_id)
        DO UPDATE SET 
          status = EXCLUDED.status,
          started_at = COALESCE(voice_calls.started_at, EXCLUDED.started_at),
          completed_at = EXCLUDED.completed_at,
          updated_at = NOW() RETURNING *` , [data.schema, data.lead_id, data.vapi_call_id, data.idempotency_key, status, data.attempt_number, data.phone_dialed, data.cost_estimated_brl, data.metadata_json, data.started_at, data.completed_at || null, data.created_at])
          return call.rows[0]
}

module.exports = { startCallController, getLeadsController, updateCallStatus, createCall }