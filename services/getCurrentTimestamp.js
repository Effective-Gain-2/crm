const getCurrentTimestamp = () => {
    return new Date().getTime(); 
};

const parseLocalDateTime = (dateTimeString) => {
  // Validação se a string existe
  if (!dateTimeString) {
    console.error('parseLocalDateTime: dateTimeString é undefined ou null');
    return Date.now(); // Retorna timestamp atual como fallback
  }
  
  try {
    // Primeiro tenta parsear como ISO string (formato do frontend)
    if (dateTimeString.includes('T') && dateTimeString.includes('-')) {
      const isoDate = new Date(dateTimeString);
      if (!isNaN(isoDate.getTime())) {
        return isoDate.getTime();
      }
    }
    
    // Se não for ISO, tenta o formato brasileiro (DD/MM/YYYY HH:mm:ss)
    const parts = dateTimeString.split(' ');
    
    if (parts.length < 2) {
      console.error('parseLocalDateTime: formato de data inválido, esperado DD/MM/YYYY HH:mm:ss ou ISO');
      return Date.now();
    }
    
    const [datePart, timePart] = parts;
    const dateComponents = datePart.split('/');
    const timeComponents = timePart.split(':');
    
    if (dateComponents.length < 3 || timeComponents.length < 2) {
      console.error('parseLocalDateTime: formato de data/hora inválido');
      return Date.now();
    }
    
    const [day, month, year] = dateComponents;
    const [hour, minute, second] = timeComponents;
    
    // Cria a data no timezone local
    const localDate = new Date(year, month - 1, day, hour, minute, second || 0);
    
    return localDate.getTime();
  } catch (error) {
    console.error('parseLocalDateTime: erro ao processar data:', error.message);
    return Date.now();
  }
};
  
module.exports = { getCurrentTimestamp, parseLocalDateTime };