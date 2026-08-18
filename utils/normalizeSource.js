// Fonte canônica da oportunidade.
//
// Problema que isto resolve: a tela de Atribuição agrupa por `opportunities.source`
// como texto puro. Import do GHL trouxe "HUBSPOT", o webhook do Meta grava "Meta ADs"
// e digitação manual traz "hubspot" — três linhas separadas para duas origens reais.
//
// A correção NÃO é lower() em tudo: isso resolveria o agrupamento e estragaria o
// rótulo exibido ao cliente ("meta ads", "tim"). Então mapeia-se a chave normalizada
// (minúscula, sem espaço duplicado) para um rótulo legível fixo.

// chave normalizada -> rótulo exibido
const SOURCE_CANONICAL = {
    'hubspot': 'HubSpot',
    'hub spot': 'HubSpot',
    'meta ads': 'Meta ADs',
    'meta ad': 'Meta ADs',
    'facebook ads': 'Meta ADs',
    'instagram ads': 'Meta ADs',
    'tim': 'TIM',
    'ghl': 'GHL',
    'gohighlevel': 'GHL',
    'whatsapp': 'WhatsApp',
    'indicacao': 'Indicação',
    'indicação': 'Indicação',
    'manual': 'Manual',
};

// Reduz a chave de agrupamento: minúscula, sem espaços nas pontas nem duplicados.
const sourceKey = (source) =>
    String(source ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

// Devolve o rótulo canônico. Fonte desconhecida é preservada (só aparada) — o
// dicionário cresce conforme aparecem origens novas, sem descartar dado do cliente.
const normalizeSource = (source) => {
    const key = sourceKey(source);
    if (!key) return null;
    return SOURCE_CANONICAL[key] || String(source).trim().replace(/\s+/g, ' ');
};

module.exports = { normalizeSource, sourceKey, SOURCE_CANONICAL };
