const fs = require('fs');
const path = require('path');
const pool = require('../db/queries');

const documentsFolder = path.join(__dirname, '..', 'uploads', 'documents');

const ensureDocumentsFolder = () => {
  if (!fs.existsSync(documentsFolder)) {
    fs.mkdirSync(documentsFolder, { recursive: true });
  }
};

exports.uploadDocument = async (documentData) => {
  try {
    ensureDocumentsFolder();
    
    const { title, description, category, fileName, originalName, fileSize, mimeType } = documentData;
    
    const query = `
      INSERT INTO documents (title, description, category, file_name, original_name, file_size, mime_type, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `;
    
    const values = [title, description, category, fileName, originalName, fileSize, mimeType];
    const result = await pool.query(query, values);
    
    return result.rows[0];
  } catch (error) {
    throw new Error(`Erro ao salvar documento: ${error.message}`);
  }
};

exports.getDocuments = async ({ category, limit, offset }) => {
  try {
    let query = 'SELECT * FROM documents';
    let values = [];
    let paramCount = 0;
    
    if (category) {
      query += ` WHERE category = $${++paramCount}`;
      values.push(category);
    }
    
    query += ' ORDER BY created_at DESC';
    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    values.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    throw new Error(`Erro ao buscar documentos: ${error.message}`);
  }
};

exports.deleteDocument = async (id) => {
  try {
    const query = 'SELECT file_name FROM documents WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Documento não encontrado');
    }
    
    const fileName = result.rows[0].file_name;
    const filePath = path.join(documentsFolder, fileName);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    await pool.query('DELETE FROM documents WHERE id = $1', [id]);
    
    return true;
  } catch (error) {
    throw new Error(`Erro ao deletar documento: ${error.message}`);
  }
};
