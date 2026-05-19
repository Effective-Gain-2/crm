const createRedisConnection = require('../config/Redis');

// Quem envia uma mensagem outbound chama tag(msgId, source). O Evolution
// devolve essa mesma mensagem via webhook /chat com fromMe=true; la o
// handler chama consume(msgId) e descobre QUEM ORIGINOU. Se nao houver
// tag, assumimos que o atendente digitou direto no WhatsApp do celular.
//
// Sources canonicas:
//   - 'bot'             gerada pelo worker GPT (services/Webhook.js worker)
//   - 'crm_web'         enviada pela interface web (CRM)
//   - 'crm_api'         enviada via API oficial do WhatsApp (api_ofc)
//   - 'whatsapp_direct' enviada pelo proprio celular (default quando sem tag)
//   - 'client'          mensagem recebida do cliente (fromMe=false)

let redis = null;
const getRedis = () => {
  if (!redis) redis = createRedisConnection();
  return redis;
};

const KEY = (id) => `msrc:${id}`;
const TTL_SEC = 600; // 10 min e suficiente — webhook chega em segundos

const tag = async (msgId, source) => {
  if (!msgId || !source) return;
  try {
    await getRedis().set(KEY(msgId), String(source), 'EX', TTL_SEC);
  } catch (err) {
    console.error('MessageSourceTracker.tag falhou:', err.message);
  }
};

// Le e remove (read+delete) — auto-limpa o Redis. Retorna null se nao
// houver tag (significa que a mensagem nao foi originada por nos).
const consume = async (msgId) => {
  if (!msgId) return null;
  try {
    const r = getRedis();
    const v = await r.get(KEY(msgId));
    if (v) await r.del(KEY(msgId));
    return v || null;
  } catch (err) {
    console.error('MessageSourceTracker.consume falhou:', err.message);
    return null;
  }
};

module.exports = { tag, consume };
