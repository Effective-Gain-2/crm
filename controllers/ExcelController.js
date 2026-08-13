const XLSX = require('xlsx');
const fs = require('fs');
const { getInformationFromExcel } = require('../services/ExcelReader');

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
    res.status(200).json({
      success: true,
      message: `Importação concluída: ${summary.imported} contato(s); ${summary.skipped} linha(s) ignorada(s).`,
      ...summary,
    });
  } catch (error) {
    console.error(error);
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: 'Erro ao processar o arquivo.' });
  }
};
