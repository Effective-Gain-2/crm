// Sobe as logos do primeiro contato para DENTRO do CRM (banco), em base64.
// Nada de disco (efêmero no Easypanel) nem sistema externo: fica em
// integration_settings.welcome_media_urls, ao lado das 5 variações de texto.
//
// A ordem dos arquivos = ordem das variações (logo 1 → variação 1, etc.).
// Passe de 1 a 5 imagens; posições sem imagem saem só como texto.
//
// Uso (console do crm-backend):
//   node scripts/set_welcome_logos.js cdt_nova_iguacu logo1.png logo2.png logo3.png logo4.png logo5.png
//   node scripts/set_welcome_logos.js cdt_nova_iguacu ./logos/a.png ./logos/b.png
//   node scripts/set_welcome_logos.js cdt_nova_iguacu --clear     (remove as logos, volta a só texto)
const fs = require('fs');
const path = require('path');
const pool = require('../db/queries');
const { setSetting, deleteSetting } = require('../services/IntegrationService');
const { MESSAGE_VARIANTS } = require('../services/LeadOutreachService');

const SCHEMA_RE = /^[a-z][a-z0-9_]{1,40}$/;
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

async function main() {
    const schema = process.argv[2];
    const rest = process.argv.slice(3);
    if (!SCHEMA_RE.test(schema || '')) {
        console.error('Schema inválido. Ex.: node scripts/set_welcome_logos.js cdt_nova_iguacu logo1.png ...');
        process.exitCode = 1; return;
    }

    try {
        if (rest[0] === '--clear') {
            await deleteSetting(schema, 'welcome_media_urls');
            console.log('✓ Logos removidas — disparo volta a sair só texto.');
            return;
        }
        if (rest.length === 0) {
            console.error('Passe de 1 a 5 arquivos de imagem (na ordem das variações).');
            process.exitCode = 1; return;
        }
        if (rest.length > MESSAGE_VARIANTS.length) {
            console.log(`⚠ Você passou ${rest.length} imagens, mas há ${MESSAGE_VARIANTS.length} variações. As extras serão ignoradas.`);
        }

        const midias = [];
        for (let i = 0; i < Math.min(rest.length, MESSAGE_VARIANTS.length); i++) {
            const p = rest[i];
            if (!fs.existsSync(p)) throw new Error(`arquivo não encontrado: ${p}`);
            const ext = path.extname(p).toLowerCase();
            const mime = MIME[ext];
            if (!mime) throw new Error(`extensão não suportada (${ext}) em ${p} — use png/jpg/webp`);
            const b64 = fs.readFileSync(p).toString('base64');
            // data URI: formato aceito pela Evolution em sendMedia (media).
            midias.push(`data:${mime};base64,${b64}`);
            const kb = Math.round(Buffer.byteLength(b64) / 1024);
            console.log(`  variação ${i + 1} ← ${path.basename(p)} (${kb} KB)`);
        }

        await setSetting(schema, 'welcome_media_urls', JSON.stringify(midias), 'set-welcome-logos');
        console.log(`\n✓ ${midias.length} logo(s) gravada(s) em ${schema}.integration_settings (welcome_media_urls).`);
        console.log('  A partir de agora o primeiro contato dessas variações sai como imagem + legenda.');
        if (midias.length < MESSAGE_VARIANTS.length) {
            console.log(`  As variações ${midias.length + 1}..${MESSAGE_VARIANTS.length} continuam saindo só texto (sem logo).`);
        }
    } catch (e) {
        console.error('Erro:', e.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

main();
