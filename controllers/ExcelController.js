const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { processExcelFile } = require('../services/ExcelReader');
const { getInformationFromExcel } = require('../services/ExcelReader');

// Função para converter CSV em XLSX
function convertCsvToXlsx(csvPath) {
  const csvData = fs.readFileSync(csvPath, 'utf8');
  const ws = XLSX.utils.aoa_to_sheet(
    XLSX.utils.sheet_to_json(XLSX.read(csvData, { type: 'string' }).Sheets.Sheet1, { header: 1, raw: false })
  );
  const newWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(newWb, ws, 'Sheet1');
  const xlsxPath = csvPath.replace(/\.csv$/i, '.xlsx');
  XLSX.writeFile(newWb, xlsxPath);
  return xlsxPath;
}

exports.uploadExcel = async (req, res) => {
  const { sector, schema } = req.body;
  try {
    let filePath = req.file.path;
    if (filePath.endsWith('.csv')) {
      filePath = convertCsvToXlsx(filePath);
    }
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    const rows = data.slice(1);
    const contatos = rows
      .map(row => ({
        nome: row[0]?.toString() || '',
        numero: row[1]?.toString() || '',
        etapa: row[2]?.toString() || ''
      }))
      .filter(contato => contato.nome && contato.numero && contato.etapa);

    await processExcelFile(sector, schema);

    res.status(200).json({success:true, message: 'Arquivo enviado e processado com sucesso!', file: path.basename(filePath) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao salvar ou processar arquivo.' });
  }
};