// Configura o disparo de primeiro contato (mensagem B) para um tenant.
// Idempotente: pode rodar quantas vezes quiser.
//
// Uso (console do crm-backend):
//   node scripts/config_hubspot_outreach.js cdt_nova_iguacu
//   WELCOME_ATENDENTE='Hiago' WELCOME_UNIDADE='Nova Iguaçu' \
//     node scripts/config_hubspot_outreach.js cdt_nova_iguacu
//   WELCOME_INSTANCE='cdt_nova_iguacu__<nome>' node scripts/config_hubspot_outreach.js cdt_nova_iguacu
//
// Sem WELCOME_INSTANCE, o script descobre a conexão do tenant sozinho:
// prefere uma 'connected'; se houver só uma, usa essa; se houver várias e nenhuma
// conectada, PARA e lista, para não escolher errado.
const crypto = require('crypto');
const pool = require('../db/queries');
const { setSetting, getSetting } = require('../services/IntegrationService');
const { MESSAGE_VARIANTS } = require('../services/LeadOutreachService');

const SCHEMA_RE = /^[a-z][a-z0-9_]{1,40}$/;

async function pickConnection(schema) {
    const forced = process.env.WELCOME_INSTANCE;
    if (forced) {
        const r = await pool.query(`SELECT name, number, status, bloquear_frios FROM ${schema}.connections WHERE name = $1`, [forced]);
        if (!r.rows[0]) throw new Error(`WELCOME_INSTANCE='${forced}' não existe em ${schema}.connections`);
        return r.rows[0];
    }
    const all = await pool.query(
        `SELECT name, number, status, bloquear_frios FROM ${schema}.connections ORDER BY criada_em DESC NULLS LAST`
    );
    if (all.rows.length === 0) throw new Error(`Nenhuma conexão em ${schema}.connections — conecte o número primeiro.`);
    const connected = all.rows.filter((c) => c.status === 'connected');
    if (connected.length === 1) return connected[0];
    if (connected.length === 0 && all.rows.length === 1) return all.rows[0];
    // Ambíguo: lista e exige WELCOME_INSTANCE.
    console.log('Mais de uma conexão possível — defina WELCOME_INSTANCE com o "name" desejado:');
    for (const c of all.rows) console.log(`  - ${c.name}  (número ${c.number}, status ${c.status})`);
    throw new Error('conexão ambígua');
}

async function main() {
    const schema = process.argv[2];
    if (!SCHEMA_RE.test(schema || '')) {
        console.error('Informe um schema válido. Ex.: node scripts/config_hubspot_outreach.js cdt_nova_iguacu');
        process.exitCode = 1;
        return;
    }

    const atendente = process.env.WELCOME_ATENDENTE || 'Hiago';
    const unidade = process.env.WELCOME_UNIDADE || 'Nova Iguaçu';

    try {
        const conn = await pickConnection(schema);

        await setSetting(schema, 'welcome_instance', conn.name, 'config-script');
        await setSetting(schema, 'welcome_atendente', atendente, 'config-script');
        await setSetting(schema, 'welcome_unidade', unidade, 'config-script');
        // 5 variações do primeiro contato (rotacionadas por lead — anti-repetição).
        await setSetting(schema, 'welcome_templates', JSON.stringify(MESSAGE_VARIANTS), 'config-script');

        // Token que o coletor usa para autenticar o POST /hubspot-leads/:schema.
        // Gera uma vez e reaproveita — não sobrescreve se já existir.
        let pushToken = await getSetting(schema, 'hubspot_push_token');
        if (!pushToken) {
            pushToken = crypto.randomBytes(24).toString('hex');
            await setSetting(schema, 'hubspot_push_token', pushToken, 'config-script');
        }

        console.log('✓ Disparo configurado para', schema);
        console.log('  welcome_instance :', conn.name, `(número ${conn.number}, status ${conn.status})`);
        console.log('  welcome_atendente:', atendente);
        console.log('  welcome_unidade  :', unidade);
        console.log('  welcome_templates:', MESSAGE_VARIANTS.length, 'variações (rotação por lead)');
        console.log('  welcome_media_urls: (vazio — suba as logos aqui p/ sair imagem+legenda)');
        console.log('\n  Token do coletor (coloque em CRM_PUSH_TOKEN no .env do coletor):');
        console.log('  CRM_PUSH_TOKEN=' + pushToken);

        // Avisos que evitam disparo barrado ou indevido.
        if (conn.status !== 'connected') {
            console.log(`\n⚠ A conexão está "${conn.status}", não "connected". O disparo só sai com o número conectado (QR lido).`);
        }
        if (conn.bloquear_frios) {
            console.log('\n⚠ bloquear_frios ESTÁ LIGADO nesta conexão. Todo lead novo é "frio" e será BLOQUEADO.');
            console.log('  Para este caso (a pessoa pediu contato), desligue na tela de Conexões WhatsApp,');
            console.log('  ou rode: UPDATE ' + schema + '.connections SET bloquear_frios = false WHERE name = \'' + conn.name + '\';');
        }
    } catch (e) {
        console.error('Erro:', e.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

main();
