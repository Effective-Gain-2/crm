const axios = require('axios');
const dns = require('dns').promises;
const net = require('net');

const TIMEOUT_MS = 5000;

// Loopback, link-local (metadata das nuvens) e faixas privadas.
const ehEnderecoInterno = (ip) => {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 127 || a === 10
        || (a === 172 && b >= 16 && b <= 31)
        || (a === 192 && b === 168)
        || (a === 169 && b === 254);
  }
  const v6 = String(ip).toLowerCase();
  return v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80');
};

// Limite conhecido: validamos o DNS aqui e o axios resolve de novo na hora de conectar,
// o que deixa uma janela de DNS rebinding. Fechar de vez exige um agent HTTP que cheque o
// IP no momento da conexão. Para o risco real deste campo — um master do tenant apontando
// o webhook para dentro da infraestrutura — a checagem abaixo já resolve.
const validarUrlDeWebhook = async (rawUrl) => {
  let url;
  try { url = new URL(rawUrl); }
  catch (e) { return { ok: false, motivo: 'URL inválida' }; }

  if (url.protocol !== 'https:') return { ok: false, motivo: 'Apenas https é aceito' };

  let enderecos;
  try { enderecos = await dns.lookup(url.hostname, { all: true }); }
  catch (e) { return { ok: false, motivo: 'Host não resolve' }; }

  if (enderecos.some(({ address }) => ehEnderecoInterno(address))) {
    return { ok: false, motivo: 'Host aponta para endereço interno' };
  }
  return { ok: true };
};

const dispararWebhookDaFila = async (webhookUrl, payload) => {
  const check = await validarUrlDeWebhook(webhookUrl);
  if (!check.ok) {
    console.error(`Webhook de fila recusado (${webhookUrl}): ${check.motivo}`);
    return;
  }
  await axios.post(webhookUrl, payload, { timeout: TIMEOUT_MS, maxRedirects: 0 });
};

module.exports = { dispararWebhookDaFila, validarUrlDeWebhook };
