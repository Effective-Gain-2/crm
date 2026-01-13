const axios = require('axios');

const api_url = 'https://sandbox.api.pagseguro.com';

const createPaymentRequestQrCode = async (name, email, cpf, item, value,) => {
    const response = await axios.post(`${api_url}/orders`, {
        "customer": {
            "name": name,
            "email": email,
            "tax_id": cpf
        },
        "items": [
            {
                name: item,
                quantity: 1,
                unit_amount: value
            }
        ],
        "qr_codes": [
            {
                "amount": {
                    "value": value
                },
                "expiration_date": new Date(new Date().getTime() + 15*60000).toISOString()
            }
        ]
    },
        {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.PAGSEGURO_TOKEN}`
            }
        })
    return response.data;
}

module.exports = {
    createPaymentRequestQrCode
}