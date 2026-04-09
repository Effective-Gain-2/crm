const axios = require('axios');
const pool = require('../db/queries');

const vapiUrl = 'https://api.vapi.ai'

const initiateVAPICall = async (data) => {
    try {
        const isInDNC = await pool.query(`SELECT * FROM ${data.schema}.dnc_list WHERE phone = $1`, [data.phone]);
        if(isInDNC.rowCount > 0){
            console.log(`Número ${data.phone} está na lista de não contactar. Ligação não iniciada.`);
            return;
        }
        const res =  await axios.post(`${vapiUrl}/call`, {customer:{number: data.phone}, assistantId:'5028777c-f14d-43e3-ad5f-4fe4dd2180f8', phoneNumberId:'7fe472e1-a105-4b5c-8522-007a4b31f871' }, { headers: { Authorization: `Bearer ${process.env.VAPI_KEY}` } })
    } catch (error) {
        console.error('Error initiating VAPI call:', error.response ? error.response.data : error.message);
    }
}

module.exports = { initiateVAPICall }
