const { uploadDocument, getDocuments, deleteDocument } = require('../services/DocumentService');

exports.uploadDocument = async (req, res) => {
  try {
    const { title, description, category } = req.body;
    const filePath = req.file.path;
    const fileName = req.file.filename;
    const originalName = req.file.originalname;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;

    const document = await uploadDocument({
      title,
      description,
      category,
      filePath,
      fileName,
      originalName,
      fileSize,
      mimeType
    });

    res.status(200).json({
      success: true,
      message: 'Documento enviado com sucesso!',
      document
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao enviar documento.' });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const { category, limit = 50, offset = 0 } = req.query;
    const documents = await getDocuments({ category, limit, offset });
    
    res.status(200).json({
      success: true,
      documents
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar documentos.' });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteDocument(id);
    
    res.status(200).json({
      success: true,
      message: 'Documento deletado com sucesso!'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao deletar documento.' });
  }
};
