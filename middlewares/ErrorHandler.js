const errorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'Arquivo muito grande. Tamanho máximo permitido: 10MB'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Campo de arquivo inesperado'
      });
    }
    return res.status(400).json({
      error: `Erro no upload: ${err.message}`
    });
  }

  if (err.message === 'Tipo de arquivo não suportado! Apenas PDF, Excel e Word são permitidos.') {
    return res.status(400).json({
      error: err.message
    });
  }

  console.error(err);
  res.status(500).json({
    error: 'Erro interno do servidor'
  });
};

module.exports = errorHandler;
