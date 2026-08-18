// Mascaramento de dado sensível antes de gravar em log/auditoria.
//
// Contexto: o payload cru do HubSpot pode trazer CPF (e o portal tem campos de
// crédito/saúde). A tabela webhook_events guarda o payload para replay — e o
// CLAUDE.md da EG proíbe dado sensível em log. Então mascara-se antes de persistir.
//
// A chave, não só o valor: um CPF pode chegar em "cpf", "document", "tax_id" ou num
// campo custom de nome imprevisível. Cobrimos por (a) nome de chave suspeito e
// (b) formato do valor (padrão de CPF), para pegar os dois casos.

const SENSITIVE_KEY = /(cpf|cnpj|rg|documento|document|tax|passport|nascimento|birth|saude|sa[uú]de|clinic|cart[aã]o|card|conta|iban|pix)/i;

// CPF: 11 dígitos, com ou sem máscara. CNPJ: 14. Cartão: 13-16 dígitos.
const CPF_RE = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const LONGNUM_RE = /\b\d{13,19}\b/g;

const maskValue = (v) => {
    if (typeof v !== 'string') return v;
    return v.replace(CPF_RE, '***CPF***').replace(LONGNUM_RE, '***NUM***');
};

// Percorre o objeto recursivamente. Chave sensível → valor vira '***'; senão,
// mascara padrões no texto. Não muta o original.
const maskSensitive = (input) => {
    if (Array.isArray(input)) return input.map(maskSensitive);
    if (input && typeof input === 'object') {
        const out = {};
        for (const [k, val] of Object.entries(input)) {
            if (SENSITIVE_KEY.test(k)) {
                out[k] = '***';
            } else {
                out[k] = maskSensitive(val);
            }
        }
        return out;
    }
    return maskValue(input);
};

module.exports = { maskSensitive };
