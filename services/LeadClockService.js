/*
 * Relogio do lead.
 *
 * Duas perguntas que a operacao precisa responder e o banco nao respondia:
 *   1. Ha quanto tempo este lead esta NESTA etapa?
 *   2. Quando foi a ultima TRATATIVA?
 *
 * updated_at nao serve: muda a cada edicao (corrigir telefone, mudar valor), entao
 * um lead abandonado ha 3 dias parecia "movimentado agora".
 *
 * Tratativa = mover de etapa OU o atendente ter enviado mensagem (from_me = true).
 * Mensagem RECEBIDA nao conta: o cliente responder nao significa que alguem cuidou
 * do lead — pelo contrario, e quando mais precisa de atencao.
 */
const pool = require('../db/queries');

const registrarEtapa = async (schema, tipo, refId, etapaId, movidoPor = null) => {
  if (!refId) return;
  try {
    // Nao duplica se a etapa nao mudou (drag-and-drop que volta pro mesmo lugar)
    const ultima = await pool.query(
      `SELECT etapa_id FROM ${schema}.etapa_historico
        WHERE tipo = $1 AND ref_id = $2 ORDER BY entrou_em DESC LIMIT 1`,
      [tipo, refId]
    );
    if (ultima.rows[0] && String(ultima.rows[0].etapa_id || '') === String(etapaId || '')) return;

    await pool.query(
      `INSERT INTO ${schema}.etapa_historico (tipo, ref_id, etapa_id, movido_por) VALUES ($1,$2,$3,$4)`,
      [tipo, refId, etapaId || null, movidoPor || null]
    );
  } catch (e) {
    console.error('registrarEtapa:', e.message);
  }
};

// Relogio de um conjunto de oportunidades, em UMA consulta (a tela lista centenas).
const relogioDasOportunidades = async (schema, ids) => {
  if (!Array.isArray(ids) || ids.length === 0) return {};
  try {
    const r = await pool.query(
      `SELECT o.id,
              h.entrou_em AS etapa_desde,
              GREATEST(
                COALESCE(h.entrou_em, o.created_at),
                COALESCE(msg.ultima_saida, o.created_at)
              ) AS ultima_tratativa
         FROM ${schema}.opportunities o
         LEFT JOIN LATERAL (
              SELECT entrou_em FROM ${schema}.etapa_historico eh
               WHERE eh.tipo = 'oportunidade' AND eh.ref_id = o.id
               ORDER BY entrou_em DESC LIMIT 1
         ) h ON true
         LEFT JOIN LATERAL (
              SELECT to_timestamp(MAX(m.created_at) / 1000) AS ultima_saida
                FROM ${schema}.chats c
                JOIN ${schema}.messages m ON m.chat_id = c.id AND m.from_me = true
               WHERE c.contact_phone = o.contact_number
         ) msg ON true
        WHERE o.id = ANY($1::uuid[])`,
      [ids]
    );
    const mapa = {};
    for (const linha of r.rows) {
      mapa[linha.id] = {
        etapa_desde: linha.etapa_desde,
        ultima_tratativa: linha.ultima_tratativa,
      };
    }
    return mapa;
  } catch (e) {
    console.error('relogioDasOportunidades:', e.message);
    return {};
  }
};

module.exports = { registrarEtapa, relogioDasOportunidades };
