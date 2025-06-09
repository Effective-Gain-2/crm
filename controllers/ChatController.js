
const { setUserChat, getChats, getMessages, getChatData, getChatByUser, updateQueue, getChatById, saveMediaMessage, setMessageAsRead, closeChat, setSpecificUser } = require('../services/ChatService');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const pool = require('../db/queries');
const axios = require('axios'); 
const { getBase64FromMediaMessage, sendImageToWhatsApp } = require('../requests/evolution');
const { sendAudioToWhatsApp } = require('../requests/evolution');
const { searchConnById } = require('../services/ConnectionService');
const { getCurrentTimestamp } = require('../services/getCurrentTimestamp');


const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const audioFolder = path.join(__dirname, '..', 'uploads', 'audios');
    if (!fs.existsSync(audioFolder)) {
      fs.mkdirSync(audioFolder, { recursive: true });
    }
    cb(null, audioFolder);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadFolder = path.join(__dirname, '..', 'uploads', 'images');
    if (!fs.existsSync(uploadFolder)) {
      fs.mkdirSync(uploadFolder, { recursive: true });
    }
    cb(null, uploadFolder);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const uploadAudio = multer({ storage: audioStorage });
const uploadImage = multer({ storage: imageStorage });

const sendImageController = async (req, res) => {
  const { chatId, connectionId, schema } = req.body;
  const imageFile = req.file;
  
  if (!imageFile) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }
  
  const imagePath = path.join(__dirname, '..', 'uploads', 'images', imageFile.filename);

  try {
    
    if (!fs.existsSync(imagePath)) {
      throw new Error('O arquivo de imagem não foi salvo corretamente.');
    }

    const stats = fs.statSync(imagePath);
    
    if (stats.size === 0) {
      throw new Error('O arquivo de imagem está vazio.');
    }
    
    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString('base64');
    
    if (imageBase64.length === 0) {
      throw new Error('Falha ao converter a imagem para base64.');
    }
    
    const chat_id = await getChatById(chatId, connectionId, schema);
    
    if (!chat_id || !chat_id.contact_name) {
      throw new Error('O chat_id ou contact_phone não foi encontrado.');
    }
    
    const instanceId = await searchConnById(connectionId, schema);

    console.log('-------- chat ---------')
    console.log(chat_id)
    
    const evolutionResponse = await sendImageToWhatsApp(chat_id.contact_phone, imageBase64, instanceId.name);
    
    await saveMediaMessage(evolutionResponse.key.id, 'true', chatId, getCurrentTimestamp(), 'image', imageBase64, schema);
    
    res.status(200).json({ success: true, message: 'Imagem processada e enviada com sucesso', evolutionResponse });
  } catch (error) {
    console.error('Erro ao processar imagem:', error.message);
    res.status(500).json({ error: 'Erro ao processar imagem' });
  } finally {
    setTimeout(() => {
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }, 500);
  }
};

const setUserChatController = async (req, res) => {
  const { chat } = req.body;

  try {
    const schema = req.body.schema || 'effective_gain';
    const result = await setUserChat(chat, schema);

    res.status(201).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      erro: 'Não foi distribuir o chat',
    });
  }
};
const processReceivedAudio = async (req, res) => {
  const { instanceId, mediaKey, chatId, schema } = req.body;

  if (!instanceId || !mediaKey || !chatId) {
    return res.status(400).json({ error: 'Os parâmetros instanceId, mediaKey e chatId são obrigatórios.' });
  }

  try {
    const decodedBase64 = await getBase64FromMediaMessage(instanceId, mediaKey);

    if (!decodedBase64 || !decodedBase64.base64) {
      throw new Error('Falha ao decodificar o áudio recebido.');
    }

    console.log('Áudio decodificado com sucesso:', decodedBase64.base64);


    await saveMediaMessage('false', chatId, new Date().getTime(), 'audio', decodedBase64.base64, schema);

    res.status(200).json({ success: true, message: 'Áudio recebido e processado com sucesso' });
  } catch (error) {
    console.error('Erro ao processar áudio recebido:', error.message);
    res.status(500).json({ error: 'Erro ao processar áudio recebido' });
  }
};

const getChatsController = async (req, res) => {
  try {
    const schema = req.params?.schema || 'effective_gain';
    const result = await getChats(schema);
    res.status(201).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      erro: 'Não foi recuperar os chats',
    });
  }
};

const getMessagesController = async (req, res) => {
  const { chat_id, schema } = req.body;
  try {
    const result = await getMessages(chat_id, schema);
    res.json({ messages: result });
  } catch (err) {
    console.error('Erro ao buscar mensagens:', err);
    res.status(500).json({ error: err.message });
  }
};

const updateQueueController = async (req, res) => {
  try {
    const { queueId, chatId } = req.body;
    const schema = req.body.schema || 'effective_gain';

    const result = await updateQueue(schema, chatId, queueId);
    res.json({ messages: result });
  } catch (err) {
    console.error('Erro ao definir fila do chat:', err);
    res.status(500).json({ error: err.message });
  }
};

const getChatDataController = async (req, res) => {
  const { schema, chatId } = req.params;

  if (!chatId || !schema) {
    return res.status(400).json({ error: 'Os parâmetros schema e chatId são obrigatórios.' });
  }

  try {
    const result = await getChatData(chatId, schema);
    res.status(200).json({ messages: result });
  } catch (err) {
    console.error('Erro ao buscar dados do chat:', err.message);
    res.status(500).json({ error: 'Erro ao buscar dados do chat.' });
  }
};

const getChatByUserController = async (req, res) => {
  const { userId, role} = req.params;
  const schema = req.params.schema || 'effective_gain';

  if (!userId) {
    return res.status(400).json({ error: 'O parâmetro userId é obrigatório.' });
  }

  try {
    const result = await getChatByUser(userId, role, schema);
    res.status(200).json({ messages: result });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar chats do usuário.' });
  }
};

const sendAudioController = async (req, res) => {
  const { chatId, connectionId, schema } = req.body;
  const audioFile = req.file;

  if (!audioFile) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const audioPath = path.join(__dirname, '..', 'uploads', 'audios', audioFile.filename);

  try {
    if (!fs.existsSync(audioPath)) {
      throw new Error('O arquivo de áudio não foi salvo corretamente.');
    }

    const stats = fs.statSync(audioPath);

    if (stats.size === 0) {
      throw new Error('O arquivo de áudio está vazio.');
    }

    const audioBuffer = fs.readFileSync(audioPath);
    const audioBase64 = audioBuffer.toString('base64');

    if (audioBase64.length === 0) {
      throw new Error('Falha ao converter o áudio para base64.');
    }

    const chat_id = await getChatById(chatId, connectionId, schema);
    console.log('Resultado de getChatById:', chat_id);

    if (!chat_id || !chat_id.contact_phone) {
      throw new Error('O chat_id ou contact_phone não foi encontrado.');
    }

    const instanceId = await searchConnById(connectionId, schema);

    const evolutionResponse = await sendAudioToWhatsApp(chat_id.contact_phone, audioBase64, instanceId.name);

    await saveMediaMessage(evolutionResponse.key.id, 'true', chatId, getCurrentTimestamp(), 'audio', audioBase64, schema);

    res.status(200).json({ success: true, message: 'Áudio processado e enviado com sucesso', evolutionResponse });
  } catch (error) {
    console.error('Erro ao processar áudio:', error.message);
    res.status(500).json({ error: 'Erro ao processar áudio' });
  } finally {
    setTimeout(() => {
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
    }, 500);
  }

};
const setMessageAsReadController = async(req, res)=>{
try {
  const {chat_id} = req.body
  const schema = req.body.schema

  const result = await setMessageAsRead(chat_id, schema)
  res.status(200).json({
    result:result
  })
} catch (error) {
  console.log(error)
}
}
const closeChatContoller = async(req, res)=>{
  try{
    const {chat_id} = req.body
    const schema = req.body.schema
    const result = await closeChat(chat_id, schema)

   res.status(200).json({
    result:result
  })
  } catch (error) {
    console.log(error)
  }
}

const setSpecificUserController = async(req, res) => {
  try {
    const {user_id, chat_id} = req.body
    const schema = req.body.schema

    const result = await setSpecificUser(chat_id, user_id, schema)

    res.status(200).json({
      result: result
    })
  } catch (error) {
    console.log(error)
  }
};

  module.exports = {
    setUserChatController,
    getChatsController,
    getMessagesController,
    updateQueueController,
    getChatDataController,
    getChatByUserController,
    sendAudioController,
    processReceivedAudio,
    sendImageController,
    uploadAudio,
    uploadImage,
    setMessageAsReadController,
    closeChatContoller,
    setSpecificUserController,
};
