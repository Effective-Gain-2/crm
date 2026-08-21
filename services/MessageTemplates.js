// Catálogo de mensagens do Cartão de Todos (unidade Nova Iguaçu e afins).
//
// 3 categorias: boas-vindas (primeiro contato), aniversário e relacionamento.
// TODAS chamam o cliente pelo nome e TODAS trazem no corpo o telefone principal
// da unidade — resiliência a ban: se o número que dispara cair, a mensagem já
// entregue mantém um número clicável para o cliente abrir conversa com a unidade.
//
// ⚠ O {telefone_unidade} deve ser um número DIFERENTE do que dispara — senão o
//   ban derruba os dois e o fallback não serve. Idealmente uma linha humana.
//
// Placeholders: {primeiro_nome} {atendente} {unidade} {telefone_unidade}

// Rodapé fixo — entra AUTOMATICAMENTE no fim de toda mensagem (renderMessage),
// então é impossível esquecer em alguma. Dois canais: WhatsApp da unidade
// (número clicável, DIFERENTE do que dispara — fallback anti-ban) e presencial.
const FOOTER =
    '\n\nDúvidas? Fale com a nossa unidade no WhatsApp {telefone_unidade} ' +
    'ou venha para atendimento presencial: {endereco_unidade}.';

// --- Boas-vindas / primeiro contato (cliente FEZ contato pelo Cartão de Todos) ---
// Sem o telefone no corpo: o rodapé (FOOTER) já cuida disso em toda mensagem.
const WELCOME = [
    'Olá, {primeiro_nome}! Tudo bem?\n' +
    'Aqui é {atendente}, da unidade do Cartão de Todos em {unidade}.\n' +
    'Recebi o seu contato feito pelo Cartão de Todos e passei para me apresentar. Como posso te ajudar?',

    'Oi, {primeiro_nome}, tudo bem?\n' +
    'Meu nome é {atendente}, sou da unidade do Cartão de Todos em {unidade}.\n' +
    'Vi que você fez contato com o Cartão de Todos e vim me colocar à disposição. Em que posso te ajudar?',

    'Olá, {primeiro_nome}!\n' +
    'Aqui é {atendente}, do Cartão de Todos em {unidade}.\n' +
    'Chegou até mim a sua solicitação feita no Cartão de Todos. Fico à disposição para te ajudar no que precisar.',

    'Oi, {primeiro_nome}! Tudo certo?\n' +
    'Sou {atendente}, da unidade do Cartão de Todos em {unidade}.\n' +
    'Recebi seu contato pelo Cartão de Todos e queria entender como posso te ajudar. É só me falar por aqui.',

    'Olá, {primeiro_nome}, tudo bem?\n' +
    'Quem fala é {atendente}, da unidade do Cartão de Todos em {unidade}.\n' +
    'Vi seu contato aqui com a gente e vim me apresentar. Se precisar de qualquer coisa, pode contar comigo.',
];

// --- Aniversário (natalício) ---
const BIRTHDAY = [
    'Feliz aniversário, {primeiro_nome}! 🎉\n' +
    'A unidade do Cartão de Todos em {unidade} deseja um dia muito especial para você. Conte sempre com a gente!',

    'Parabéns, {primeiro_nome}! 🥳\n' +
    'Hoje é o seu dia, e a equipe do Cartão de Todos em {unidade} passou para desejar muita saúde e alegria.',

    'Oi, {primeiro_nome}! Feliz aniversário! 🎂\n' +
    'Aqui é {atendente}, do Cartão de Todos em {unidade}. Que seu novo ciclo venha cheio de coisas boas.',

    '{primeiro_nome}, parabéns pelo seu dia! 🎈\n' +
    'A unidade do Cartão de Todos em {unidade} celebra com você e continua à disposição no que precisar.',
];

// --- Relacionamento (oportunidades / vantagens do Cartão de Todos) ---
// Obs.: mantenha os benefícios genéricos ou ajuste ao que a unidade de fato oferece.
const RELATIONSHIP = [
    'Oi, {primeiro_nome}! Tudo bem?\n' +
    'Aqui é {atendente}, da unidade do Cartão de Todos em {unidade}.\n' +
    'Passando para lembrar que seu Cartão de Todos dá acesso a vantagens e descontos que talvez você ainda não esteja aproveitando. Quer que eu te explique como usar?',

    'Olá, {primeiro_nome}!\n' +
    'Aqui é {atendente}, do Cartão de Todos em {unidade}. Você sabia que o Cartão tem oportunidades pensadas para você e sua família?\n' +
    'Me chama que eu te mostro como aproveitar.',

    'Oi, {primeiro_nome}, tudo certo?\n' +
    'Sou {atendente}, da unidade do Cartão de Todos em {unidade}. Estou à disposição para te ajudar a tirar o máximo do seu Cartão de Todos.\n' +
    'Quer conhecer as vantagens disponíveis hoje?',

    'Olá, {primeiro_nome}!\n' +
    'A unidade do Cartão de Todos em {unidade} está com novidades e oportunidades para você. Aqui é {atendente} — posso te contar quais fazem mais sentido para o seu caso?',
];

// Formata telefone BR para forma clicável no WhatsApp (+55 (DD) 9XXXX-XXXX).
// Número clicável abre conversa com essa linha — o fallback anti-ban. Sem match, devolve como veio.
const formatPhone = (raw) => {
    const d = String(raw || '').replace(/\D/g, '');
    if (!d) return '';
    const nat = d.startsWith('55') ? d.slice(2) : d;
    if (nat.length === 11) return `+55 (${nat.slice(0, 2)}) ${nat.slice(2, 7)}-${nat.slice(7)}`;
    if (nat.length === 10) return `+55 (${nat.slice(0, 2)}) ${nat.slice(2, 6)}-${nat.slice(6)}`;
    return String(raw).trim();
};

const primeiroNome = (nome) => {
    const n = String(nome || '').trim().split(/\s+/)[0] || '';
    return n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : 'tudo bem';
};

// Renderiza a mensagem e, por padrão, ANEXA o rodapé fixo (telefone + endereço da
// unidade) — garante que toda mensagem termine com os dois canais de contato.
// withFooter=false para casos em que o texto já traz o próprio rodapé.
const renderMessage = (tpl, { nome, atendente, unidade, telefone, endereco, withFooter = true } = {}) => {
    const corpo = withFooter ? String(tpl || '') + FOOTER : String(tpl || '');
    return corpo
        .replace(/\{primeiro_nome\}/g, primeiroNome(nome))
        .replace(/\{atendente\}/g, atendente || 'a equipe')
        .replace(/\{unidade\}/g, unidade || 'Nova Iguaçu')
        .replace(/\{telefone_unidade\}/g, formatPhone(telefone) || 'nossa unidade')
        .replace(/\{endereco_unidade\}/g, (endereco && String(endereco).trim()) || 'nossa unidade');
};

// Índice estável por chave (mesmo lead → mesma variação; leads diferentes → textos diferentes).
const variantIndex = (key, n) => {
    const s = String(key || '');
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return n > 0 ? h % n : 0;
};

const CATALOG = { welcome: WELCOME, birthday: BIRTHDAY, relationship: RELATIONSHIP };

module.exports = { WELCOME, BIRTHDAY, RELATIONSHIP, CATALOG, FOOTER, renderMessage, primeiroNome, variantIndex, formatPhone };
