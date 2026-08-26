require('dotenv').config();
const axios = require('axios');
// Guarda de compliance: teto diario por numero, warm-up, texto repetido, lista fria
// e ban monitor. Fica AQUI porque estas 4 funcoes sao o unico caminho de saida de
// mensagem do CRM (atendente, agente de IA e disparo passam todos por elas).
const compliance = require('../services/ComplianceService');

// fetch sem timeout congelou a fila de disparos em producao: o worker processa um
// job por vez, e UMA chamada a Evolution que nunca responde trava a fila inteira —
// tudo fica "pendente" para sempre, sem falha e sem log. Cancelar nao remove job
// ativo e o redeploy retenta o mesmo job travado. Todo envio ganha prazo maximo.
const TIMEOUT_ENVIO_MS = 30_000;
const sinalTimeout = (ms = TIMEOUT_ENVIO_MS) =>
  (typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined);

// Eventos assinados no webhook — fonte ÚNICA (usada na criação e no re-registro).
// MESSAGES_UPDATE + CHATS_UPDATE = leitura feita NO CELULAR chega ao CRM; sem eles a
// conversa lida no telefone ficava "não lida" para sempre no painel.
const WEBHOOK_EVENTS = [
  'MESSAGES_UPSERT',
  'MESSAGES_UPDATE',
  'CHATS_UPDATE',
  'CONNECTION_UPDATE',
  'QRCODE_UPDATED',
  'CONTACTS_UPSERT',
  'CONTACTS_SET',
  'CONTACTS_UPDATE',
];

const buildWebhookConfig = () => ({
  url: `${process.env.BACKEND_URL}/webhook/chat`,
  base64: true,
  byEvents: false,
  headers: {
    authorization: process.env.EVOLUTION_API_KEY,
  },
  events: WEBHOOK_EVENTS,
});

// Re-registra o webhook de uma instância JÁ EXISTENTE (POST /webhook/set/{instance}).
// A lista de eventos só é aplicada na CRIAÇÃO da instância — sem este passo, as
// instâncias já escaneadas nunca passariam a receber os eventos novos.
// Idempotente: pode rodar no boot e a cada reconexão.
const setInstanceWebhook = async (instanceName) => {
  if (!instanceName) return null;
  if (!process.env.BACKEND_URL || !process.env.EVOLUTION_SERVER_URL || !process.env.EVOLUTION_API_KEY) {
    console.warn(`Webhook não re-registrado (${instanceName}): BACKEND_URL/EVOLUTION_* ausentes`);
    return null;
  }

  const cfg = { enabled: true, ...buildWebhookConfig() };
  const enviar = (body) => fetch(
    `${process.env.EVOLUTION_SERVER_URL}/webhook/set/${encodeURIComponent(instanceName)}`,
    {
      method: 'POST',
      headers: { apikey: process.env.EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  // v2.2+ espera { webhook: {...} }; v2.0 aceitava o payload plano. Tenta os dois.
  let response = await enviar({ webhook: cfg });
  if (!response.ok) response = await enviar(cfg);

  if (!response.ok) {
    const erro = await response.text().catch(() => '');
    throw new Error(`Evolution respondeu ${response.status} ao setar webhook de ${instanceName}: ${erro.slice(0, 200)}`);
  }
  return response.json().catch(() => ({}));
};

const createInstance = async ({ instanceName, number, groupsIgnore = false }) => {
  // Guard: sem BACKEND_URL o webhook seria registrado como "undefined/webhook/chat" —
  // a instância nasceria surda (nenhuma mensagem chega) de forma silenciosa e irreversível.
  if (!process.env.BACKEND_URL) {
    throw new Error('BACKEND_URL não configurado — configure antes de criar conexões WhatsApp');
  }
  if (!process.env.EVOLUTION_SERVER_URL || !process.env.EVOLUTION_API_KEY) {
    throw new Error('EVOLUTION_SERVER_URL/EVOLUTION_API_KEY não configurados');
  }

  const payload = {
    instanceName,
    number,
    integration: "WHATSAPP-BAILEYS",
    qrcode: true,
    // false = conversas de GRUPO também chegam ao CRM (antes ficava fixo em true e
    // os grupos simplesmente não apareciam, sem nenhum aviso)
    groupsIgnore: !!groupsIgnore,
    // CONNECTION_UPDATE/QRCODE_UPDATED = status em tempo real; CONTACTS_* = agenda (nomes);
    // MESSAGES_UPDATE/CHATS_UPDATE = leitura no celular reflete no CRM (ver WEBHOOK_EVENTS)
    webhook: buildWebhookConfig(),
  };

  const options = {
    method: 'POST',
    headers: {
      apikey: process.env.EVOLUTION_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  };

  const response = await fetch(`${process.env.EVOLUTION_SERVER_URL}/instance/create`, options);
  const result = await response.json();
  if (!response.ok || !result?.instance?.instanceId) {
    // Propaga a causa real (instância duplicada, apikey inválida, v1 etc.)
    const msg = result?.response?.message || result?.message || result?.error || `Evolution respondeu ${response.status}`;
    throw new Error(Array.isArray(msg) ? msg.join('; ') : String(msg));
  }
  return result;
};

// QR novo / reconexão de uma instância existente (GET /instance/connect)
const connectInstance = async (instanceName) => {
  const response = await fetch(`${process.env.EVOLUTION_SERVER_URL}/instance/connect/${encodeURIComponent(instanceName)}`, {
    method: 'GET',
    headers: { apikey: process.env.EVOLUTION_API_KEY },
  });
  const result = await response.json();
  if (!response.ok) {
    const msg = result?.response?.message || result?.message || `Evolution respondeu ${response.status}`;
    throw new Error(Array.isArray(msg) ? msg.join('; ') : String(msg));
  }
  return result; // { base64, code, ... } ou estado da conexão
};

// Estado atual da conexão (GET /instance/connectionState)
const getConnectionState = async (instanceName) => {
  const response = await fetch(`${process.env.EVOLUTION_SERVER_URL}/instance/connectionState/${encodeURIComponent(instanceName)}`, {
    method: 'GET',
    headers: { apikey: process.env.EVOLUTION_API_KEY },
  });
  const result = await response.json();
  return result?.instance?.state || result?.state || 'unknown';
};
const fetchInstanceEvo = async(instanceName)=>{
  const options = {
    method: 'GET',
    headers: {
      apikey: process.env.EVOLUTION_API_KEY,
      'Content-Type': 'application/json'
    },
    signal: sinalTimeout(),
  };
  try {
    const response = await fetch(`${process.env.EVOLUTION_SERVER_URL}/instance/fetchInstances?instanceName=${instanceName}`, options);
    const result = await response.json();
    
    return result;
  } catch (err) {
    console.error('Erro ao buscar instâncias:', err);
  }

}
const sendTextMessage = async(instanceId, text, number, replyToId, origem)=>{
  const guarda = await compliance.podeEnviar({
    instancia: instanceId, numero: number, texto: text, origem: origem || 'atendente', tipo: 'texto',
  });
  if (!guarda.ok) {
    console.warn(`[COMPLIANCE] envio bloqueado para ${number}: ${guarda.motivo}`);
    return { blocked: true, motivo: guarda.motivo };
  }
  const payload = {
    text,
    number
  };
  // Citação (Evolution v2): responde a uma mensagem específica
  if (replyToId) {
    payload.quoted = { key: { id: replyToId } };
  }
  const options = {
    method: 'POST',
    headers: {
      apikey: process.env.EVOLUTION_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    signal: sinalTimeout(),
  };
  try {
    const response = await fetch(`${process.env.EVOLUTION_SERVER_URL}/message/sendText/${instanceId}`, options);
    const result = await response.json();
    if (response.ok) {
      await compliance.registrarEnviado(guarda.ctx, { numero: number, tipo: 'texto', origem: origem || 'atendente', hash: guarda.hash });
    } else {
      await compliance.avaliarResposta(guarda.ctx, Object.assign({ status: response.status }, result || {}));
    }
    return result;
  } catch (err) {
    console.error('Erro ao enviar mensagem:', err);
    await compliance.avaliarResposta(guarda.ctx, String(err && err.message));
  }
}
const getBase64FromMediaMessage = async (instanceId, mediaKey) => {
  try {
    if (!process.env.EVOLUTION_SERVER_URL) {
      throw new Error('EVOLUTION_SERVER_URL não está configurado no arquivo .env');
    }

    if (!instanceId || !mediaKey) {
      throw new Error('instanceId ou mediaKey não foram fornecidos ou estão inválidos');
    }

    const url = `${process.env.EVOLUTION_SERVER_URL}/chat/getBase64FromMediaMessage/${instanceId}`;

    const response = await axios.post(
      url,
      { message:{key:{id:mediaKey}}}, 
      {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Erro ao decodificar mídia:', error.message);
    throw error;
  }
};
const searchContact = async (remoteJid, instanceId) => {
  const payload = {
    where: {
      remoteJid,
    },
    instanceId,
  };

  const options = {
    method: 'POST',
    headers: {
      apikey: process.env.EVOLUTION_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  };

  try {
    const response = await fetch(`${process.env.EVOLUTION_SERVER_URL}/chat/findContacts/${instanceId}`, options);
    const result = await response.json();

    return result;
  } catch (err) {
    console.error('Erro ao buscar contato:', err);
  }
};
// Nome (subject) de um grupo — usado para batizar o chat do grupo corretamente
const getGroupSubject = async (instanceName, groupJid) => {
  try {
    const response = await fetch(
      `${process.env.EVOLUTION_SERVER_URL}/group/findGroupInfos/${encodeURIComponent(instanceName)}?groupJid=${encodeURIComponent(groupJid)}`,
      { headers: { apikey: process.env.EVOLUTION_API_KEY } }
    );
    if (!response.ok) return null;
    const result = await response.json();
    return result?.subject || result?.group?.subject || null;
  } catch (err) {
    console.error('Erro ao buscar nome do grupo:', err.message);
    return null;
  }
};

// Nome do perfil (inclui verifiedName de contas business — ex.: 0800 de empresas,
// que não têm pushName nem entrada na agenda)
const fetchProfileName = async (instanceName, number) => {
  try {
    const response = await fetch(
      `${process.env.EVOLUTION_SERVER_URL}/chat/fetchProfile/${encodeURIComponent(instanceName)}`,
      {
        method: 'POST',
        headers: { apikey: process.env.EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ number }),
      }
    );
    if (!response.ok) return null;
    const result = await response.json();
    return result?.name || result?.verifiedName || result?.pushName || null;
  } catch (err) {
    return null;
  }
};

// Lista completa de contatos da instância (sync da agenda ao conectar)
// Lista os chats da instância (POST /chat/findChats). Além de remoteJid/pushName/unreadCount,
// o lastMessage.key traz o par que resolve o LID: previousRemoteJid (@lid) ↔ senderPn (telefone).
// É a única forma de aprender o par SEM esperar o contato mandar uma mensagem nova.
const listAllChats = async (instanceName) => {
  try {
    const response = await fetch(
      `${process.env.EVOLUTION_SERVER_URL}/chat/findChats/${encodeURIComponent(instanceName)}`,
      {
        method: 'POST',
        headers: { apikey: process.env.EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }
    );
    if (!response.ok) return [];
    const result = await response.json();
    return Array.isArray(result) ? result : (result?.chats || []);
  } catch (err) {
    console.error('Erro ao listar chats da instância:', err.message);
    return [];
  }
};

// Mensagens de UMA conversa (POST /chat/findMessages). Usado para garimpar o pushName
// de quem escreveu no passado mas não está no contact store — nome que veio do WhatsApp,
// não da agenda do cliente (que o CRM não vai ter).
const findMessagesOfChat = async (instanceName, remoteJid) => {
  try {
    const response = await fetch(
      `${process.env.EVOLUTION_SERVER_URL}/chat/findMessages/${encodeURIComponent(instanceName)}`,
      {
        method: 'POST',
        headers: { apikey: process.env.EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ where: { key: { remoteJid } } }),
      }
    );
    if (!response.ok) return [];
    const d = await response.json();
    if (Array.isArray(d)) return d;
    return d?.messages?.records || d?.messages || [];
  } catch (err) {
    return [];
  }
};

// Última tentativa de nome: POST /chat/whatsappNumbers. No Baileys esta consulta
// devolve o verifiedName de contas COMERCIAIS (o nome público do negócio).
// Para pessoa física não existe consulta de nome por número — o WhatsApp não expõe
// isso a ninguém (seria um prato cheio para scraping); o nome de pessoa só chega
// como pushName junto das mensagens que ela envia.
const lookupWhatsappNumberName = async (instanceName, numero) => {
  try {
    const response = await fetch(
      `${process.env.EVOLUTION_SERVER_URL}/chat/whatsappNumbers/${encodeURIComponent(instanceName)}`,
      {
        method: 'POST',
        headers: { apikey: process.env.EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ numbers: [String(numero)] }),
      }
    );
    if (!response.ok) return null;
    const d = await response.json();
    const item = Array.isArray(d) ? d[0] : (d?.numbers?.[0] || d || null);
    return item?.verifiedName || item?.name || item?.pushName || null;
  } catch (err) {
    return null;
  }
};

const listAllContacts = async (instanceName) => {
  try {
    const response = await fetch(
      `${process.env.EVOLUTION_SERVER_URL}/chat/findContacts/${encodeURIComponent(instanceName)}`,
      {
        method: 'POST',
        headers: { apikey: process.env.EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }
    );
    if (!response.ok) return [];
    const result = await response.json();
    return Array.isArray(result) ? result : (result?.contacts || []);
  } catch (err) {
    console.error('Erro ao listar contatos da instância:', err.message);
    return [];
  }
};

const sendImageToWhatsApp = async (number, imageBase64, instanceId) => {
  const guarda = await compliance.podeEnviar({ instancia: instanceId, numero: number, origem: 'atendente', tipo: 'imagem' });
  if (!guarda.ok) {
    console.warn(`[COMPLIANCE] imagem bloqueada para ${number}: ${guarda.motivo}`);
    return { blocked: true, motivo: guarda.motivo };
  }
  try {
    if (!process.env.EVOLUTION_SERVER_URL) {
      throw new Error('EVOLUTION_SERVER_URL não está configurado no arquivo .env');
    }

    if (!instanceId) {
      throw new Error('instanceId não foi fornecido ou está inválido');
    }

    if (!/^\d+$/.test(number)) {
      throw new Error('O número fornecido não está no formato correto');
    }

    const url = `${process.env.EVOLUTION_SERVER_URL}/message/sendMedia/${instanceId}`;

    const response = await axios.post(url, {
      number: number,
      mediatype: 'image',
      media: imageBase64
    }, {
      headers: {
        apikey: process.env.EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    await compliance.registrarEnviado(guarda.ctx, { numero: number, tipo: 'imagem', origem: 'atendente' });
    return response.data;
  } catch (error) {
    await compliance.avaliarResposta(guarda.ctx, (error.response && Object.assign({ status: error.response.status }, error.response.data)) || String(error.message));
    if (error.response) {
      console.error('Erro ao enviar imagem para o WhatsApp:', error.response.data);
      console.error('Detalhes do erro:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Erro ao enviar imagem para o WhatsApp:', error.message);
    }
    throw error;
  }
};

const sendAudioToWhatsApp = async (number, audioBase64, instanceId) => {
  const guarda = await compliance.podeEnviar({ instancia: instanceId, numero: number, origem: 'atendente', tipo: 'audio' });
  if (!guarda.ok) {
    console.warn(`[COMPLIANCE] audio bloqueado para ${number}: ${guarda.motivo}`);
    return { blocked: true, motivo: guarda.motivo };
  }
  try {
    if (!process.env.EVOLUTION_SERVER_URL) {
      throw new Error('EVOLUTION_SERVER_URL não está configurado no arquivo .env');
    }

    if (!instanceId) {
      throw new Error('instanceId não foi fornecido ou está inválido');
    }

    const url = `${process.env.EVOLUTION_SERVER_URL}/message/sendWhatsAppAudio/${instanceId}`;

    const response = await axios.post(url, {
      number: number,
      audio: audioBase64,
    }, {
      headers: {
        apikey: process.env.EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Erro ao enviar áudio para o WhatsApp:', error.message);
    throw error;
  }
};
const deleteInstance = async (instanceName) => {
  try {
    const result = await axios.delete(`${process.env.EVOLUTION_SERVER_URL}/instance/delete/${instanceName}`,
      { headers: { apikey: process.env.EVOLUTION_API_KEY } }
    );
    return { ok: true, result };
  } catch (error) {
    // Não engolir: se a Evolution mantiver a instância viva, o webhook continua chegando
    console.error(`Erro ao deletar instância ${instanceName} na Evolution:`, error.response?.data || error.message);
    return { ok: false, error: error.response?.data || error.message };
  }
}

const sendMediaForBlast = async (instanceId, text, image, number) => {
  const guarda = await compliance.podeEnviar({ instancia: instanceId, numero: number, texto: text, origem: 'disparo', tipo: 'midia' });
  if (!guarda.ok) {
    console.warn(`[COMPLIANCE] disparo com midia bloqueado para ${number}: ${guarda.motivo}`);
    return { blocked: true, motivo: guarda.motivo };
  }

  const requestBody = { 
    number: number,
    mediatype: 'image',
    caption: text,
    media: image 
  };


  const options = {
    method: 'POST',
    headers: {
      apikey: process.env.EVOLUTION_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal: sinalTimeout(),
  };

  try {
    const response = await fetch(`${process.env.EVOLUTION_SERVER_URL}/message/sendMedia/${instanceId}`, options)
    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
  }
};


module.exports = {
  createInstance,
  setInstanceWebhook,
  WEBHOOK_EVENTS,
  connectInstance,
  getConnectionState,
  fetchInstanceEvo,
  sendTextMessage,
  searchContact,
  getGroupSubject,
  listAllContacts,
  listAllChats,
  findMessagesOfChat,
  lookupWhatsappNumberName,
  fetchProfileName,
  sendAudioToWhatsApp,
  getBase64FromMediaMessage,
  sendImageToWhatsApp,
  deleteInstance,
  sendMediaForBlast
};


