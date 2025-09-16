import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import axios from 'axios';

function ResumoModal({ theme, show, onHide, chatId }) {
  const [resumo, setResumo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;


  // Carregar resumo existente quando o modal abrir
  useEffect(() => {
    if (show && chatId) {
      loadResumo();
    }
  }, [show, chatId]);

  const loadResumo = async () => {
    try {
      setIsLoading(true);
     
      const response = await axios.get(`${url}/report/resumo/${chatId}/${schema}`, {
        withCredentials: true
      });
      
      if (response.data.success && response.data.data) {
        const resumoData = response.data.data;
        // Garantir que created_at seja um timestamp válido
        if (resumoData.created_at) {
          resumoData.created_at = typeof resumoData.created_at === 'string' 
            ? Number(resumoData.created_at) 
            : resumoData.created_at;
        }
        setResumo(resumoData);
      } else {
        setResumo('');
      }
    } catch (error) {
      console.error('Erro ao carregar resumo:', error);
      setResumo('Erro ao carregar resumo.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateResumo = async () => {
    try {
      setIsGenerating(true);
      const response = await axios.post(`${url}/report/generate-resumo`, {
        chat_id: chatId,
        schema: schema
      }, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setResumo({
          value: response.data.data,
          created_at: Date.now()
        });
      } else {
        console.error('Erro ao gerar resumo:', response.data.message);
      }
      
     
      
    } catch (error) {
      console.error('Erro ao gerar resumo:', error);
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setResumo('');
    setIsLoading(false);
    setIsGenerating(false);
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton className={`bg-form-${theme}`}>
        <div className="d-flex justify-content-between align-items-center w-100">
          <Modal.Title className={`header-text-${theme}`}>
            Resumo da Conversa
          </Modal.Title>
          <Button
            onClick={generateResumo}
            disabled={isGenerating || !chatId}
            className={`btn-1-${theme} btn-sm`}
            style={{ minWidth: '120px' }}
          >
            {isGenerating ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Gerando...
              </>
            ) : (
              <>
                <i className="bi bi-arrow-clockwise me-2"></i>
                Gerar Resumo
              </>
            )}
          </Button>
        </div>
      </Modal.Header>
      
      <Modal.Body className={`bg-form-${theme}`}>
        <Form.Group>
          <Form.Label className={`header-text-${theme}`}>
            Último Resumo
          </Form.Label>
          <br></br>
          <small>Data do resumo: {resumo.created_at ? (() => {
            try {
              return new Date(resumo.created_at).toLocaleString('pt-br');
            } catch (e) {
              return 'Data inválida';
            }
          })() : 'N/A'}</small>
          {isLoading ? (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
              <Spinner animation="border" className={`text-${theme === 'dark' ? 'light' : 'dark'}`} />
            </div>
          ) : (
            <Form.Control
              as="textarea"
              rows={12}
              value={resumo.value}
              readOnly
              className={`input-${theme}`}
              style={{ resize: 'none' }}
              placeholder="Nenhum resumo disponível..."
            />
          )}
        </Form.Group>
      </Modal.Body>
      
      <Modal.Footer className={`bg-form-${theme}`}>
        <Button onClick={handleClose} className={`btn-2-${theme}`}>
          Fechar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ResumoModal;
