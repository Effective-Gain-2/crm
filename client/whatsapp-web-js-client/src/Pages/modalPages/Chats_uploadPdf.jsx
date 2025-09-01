import React, { useState, useRef } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';
import { getFileIcon } from '../../utils/fileUtils';

const DocumentUploadModal = ({ show, onHide, theme, selectedChat, schema, url }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const { showError, showSuccess } = useToast();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && isValidFileType(selectedFile)) {
      setFile(selectedFile);
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, '')); // Remove qualquer extensão
    } else if (selectedFile) {
      showError('Tipo de arquivo não suportado! Apenas PDF, Excel e Word são permitidos.');
      setFile(null);
    }
  };

  // Função para validar tipos de arquivo
  const isValidFileType = (file) => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
    ];
    return validTypes.includes(file.type);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  };

  const handleDragOut = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (isValidFileType(droppedFile)) {
        setFile(droppedFile);
        setTitle(droppedFile.name.replace(/\.[^/.]+$/, ''));
      } else {
        showError('Tipo de arquivo não suportado! Apenas PDF, Excel e Word são permitidos.');
      }
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      showError('Selecione um arquivo!');
      return;
    }

    if (!title.trim()) {
      showError('Digite um título para o documento!');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('category', category.trim());

    try {
      const response = await axios.post(`${url}/documents/upload`, formData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        showSuccess('Documento enviado com sucesso!');
        handleClose();
      } else {
        showError('Erro ao enviar documento. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao enviar documento:', error);
      showError(error.response?.data?.error || 'Erro ao enviar documento. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setFile(null);
    setUploading(false);
    setDragActive(false);
    onHide();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header 
        closeButton 
        className={`bg-${theme === 'light' ? 'light' : 'dark'} text-${theme === 'light' ? 'dark' : 'light'}`}
      >
        <Modal.Title>
          <i className="bi bi-file-earmark me-2"></i>
          Enviar Documento
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body className={`bg-${theme === 'light' ? 'light' : 'dark'} text-${theme === 'light' ? 'dark' : 'light'}`}>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Título do Documento *</Form.Label>
            <Form.Control
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título do documento"
              className={`input-${theme}`}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Descrição</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Digite uma descrição (opcional)"
              className={`input-${theme}`}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Categoria</Form.Label>
            <Form.Control
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Digite uma categoria (opcional)"
              className={`input-${theme}`}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Arquivo *</Form.Label>
            <div
              className={`border-2 border-dashed rounded p-4 text-center ${
                dragActive ? 'border-primary' : 'border-secondary'
              }`}
              style={{
                borderStyle: 'dashed',
                backgroundColor: dragActive ? 'var(--primary-color-light)' : 'transparent',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                minHeight: '120px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onDragEnter={handleDragIn}
              onDragLeave={handleDragOut}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <div className="text-center">
                  <i className={`bi ${getFileIcon(file.type, file.name).icon} ${getFileIcon(file.type, file.name).color === '#dc3545' ? 'text-danger' : 'text-success'}`} style={{ fontSize: '2rem' }}></i>
                  <p className="mb-1 mt-2 fw-bold">{file.name}</p>
                  <p className="mb-0 text-muted small">{formatFileSize(file.size)}</p>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    className="mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setTitle('');
                    }}
                  >
                    <i className="bi bi-trash me-1"></i>
                    Remover
                  </Button>
                </div>
              ) : (
                <div>
                  <i className="bi bi-cloud-upload text-muted" style={{ fontSize: '2rem' }}></i>
                  <p className="mb-1 mt-2">Clique ou arraste um arquivo (PDF, Excel, Word) aqui</p>
                  <p className="mb-0 text-muted small">Tamanho máximo: 10MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.doc,.docx"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </Form.Group>

          {selectedChat && (
            <Alert variant="info" className="mb-3">
              <i className="bi bi-info-circle me-2"></i>
              <strong>Chat selecionado:</strong> {selectedChat.contact_name || selectedChat.contact_phone}
            </Alert>
          )}
        </Form>
      </Modal.Body>
      
      <Modal.Footer className={`bg-${theme === 'light' ? 'light' : 'dark'} text-${theme === 'light' ? 'dark' : 'light'}`}>
        <Button 
          variant="secondary" 
          onClick={handleClose}
          disabled={uploading}
        >
          Cancelar
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSubmit}
          disabled={!file || !title.trim() || uploading}
        >
          {uploading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Enviando...
            </>
          ) : (
            <>
              <i className="bi bi-upload me-2"></i>
              Enviar Documento
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DocumentUploadModal;
