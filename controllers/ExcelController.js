const XLSX = require('xlsx');
const fs = require('fs');
const { getInformationFromExcel } = require('../services/ExcelReader');
const { criarListaDePlanilha } = require('../services/ListaService');

exports.uploadExcel = async (req, res) => {
  const { sector, schema } = req.body;
  try {
    if (!req.file?.path) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }
    // Lê O ARQUIVO ENVIADO (antes: pegava o primeiro .xlsx da pasta uploads —
    // arquivo errado em uploads simultâneos, e .csv/.xls eram ignorados em silêncio)
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const summary = await getInformationFromExcel(data, sector, schema);

    fs.unlink(req.file.path, () => {});

    // Cada importacao vira tambem uma LISTA nomeada com data: e ela que permite
    // disparar exatamente para este lote (e reaproveita-lo depois), sem depender
    // da etapa do funil — que mistura este lote com quem ja estava la.
    let lista = null;
    if (summary.imported > 0) {
      try {
        const agora = new Date().toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        });
        const nomeLista = `Importação ${sector} ${agora}`;
        lista = await criarListaDePlanilha(nomeLista, data, schema, req.auth?.local_user_id || null);
      } catch (e) {
        // A lista e um extra da importacao: falhar aqui nao pode desfazer o que ja
        // entrou no funil. Fica no log e a resposta segue sem lista.
        console.error('Importação ok, mas a lista do lote não pôde ser criada:', e.message);
      }
    }

    let message = `Importação concluída: ${summary.imported} contato(s); ${summary.skipped} linha(s) ignorada(s).`;
    if (summary.semEtapa > 0) {
      const motivo = summary.etapasNaoEncontradas.length > 0
        ? `etapa não encontrada no funil "${sector}": ${summary.etapasNaoEncontradas.join(', ')}`
        : 'a coluna "etapa" está vazia';
      message += ` ATENÇÃO: ${summary.semEtapa} contato(s) ficaram FORA do funil (${motivo}).`
        + ' Disparos por funil não vão alcançar esses contatos.';
    }
    if (summary.imported === 0) {
      message += ' Confira se a planilha tem as colunas nome, numero e etapa.';
    }

    res.status(200).json({
      success: true,
      message,
      ...summary,
      lista_id: lista?.id || null,
      lista_nome: lista?.nome || null,
      total_lista: lista?.importados || 0,
    });
  } catch (error) {
    console.error(error);
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: 'Erro ao processar o arquivo.' });
  }
};
