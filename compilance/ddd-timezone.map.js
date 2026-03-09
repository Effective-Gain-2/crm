const DDD_MAP = { 

  // Acre 

  '68':'America/Rio_Branco', 

  // Amazonas / Roraima 

  '92':'America/Manaus','97':'America/Manaus', 

  '95':'America/Boa_Vista', 

  // Pará / Amapá 

  '91':'America/Belem','93':'America/Belem','94':'America/Belem', 

  '96':'America/Belem', 

  // Rondônia 

  '69':'America/Porto_Velho', 

  // Mato Grosso do Sul / Mato Grosso 

  '67':'America/Campo_Grande', 

  '65':'America/Cuiaba','66':'America/Cuiaba', 

  // Tocantins / Goiás / DF / Bahia oeste 

  '63':'America/Araguaina', 

  '61':'America/Sao_Paulo','62':'America/Sao_Paulo','64':'America/Sao_Paulo', 

  // Nordeste 

  '71':'America/Bahia','73':'America/Bahia','74':'America/Bahia', 

  '75':'America/Bahia','77':'America/Bahia', 

  '79':'America/Maceio', 

  '82':'America/Maceio', 

  '83':'America/Fortaleza', 

  '84':'America/Fortaleza', 

  '85':'America/Fortaleza','88':'America/Fortaleza', 

  '86':'America/Fortaleza','89':'America/Fortaleza', 

  '87':'America/Recife', 

  '81':'America/Recife', 

  '98':'America/Fortaleza','99':'America/Fortaleza', 

  // Sul / Sudeste — Brasília time 

  '11':'America/Sao_Paulo','12':'America/Sao_Paulo','13':'America/Sao_Paulo', 

  '14':'America/Sao_Paulo','15':'America/Sao_Paulo','16':'America/Sao_Paulo', 

  '17':'America/Sao_Paulo','18':'America/Sao_Paulo','19':'America/Sao_Paulo', 

  '21':'America/Sao_Paulo','22':'America/Sao_Paulo','24':'America/Sao_Paulo', 

  '27':'America/Sao_Paulo','28':'America/Sao_Paulo', 

  '31':'America/Sao_Paulo','32':'America/Sao_Paulo','33':'America/Sao_Paulo', 

  '34':'America/Sao_Paulo','35':'America/Sao_Paulo','37':'America/Sao_Paulo', 

  '38':'America/Sao_Paulo', 

  '41':'America/Sao_Paulo','42':'America/Sao_Paulo','43':'America/Sao_Paulo', 

  '44':'America/Sao_Paulo','45':'America/Sao_Paulo','46':'America/Sao_Paulo', 

  '47':'America/Sao_Paulo','48':'America/Sao_Paulo','49':'America/Sao_Paulo', 

  '51':'America/Sao_Paulo','53':'America/Sao_Paulo','54':'America/Sao_Paulo', 

  '55':'America/Sao_Paulo', 

}; 

 

function getDDDTimezone(ddd) { 

  return DDD_MAP[ddd] || 'America/Sao_Paulo'; 

} 

 

module.exports = { getDDDTimezone }; 