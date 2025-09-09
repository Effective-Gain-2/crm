require('dotenv').config();
const axios = require('axios'); 

const createInstance = async ({ instanceName, number }) => {
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
    events:['MESSAGES_UPSERT']
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

  try {
    const response = await fetch(`${process.env.EVOLUTION_SERVER_URL}/instance/create`, options);
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Erro ao criar instância:', err);
  }
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
const sendTextMessage = async(instanceId, text, number)=>{
  const payload = {
    text,
    number
  };
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
const deleteInstance=async (instanceName) => {
  try {
    const result = await axios.delete(`${process.env.EVOLUTION_SERVER_URL}/instance/delete/${instanceName}`,
      {
        headers:{
          apikey: process.env.EVOLUTION_API_KEY
        }
      }
    )
    return result
  } catch (error) {
    // console.error(error)
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
  fetchInstanceEvo,
  sendTextMessage,
  searchContact,
  sendAudioToWhatsApp,
  getBase64FromMediaMessage,
  sendImageToWhatsApp,
  deleteInstance,
  sendMediaForBlast
};


