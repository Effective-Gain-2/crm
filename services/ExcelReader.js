const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const pool = require("../db/queries")
const multer = require('multer');
const { insertValueCustomField } = require('./ContactService');
const { insertInKanbanStage } = require('./KanbanService');

const folderPath = path.join(__dirname, '..', 'uploads');

function processExcelFile(sector, schema) {
  const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.xlsx'));

  if (files.length === 0) {
    console.log('Nenhum arquivo .xlsx encontrado.');
    return [];
  }

  const filePath = path.join(folderPath, files[0]); 
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0]; 
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  getInformationFromExcel(data, sector, schema) 
  
  fs.unlinkSync(filePath);
  return data;
}

const getInformationFromExcel = async (data, sector, schema) => {
  for (const row of data) {
    let numero = row.numero?.toString();
    if (!row.nome) {
      console.warn('Linha ignorada: nome ausente.', row);
      continue;
    }
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
      
      for (const [key, value] of Object.entries(row)) {
        if (key !== 'numero' && key !== 'nome' && key !== 'etapa') {
          // Converter valores de tempo do Excel para formato de horário
          let processedValue = value;
          
          // Detectar se é um horário baseado no nome do campo e valor
          const isTimeField = key.toLowerCase().includes('hora') || 
                             key.toLowerCase().includes('time') || 
                             key.toLowerCase().includes('horario');
          
          // Se o valor é um número decimal e o campo parece ser de horário
          if (typeof value === 'number' && isTimeField) {
            // Se está entre 0 e 1 (formato Excel: 0.75 = 18:00)
            if (value >= 0 && value < 1) {
              const hours = Math.floor(value * 24);
              const minutes = Math.floor((value * 24 - hours) * 60);
              processedValue = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            }
            // Se está entre 1 e 2 (formato Excel: 1.75 = 18:00)
            else if (value >= 1 && value < 2) {
              const hours = Math.floor(value * 24);
              const minutes = Math.floor((value * 24 - hours) * 60);
              processedValue = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            }
            // Se não parece ser horário, manter como número
            else {
              processedValue = value?.toString() || '';
            }
          } else {
            // Para outros valores, converter para string
            processedValue = value?.toString() || '';
          }
          
          await insertValueCustomField(key, numero, processedValue, schema);
        }
      }
      
      if (etapa) {
        const result = await insertInKanbanStage(etapa, sector, numero, schema);
        if (result === null) {
          console.warn(`Linha ignorada: etapa "${etapa}" não encontrada no funil "${sector}".`, row);
        }
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