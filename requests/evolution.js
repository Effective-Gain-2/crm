require('dotenv').config();
const axios = require('axios'); 

const createInstance = async ({ instanceName, number }) => {
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
    groupsIgnore: true,
    webhook:{
      url:`${process.env.BACKEND_URL}/webhook/chat`,
      base64:true,
      byEvents:false,
      headers: {
      authorization: process.env.EVOLUTION_API_KEY,
      },
    // CONNECTION_UPDATE/QRCODE_UPDATED alimentam o status de conexão em tempo real
    events:['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED']
    },
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
  };
  try {
    const response = await fetch(`${process.env.EVOLUTION_SERVER_URL}/instance/fetchInstances?instanceName=${instanceName}`, options);
    const result = await response.json();
    
    return result;
  } catch (err) {
    console.error('Erro ao buscar instâncias:', err);
  }

}
const sendTextMessage = async(instanceId, text, number, replyToId)=>{
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
    body: JSON.stringify(payload)
  };
  try {
    const response = await fetch(`${process.env.EVOLUTION_SERVER_URL}/message/sendText/${instanceId}`, options);
    const result = await response.json();
    
    return result;
  } catch (err) {
    console.error('Erro ao enviar mensagem:', err);
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
const sendImageToWhatsApp = async (number, imageBase64, instanceId) => {
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

    return response.data;
  } catch (error) {
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
    body: JSON.stringify(requestBody) 
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
  connectInstance,
  getConnectionState,
  fetchInstanceEvo,
  sendTextMessage,
  searchContact,
  sendAudioToWhatsApp,
  getBase64FromMediaMessage,
  sendImageToWhatsApp,
  deleteInstance,
  sendMediaForBlast
};


