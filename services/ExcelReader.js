const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const pool = require("../db/queries")
const multer = require('multer');
const { insertValueCustomField } = require('./ContactService');
const { insertInKanbanStage } = require('./KanbanService');

const folderPath = path.join(__dirname, '..', 'uploads');

function processExcelFile() {
  const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.xlsx'));

  if (files.length === 0) {
    console.log('Nenhum arquivo .xlsx encontrado.');
    return [];
  }

  const filePath = path.join(folderPath, files[0]); 
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0]; 
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  console.log('Dados processados do Excel:', data);

  getInformationFromExcel(data, 'effective_gain') 

  return data;

  // fs.unlinkSync(filePath);
  
}

const getInformationFromExcel = async (data, connection, schema) => {
  for (const row of data) {
    let numero = row.numero?.toString();
    const nomeSeparado = row.nome.split(' ');
    const etapa = row.etapa;

    const nome = nomeSeparado
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');

    if (!numero || !nome) {
      console.warn('Linha ignorada: número ou nome ausente.', row);
      continue;
    }
    if (!numero.startsWith('55')) {
      numero = `55${numero}`;
    }

    try {
      await pool.query(
        `INSERT INTO ${schema}.contacts (number, contact_name) VALUES ($1, $2)
         ON CONFLICT (number) DO NOTHING`,
        [numero, nome]
      );
      console.log(`Contato inserido ou já existente: ${numero} - ${nome}`);
      for (const [key, value] of Object.entries(row)) {
        if (key !== 'numero' && key !== 'nome' && key !== 'etapa') {
          await insertValueCustomField(key, numero, value, schema);
        }
      }
      if (etapa) {
        await insertInKanbanStage(etapa, connection, numero, schema);
        console.log(`Contato ${numero} inserido na etapa ${etapa}`);
      }
    } catch (error) {
      console.error(`Erro ao processar linha: ${JSON.stringify(row)}`, error);
    }
  }
};

module.exports = {
  processExcelFile,
  getInformationFromExcel
};