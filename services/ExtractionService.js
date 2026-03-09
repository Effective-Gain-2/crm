const OpenAI = require('openai');
const { sendTextMessage } = require('../requests/evolution');

const client = new OpenAI({ apiKey: process.env.OPENAI_KEY });



const prompt = `Retorne SOMENTE JSON válido, sem markdown: 

{ 
  'product_interest':   'imovel'|'veiculo'|'servicos'|null, 
  'budget_range':       'ate_100k'|'100k_300k'|'300k_600k'|'acima_600k'|null, 
  'has_down_payment':   true|false|null, 
  'down_payment_value': <numero reais ou null — só se mencionado>, 
  'timeline':           'urgente_3m'|'curto_6m'|'medio_12m'|'longo_24m'|'sem_urgencia'|null, 
  'interest_level':     'alto'|'medio'|'baixo'|'desinteressado', 
  'objections':         ['string'], 
  'objections_count':   <numero>, 
  'call_ended_by':      'lead'|'sofia'|'timeout', 
  'qualifiable':        true|false 
} 

NUNCA invente dados. Campo não mencionado = null.`;



async function extractFromTranscript(transcript, durationSeconds) {
    const res = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: `Transcrição (${durationSeconds}s):\n${transcript}` }
        ]
    });

    const keyWords = ['cpf', 'aprovado', 'garantido', 'taxa', 'juros', 'c p f']
    if (keyWords.some(kw => transcript.toLowerCase().includes(kw))) {
        console.log('key words')
        await sendTextMessage('4091dc13-9658-452d-b507-e6e67bb90d4f','Lead mencionou palavras relacionadas a crédito, revisar extração manualmente.', '557588821124');
    }

    const data = JSON.parse(res.choices[0].message.content);
    // Anti-alucinação: se valor mencionado mas 'R$' ausente, zerar 
    if (data.down_payment_value && !/R\$|reais|mil/i.test(transcript))
        data.down_payment_value = null;
    return { data, cost_usd: (res.usage.total_tokens / 1000) * 0.00015 };
}



module.exports = { extractFromTranscript }; 