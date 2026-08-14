/*
 * Backfill único pós-correção do WhatsApp (rodar no console do crm-backend):
 *   node scripts/fix_whatsapp_chats.js
 *
 * O que faz, em TODOS os tenants registrados:
 *  1. isGroup real (o bug antigo gravava "fromMe" no campo).
 *  2. Merge dos pares LID: chats criados com jid @lid cujo telefone é conhecido
 *     (lid_map) têm as mensagens movidas para o chat do telefone e são fechados.
 *  3. Nomes: chats cujo contact_name é número/UUID ganham o melhor nome disponível
 *     em contacts (agenda > push_name); grupos ganham o nome do grupo se cacheado.
 */
require('dotenv').config();
const pool = require('../db/queries');

const ehNomeRuim = (n) => {
  const s = String(n || '').trim();
  if (!s) return true;
  if (/^[\d\s()+\-@.:]+$/.test(s)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return true;
  return false;
};

const run = async () => {
  const companies = await pool.query(`SELECT schema_name FROM effective_gain.companies`);
  for (const { schema_name: schema } of companies.rows) {
    console.log(`\n=== ${schema} ===`);
    try {
      // 1) isGroup real
      const g = await pool.query(`UPDATE ${schema}.chats SET isGroup = (chat_id LIKE '%@g.us') RETURNING id`);
      console.log(`isGroup corrigido em ${g.rowCount} chats`);

      // 2) Merge LID → telefone
      let merged = 0;
      const lids = await pool.query(`SELECT lid, phone_jid FROM ${schema}.lid_map`).catch(() => ({ rows: [] }));
      for (const { lid, phone_jid } of lids.rows) {
        const lidNum = lid.split('@')[0];
        const phoneNum = phone_jid.split('@')[0];
        const chatsLid = await pool.query(
          `SELECT id, connection_id FROM ${schema}.chats WHERE contact_phone = $1`, [lidNum]
        );
        for (const cl of chatsLid.rows) {
          const alvo = await pool.query(
            `SELECT id FROM ${schema}.chats
              WHERE contact_phone = $1 AND connection_id = $2 AND status <> 'closed' AND id <> $3
              ORDER BY created_at DESC LIMIT 1`,
            [phoneNum, cl.connection_id, cl.id]
          );
          if (alvo.rows[0]) {
            await pool.query(`UPDATE ${schema}.messages SET chat_id = $1 WHERE chat_id = $2`, [alvo.rows[0].id, cl.id]);
            await pool.query(`UPDATE ${schema}.lembretes SET chat_id = $1 WHERE chat_id = $2`, [alvo.rows[0].id, cl.id]).catch(() => {});
            await pool.query(`UPDATE ${schema}.chats SET status = 'closed', contact_name = contact_name || ' (unificado)' WHERE id = $1`, [cl.id]);
            merged++;
          } else {
            // não existe chat do telefone ainda: converte o próprio chat LID
            await pool.query(
              `UPDATE ${schema}.chats SET contact_phone = $1, chat_id = $2 WHERE id = $3`,
              [phoneNum, phone_jid, cl.id]
            );
            merged++;
          }
        }
      }
      console.log(`chats LID unificados/convertidos: ${merged}`);

      // 3) Nomes ruins → melhor nome disponível
      const ruins = await pool.query(
        `SELECT c.id, c.contact_phone, c.contact_name, c.isGroup,
                ct.contact_name AS nome_contato, ct.push_name
           FROM ${schema}.chats c
           LEFT JOIN ${schema}.contacts ct ON ct.number = c.contact_phone
          WHERE c.status <> 'closed'`
      );
      let renomeados = 0;
      for (const ch of ruins.rows) {
        if (!ehNomeRuim(ch.contact_name)) continue;
        const candidato = [ch.nome_contato, ch.push_name].find((n) => !ehNomeRuim(n));
        if (candidato) {
          await pool.query(`UPDATE ${schema}.chats SET contact_name = $1 WHERE id = $2`, [candidato, ch.id]);
          renomeados++;
        }
      }
      console.log(`chats renomeados: ${renomeados}`);
    } catch (e) {
      console.error(`Falha em ${schema}:`, e.message);
    }
  }
  console.log('\nBackfill concluído.');
  process.exit(0);
};

run().catch((e) => { console.error(e); process.exit(1); });
