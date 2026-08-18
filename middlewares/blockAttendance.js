// Bloqueia ações de atendimento (enviar texto/imagem/áudio) para o papel
// 'visualizador' — perfil que só vê os leads/conversas, sem atender cliente.
const blockAttendance = (req, res, next) => {
  if (req.auth?.role === 'visualizador') {
    return res.status(403).json({ error: 'Perfil de visualização não pode enviar mensagens' });
  }
  next();
};

module.exports = { blockAttendance };
