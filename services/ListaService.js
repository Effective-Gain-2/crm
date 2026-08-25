const pool = require('../db/queries');
const { v4: uuidv4 } = require('uuid');

// Schema entra interpolado nas queries (identificador nao e parametrizavel).
const SCHEMA_RE = /^[a-z][a-z0-9_]{1,40}$/;
const safeSchema = (schema) => {
  if (!SCHEMA_RE.test(schema || '')) throw new Error(`Nome de schema invalido: ${schema}`);
  return schema;
};

// Mesma regra do importador do kanban: o disparo so funciona com numero em digitos
// e prefixo 55. Aceitar a mascara aqui geraria "55(21) 9...", que nao envia.
const normalizarNumero = (valor) => {
  const digitos = String(valor ?? '').replace(/\D/g, '');
  if (!digitos) return null;
  return digitos.startsWith('55') ? digitos : `55${digitos}`;
};

const capitalizarNome = (nome) => String(nome)
  .trim()
  .split(/\s+/)
  .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase())
  .join(' ');

// Cria a lista a partir das linhas de uma planilha. Aceita as colunas do modelo
// do sistema (nome/numero) e tambem os cabecalhos mais comuns de uma lista pronta.
const criarListaDePlanilha = async (nome, linhas, schema, criadaPor = null) => {
  safeSchema(schema);

  if (!nome || !String(nome).trim()) {
    throw new Error('Nome da lista obrigatorio');
  }
  if (!Array.isArray(linhas) || linhas.length === 0) {
    throw new Error('Planilha vazia');
  }

  const pegarCampo = (linha, nomes) => {
    for (const chave of Object.keys(linha)) {
      if (nomes.includes(chave.trim().toLowerCase())) return linha[chave];
    }
    return undefined;
  };

  const contatos = [];
  const vistos = new Set();
  let ignorados = 0;

  for (const linha of linhas) {
    const nomeContato = pegarCampo(linha, ['nome', 'name', 'contato']);
    const numeroBruto = pegarCampo(linha, ['numero', 'número', 'celular', 'telefone', 'whatsapp', 'phone']);
    const numero = normalizarNumero(numeroBruto);

    // Sem numero nao ha para quem enviar; sem nome o {{contact_name}} sai vazio.
    if (!numero || !nomeContato) {
      ignorados++;
      continue;
    }
    if (vistos.has(numero)) {
      ignorados++;
      continue;
    }

    vistos.add(numero);
    contatos.push({ numero, nome: capitalizarNome(nomeContato) });
  }

  if (contatos.length === 0) {
    throw new Error('Nenhum contato valido na planilha. Confira as colunas nome e numero.');
  }

  const listaId = uuidv4();
  await pool.query(
    `INSERT INTO ${schema}.listas (id, nome, criada_em, criada_por) VALUES ($1, $2, $3, $4)`,
    [listaId, String(nome).trim(), Date.now(), criadaPor]
  );

  for (const contato of contatos) {
    // O contato tambem entra em contacts: e de la que o disparo tira o
    // {{contact_name}} na hora de montar a mensagem.
    await pool.query(
      `INSERT INTO ${schema}.contacts (number, contact_name) VALUES ($1, $2)
       ON CONFLICT (number) DO NOTHING`,
      [contato.numero, contato.nome]
    );
    await pool.query(
      `INSERT INTO ${schema}.lista_contatos (lista_id, contact_number, contact_name)
       VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [listaId, contato.numero, contato.nome]
    );
  }

  return { id: listaId, nome: String(nome).trim(), importados: contatos.length, ignorados };
};

const getListas = async (schema) => {
  safeSchema(schema);
  const result = await pool.query(
    `SELECT l.id, l.nome, l.criada_em,
            COUNT(lc.contact_number)::int AS total_contatos
       FROM ${schema}.listas l
       LEFT JOIN ${schema}.lista_contatos lc ON lc.lista_id = l.id
      GROUP BY l.id, l.nome, l.criada_em
      ORDER BY l.criada_em DESC NULLS LAST, l.nome`
  );
  return result.rows;
};

const getContatosDaLista = async (lista_id, schema) => {
  safeSchema(schema);
  const result = await pool.query(
    `SELECT lc.contact_number AS number,
            COALESCE(c.contact_name, lc.contact_name) AS contact_name
       FROM ${schema}.lista_contatos lc
       LEFT JOIN ${schema}.contacts c ON c.number = lc.contact_number
      WHERE lc.lista_id = $1`,
    [lista_id]
  );
  return result.rows;
};

const deleteLista = async (lista_id, schema) => {
  safeSchema(schema);
  // Disparo que aponta para a lista perde o alvo — melhor barrar do que deixar
  // um disparo agendado mirando o vazio.
  const emUso = await pool.query(
    `SELECT campaing_name FROM ${schema}.campaing WHERE lista_id = $1`,
    [lista_id]
  );
  if (emUso.rowCount > 0) {
    const nomes = emUso.rows.map((r) => r.campaing_name).join(', ');
    throw new Error(`Lista em uso pelo(s) disparo(s): ${nomes}`);
  }

  const result = await pool.query(
    `DELETE FROM ${schema}.listas WHERE id = $1 RETURNING *`,
    [lista_id]
  );
  return result.rows[0];
};

module.exports = {
  criarListaDePlanilha,
  getListas,
  getContatosDaLista,
  deleteLista,
};
