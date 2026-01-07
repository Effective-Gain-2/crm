const axios = require('axios');

exports.sendWhatsappMessage = async (req, res) => {
  const { to, body } = req.body;

  const PHONE_NUMBER_ID = '55575988040003'
  const ACCESS_TOKEN = 'EAAiJWRJb1lgBPdLoPjRQZBpohise8tK2peSrH7vRu7MErw8rjR2uAKGASOq6V9EZBSIEMtI0SnjQbXqKiZCIoJHt5B7TzUW4aqmyxIx8QEPZAZB5zMjHZCvQZAzVDGD3dWqAcveYcQzpUEZBiIhSW6WZAWEehuQsx0nzPZAZAaFMuvA0Erd8T2Crr1l1iHljEdFjns0ZBR0WhPq7tB19LyJ3HYhO87BTaOcP7Nt5H2YcRDV9Yz0WogZDZD';

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body }
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );
    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data || error.message });
  }
};