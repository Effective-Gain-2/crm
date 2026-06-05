const crypto = require('crypto');

// Gera um id numérico aleatório de 11 dígitos (10000000000..99999999999).
// Usado como id público/copiável de tags e etapas do kanban, e aceito pela
// API de leads. Não substitui o UUID (PK) — é aditivo.
const MIN = 10000000000; // 1e10
const RANGE = 90000000000; // 9e10 (até 99999999999)

const generateNumericId = () => {
    // crypto.randomInt aceita no máximo 2^48; nosso range cabe folgado.
    return MIN + crypto.randomInt(RANGE);
};

// Gera um id único checando colisão via callback async exists(id)->bool.
const generateUniqueNumericId = async (exists, tries = 10) => {
    for (let i = 0; i < tries; i++) {
        const id = generateNumericId();
        // eslint-disable-next-line no-await-in-loop
        if (!(await exists(id))) return id;
    }
    throw new Error('Não foi possível gerar numeric_id único');
};

module.exports = { generateNumericId, generateUniqueNumericId };
