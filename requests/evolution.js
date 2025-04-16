require('dotenv').config();

const createInstance = async ({ instanceName, number }) => {
  const payload = {
    instanceName,
    number,
    integration: "WHATSAPP-BAILEYS",
    qrcode: true
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
    console.log('Instância criada:', result);
    return result;
  } catch (err) {
    console.error('Erro ao criar instância:', err);
  }
};
const fetchInstanceEvo = async(instanceName)=>{
  console.log(instanceName)
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
    console.log(result)
    
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
    console.log(result)
    
    return result;
  } catch (err) {
    console.error('Erro ao enviar mensagem:', err);
  }
}



module.exports = { createInstance, fetchInstanceEvo, sendTextMessage};
