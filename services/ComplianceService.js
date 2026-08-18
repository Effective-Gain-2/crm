/*
 * Compliance de envio no WhatsApp (Evolution/Baileys).
 *
 * Por que existe: no Baileys NÃO há limite publicado pela Meta — o bloqueio vem por
 * COMPORTAMENTO (volume alto, número novo disparando, mensagem idêntica em massa,
 * denúncia de quem nunca falou com você). Como o limite é desconhecido, o sistema
 * precisa impor o seu próprio e registrar tudo para auditoria.
 *
 * Ponto de aplicação: as primitivas de envio de requests/evolution.js — TODO envio
 * do CRM (atendente, agente de IA e disparo) passa por elas.
 */
const pool = require('../db/queries');

// Curva de aquecimento por IDADE da conexão. Número novo disparando volume é o
// padrão clássico de bloqueio; sobe devagar nas primeiras semanas.
const CURVA_WARMUP = [
  { diasMin: 30, limite: 800 },
  { diasMin: 14, limite: 400 },
  { diasMin: 7, limite: 200 },
  { diasMin: 3, limite: 100 },
  { diasMin: 0, limite: 50 },
];

// Mesma mensagem para muitos números em 24h = assinatura de robô
const LIMITE_TEXTO_REPETIDO = 30;
// Depois de sinal de bloqueio, para de enviar por este tempo
const PAUSA_APOS_BLOQUEIO_MIN = 30;

const cacheConexao = new Map();
const CACHE_MS = 60 * 1000;

const hashTexto = (texto) => {
  const s = String(texto || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!s) return null;
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  return String(h);
};

// A instância chega ora como nome ("<schema>__Nome"), ora como id da conexão.
const resolverConexao = async (instancia) => {
  if (!instancia) return null;
  const chave = String(instancia);
  const memo = cacheConexao.get(chave);
  if (memo && memo.exp > Date.now()) return memo.valor;

  let valor = null;
  try {
    const companies = await pool.query(`SELECT schema_name FROM effective_gain.companies`);
    for (const row of companies.rows) {
      const schema = row.schema_name;
      const r = await pool.query(
        `SELECT * FROM ${schema}.connections WHERE name = $1 OR id::text = $1 LIMIT 1`, [chave]
      ).catch(() => ({ rows: [] }));
      if (r.rows[0]) { valor = { schema, conexao: r.rows[0] }; break; }
    }
  } catch (e) { /* sem contexto: não bloqueia envio */ }

  cacheConexao.set(chave, { valor, exp: Date.now() + CACHE_MS });
  return valor;
};

const limiteDoDia = (conexao) => {
  if (conexao.limite_diario) return Number(conexao.limite_diario);
  const criada = conexao.criada_em ? new Date(conexao.criada_em) : null;
  const dias = criada ? Math.floor((Date.now() - criada.getTime()) / 86400000) : 999;
  const faixa = CURVA_WARMUP.find((f) => dias >= f.diasMin);
  return (faixa || CURVA_WARMUP[CURVA_WARMUP.length - 1]).limite;
};

const contarUm = (resultado) => {
  const linha = resultado && resultado.rows && resultado.rows[0];
  return (linha && Number(linha.total)) || 0;
};

const enviadosHoje = async (schema, connectionId) => {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS total FROM ${schema}.envio_log
      WHERE connection_id = $1 AND status = 'enviado' AND created_at >= date_trunc('day', now())`,
    [connectionId]
  ).catch(() => null);
  return contarUm(r);
};

const numerosComMesmoTexto = async (schema, connectionId, hash) => {
  if (!hash) return 0;
  const r = await pool.query(
    `SELECT COUNT(DISTINCT contact_phone)::int AS total FROM ${schema}.envio_log
      WHERE connection_id = $1 AND hash_mensagem = $2 AND status = 'enviado'
        AND created_at > now() - interval '24 hours'`,
    [connectionId, hash]
  ).catch(() => null);
  return contarUm(r);
};

// "Frio" = número que NUNCA nos mandou mensagem. Denúncia desse público é o que
// mais bana. Bloquear é OPCIONAL por conexão (bloquear_frios) porque quebraria
// campanha para base importada — caso legítimo de clientes como o CDT.
const contatoEhFrio = async (schema, connectionId, numero) => {
  const r = await pool.query(
    `SELECT 1 FROM ${schema}.messages m
       JOIN ${schema}.chats c ON c.id = m.chat_id
      WHERE c.contact_phone = $1 AND c.connection_id = $2 AND m.from_me = false
      LIMIT 1`,
    [String(numero).split('@')[0], connectionId]
  ).catch(() => ({ rowCount: 1 }));
  return r.rowCount === 0;
};

const registrar = async (ctx, dados) => {
  if (!ctx) return;
  const schema = ctx.schema;
  await pool.query(
    `INSERT INTO ${schema}.envio_log
       (id, connection_id, contact_phone, tipo, origem, status, motivo, hash_mensagem)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)`,
    [
      ctx.conexao.id,
      String(dados.numero || '').split('@')[0],
      dados.tipo || 'texto',
      dados.origem || 'sistema',
      dados.status,
      dados.motivo || null,
      dados.hash || null,
    ]
  ).catch((e) => console.error('envio_log:', e.message));
};

const alertar = (schema, mensagem, extra) => {
  console.error(`[COMPLIANCE][${schema}] ${mensagem}`);
  try {
    if (global.socketIoServer) {
      global.socketIoServer
        .to(`schema_${schema}`)
        .emit('alertaCompliance', Object.assign({ mensagem, ts: Date.now() }, extra || {}));
    }
  } catch (e) { /* socket indisponível não pode derrubar envio */ }
};

/**
 * Decide se o envio pode sair. NUNCA lança: na dúvida (sem contexto ou falha de
 * checagem) libera — travar o atendimento por erro de verificação seria pior que
 * o risco que se quer evitar.
 */
const podeEnviar = async (params) => {
  const instancia = params.instancia;
  const numero = params.numero;
  const texto = params.texto;
  const origem = params.origem || 'sistema';
  const tipo = params.tipo || 'texto';

  const ctx = await resolverConexao(instancia);
  if (!ctx) return { ok: true, ctx: null };
  const schema = ctx.schema;
  const conexao = ctx.conexao;

  try {
    if (conexao.bloqueado_ate && new Date(conexao.bloqueado_ate) > new Date()) {
      const motivo = `conexão em pausa até ${new Date(conexao.bloqueado_ate).toLocaleString('pt-BR')} (${conexao.bloqueio_motivo || 'proteção'})`;
      await registrar(ctx, { numero, tipo, origem, status: 'bloqueado', motivo });
      return { ok: false, motivo, ctx };
    }

    const limite = limiteDoDia(conexao);
    const enviados = await enviadosHoje(schema, conexao.id);

    if (enviados >= limite) {
      const motivo = `teto diário atingido (${enviados}/${limite})`;
      await registrar(ctx, { numero, tipo, origem, status: 'bloqueado', motivo });
      alertar(schema, `Envio bloqueado em ${conexao.name}: ${motivo}`, { conexao: conexao.name });
      return { ok: false, motivo, ctx };
    }
    if (enviados === Math.floor(limite * 0.8)) {
      alertar(schema, `${conexao.name} atingiu 80% do teto diário (${enviados}/${limite})`, { conexao: conexao.name });
    }

    const hash = hashTexto(texto);

    if (hash && origem === 'disparo') {
      const iguais = await numerosComMesmoTexto(schema, conexao.id, hash);
      if (iguais >= LIMITE_TEXTO_REPETIDO) {
        const motivo = `mensagem idêntica já enviada para ${iguais} números em 24h — varie o texto`;
        await registrar(ctx, { numero, tipo, origem, status: 'bloqueado', motivo, hash });
        alertar(schema, `Disparo bloqueado em ${conexao.name}: ${motivo}`, { conexao: conexao.name });
        return { ok: false, motivo, ctx };
      }
    }

    if (origem === 'disparo' && conexao.bloquear_frios) {
      const frio = await contatoEhFrio(schema, conexao.id, numero);
      if (frio) {
        const motivo = 'contato nunca interagiu (lista fria) e esta conexão está configurada para bloquear';
        await registrar(ctx, { numero, tipo, origem, status: 'bloqueado', motivo, hash });
        return { ok: false, motivo, ctx };
      }
    }

    return { ok: true, ctx, hash, limite, enviados };
  } catch (e) {
    console.error('Compliance (liberando por falha de checagem):', e.message);
    return { ok: true, ctx: null };
  }
};

// Ban monitor: lê a resposta da Evolution e reconhece sinal de bloqueio/desconexão.
const avaliarResposta = async (ctx, resposta) => {
  if (!ctx) return;
  const bruto = typeof resposta === 'string' ? resposta : JSON.stringify(resposta || {});
  const status = (resposta && (resposta.status || resposta.statusCode)) || null;
  const suspeito =
    status === 401 || status === 403 || status === 429 ||
    /forbidden|unauthorized|banned|blocked|connection closed|not connected|disconnected/i.test(bruto);
  if (!suspeito) return;

  const schema = ctx.schema;
  const conexao = ctx.conexao;
  const motivo = `resposta suspeita da Evolution (${status || 'sem status'})`;
  await pool.query(
    `UPDATE ${schema}.connections
        SET bloqueado_ate = now() + interval '${PAUSA_APOS_BLOQUEIO_MIN} minutes',
            bloqueio_motivo = $2
      WHERE id = $1`,
    [conexao.id, motivo]
  ).catch(() => {});
  cacheConexao.clear();
  alertar(
    schema,
    `PAUSA AUTOMÁTICA de ${PAUSA_APOS_BLOQUEIO_MIN} min em ${conexao.name}: ${motivo}. Verifique a conexão antes de retomar.`,
    { conexao: conexao.name, grave: true }
  );
};

const registrarEnviado = async (ctx, dados) =>
  registrar(ctx, Object.assign({}, dados, { status: 'enviado' }));

const statusDasConexoes = async (schema) => {
  const conns = await pool.query(`SELECT * FROM ${schema}.connections ORDER BY name`);
  const saida = [];
  for (const c of conns.rows) {
    const limite = limiteDoDia(c);
    const enviados = await enviadosHoje(schema, c.id);
    const bloqueados = await pool.query(
      `SELECT COUNT(*)::int AS total FROM ${schema}.envio_log
        WHERE connection_id = $1 AND status = 'bloqueado' AND created_at >= date_trunc('day', now())`,
      [c.id]
    ).catch(() => null);
    saida.push({
      id: c.id,
      nome: c.name,
      numero: c.number,
      status: c.status,
      criada_em: c.criada_em,
      limite_diario: limite,
      limite_automatico: !c.limite_diario,
      enviados_hoje: enviados,
      restante_hoje: Math.max(0, limite - enviados),
      bloqueados_hoje: contarUm(bloqueados),
      em_pausa_ate: c.bloqueado_ate,
      motivo_pausa: c.bloqueio_motivo,
      bloquear_frios: !!c.bloquear_frios,
    });
  }
  return saida;
};

module.exports = {
  podeEnviar,
  registrarEnviado,
  avaliarResposta,
  statusDasConexoes,
  limiteDoDia,
  hashTexto,
};
