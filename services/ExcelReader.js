const xlsx = require('xlsx');
const pool = require("../db/queries")
const { insertValueCustomField } = require('./ContactService');
const { insertInKanbanStage } = require('./KanbanService');

const getInformationFromExcel = async (data, sector, schema) => {
  let imported = 0, skipped = 0, semEtapa = 0;
  const etapasNaoEncontradas = new Set();
  for (const row of data) {
    let numero = row.numero?.toString();
    if (!row.nome) {
      console.warn('Linha ignorada: nome ausente.', row);
      skipped++;
      continue;
    }
    const nomeSeparado = row.nome.split(' ');
    const etapa = row.etapa;
    
    const nome = nomeSeparado
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');

    if (!numero || !nome) {
      console.warn('Linha ignorada: número ou nome ausente.', row);
      skipped++;
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
          try {
            await insertValueCustomField(key, numero, value, schema);
          } catch (e) {
            // Campo personalizado inexistente não impede o contato de entrar na etapa
            console.warn(`Campo personalizado ignorado ("${key}"): ${e.message}`);
          }
        }
      }
      // Contato criado e contato colocado na etapa sao coisas diferentes: sem etapa
      // valida ele existe em contacts mas NAO entra em contacts_stage, e disparo por
      // funil nunca vai alcancar. Antes isso virava so um console.warn no servidor e
      // a linha ainda era contada como importada — a importacao mentia.
      if (etapa) {
        const result = await insertInKanbanStage(etapa, sector, numero, schema);
        if (result === null) {
          semEtapa++;
          etapasNaoEncontradas.add(String(etapa));
          console.warn(`Contato ${numero} ficou fora do funil: etapa "${etapa}" nao existe em "${sector}".`);
        }
      } else {
        semEtapa++;
      }
      imported++;
    } catch (error) {
      console.error(`Erro ao processar linha: ${JSON.stringify(row)}`, error);
      skipped++;
    }
  }
  return {
    imported,
    skipped,
    semEtapa,
    etapasNaoEncontradas: [...etapasNaoEncontradas],
  };
};

module.exports = {
  getInformationFromExcel
};