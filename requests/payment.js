const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

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

const createAssinantePagBank = async (name, email, cpf, phone_area_code, phone_number, birth_date, street, house_number, complement, district, city, state, postal_code) => {
    const response = await axios.post(`${api_url}/customers`, {
        "phone":{
            "country_code": "55",
            "area": phone_area_code,
            "number": phone_number
        },
        "address":{
            "street": street,
            "number": house_number,
            "locality": district,
            "city": city,
            "region_code": state,
            "country": "BRA",
            "postal_code": postal_code  
        },
        "reference_id": uuidv4(),
        "name": name,
        "email": email,
        "tax_id": cpf,
        "birth_date":birth_date
    })
    
}

module.exports = {
    createPaymentRequestQrCode
}