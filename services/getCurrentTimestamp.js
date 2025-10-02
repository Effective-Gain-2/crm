const getCurrentTimestamp = () => {
    return new Date().getTime(); 
};

const parseLocalDateTime = (dateTimeString) => {
  // Parse da string de data/hora no formato brasileiro (DD/MM/YYYY HH:mm:ss)
  // e converte para timestamp considerando timezone local
  const [datePart, timePart] = dateTimeString.split(' ');
  const [day, month, year] = datePart.split('/');
  const [hour, minute, second] = timePart.split(':');
  
  // Cria a data no timezone local
  const localDate = new Date(year, month - 1, day, hour, minute, second || 0);
  
  return localDate.getTime();
};
  
module.exports = { getCurrentTimestamp, parseLocalDateTime };