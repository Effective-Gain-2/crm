const getCurrentTimestamp = () => {
    return new Date().getTime(); 
};

const parseLocalDateTime = (dateTimeString) => {
  return new Date(dateTimeString).getTime();
};
  
module.exports = { getCurrentTimestamp, parseLocalDateTime };