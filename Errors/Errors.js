
function returnForbiddenError(res) {
  return res.status(403).json({
    error: "Usuário não autenticado ou token inválido",
  });
}

module.exports = {
    returnForbiddenError
}