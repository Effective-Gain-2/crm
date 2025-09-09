import React, { useState } from 'react';
import { Modal } from 'react-bootstrap';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';

function FilasWebhookModal({ theme, show, onHide, fila, onSave }) {
  const { showError } = useToast();
  const [webhookUrl, setWebhookUrl] = useState(fila?.webhook_url || '');
  const [webhookEnabled, setWebhookEnabled] = useState(fila?.webhook_enabled || false);
  const [isLoading, setIsLoading] = useState(false);
  const userData = JSON.parse(localStorage.getItem('user')); 
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;

  const handleSave = async () => {
    if (!webhookUrl.trim()) {
      showError('Por favor, insira uma URL de webhook válida');
      return;
    }

    setIsLoading(true);
    try {
      // Primeira chamada: atualizar URL do webhook
      const urlResponse = await axios.put(`${url}/queue/update-webhook-url`, {
        queue_id: fila.id,
        webhook_url: webhookUrl,
        schema: schema
      },
        {
      withCredentials: true
    });

      // Segunda chamada: atualizar status do webhook
      const statusResponse = await axios.put(`${url}/queue/toggle-webhook-status`, {
        queue_id: fila.id,
        status: webhookEnabled,
        schema: schema
      },
        {
      withCredentials: true
    });

      if (urlResponse.status === 200 && statusResponse.status === 200) {
        onSave(fila.id, webhookUrl, webhookEnabled);
        onHide();
      }
    } catch (error) {
      console.error('Erro ao salvar webhook:', error);
      showError('Erro ao salvar webhook. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      size="md" 
      centered
      backdrop="static"
      style={{ zIndex: 1070 }}
    >
      <Modal.Header closeButton style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <h5 className={`modal-title header-text-${theme} mb-0`}>Webhook</h5>
      </Modal.Header>

      <Modal.Body style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <div className="mb-3">
          <label className={`form-label header-text-${theme}`}>
            Fila: <strong>{fila?.name}</strong>
          </label>
        </div>
        
        <div className="mb-3">
          <label htmlFor="webhookUrl" className={`form-label header-text-${theme}`}>
            URL do Webhook
          </label>
          <div className="input-group">
            <span className={`input-group-text igt-${theme}`}>
              <i className="bi bi-link-45deg"></i>
            </span>
            <input
              type="url"
              className={`form-control input-${theme}`}
              id="webhookUrl"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://exemplo.com/webhook"
              autoComplete="off"
              disabled={isLoading}
            />
          </div>
          <div className="form-text">
            <span className={`card-subtitle-${theme}`}>
              Insira a URL onde os dados desta fila serão enviados
            </span>
          </div>
        </div>

        <div className="mb-3 form-check form-switch">
          <input
            className={`form-check-input input-${theme}`}
            type="checkbox"
            id="webhookEnabled"
            checked={webhookEnabled}
            onChange={() => setWebhookEnabled(!webhookEnabled)}
            disabled={isLoading}
          />
          <label className={`form-check-label card-subtitle-${theme}`} htmlFor="webhookEnabled">
            Status do Webhook
          </label>
        </div>
      </Modal.Body>

      <Modal.Footer style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <button 
          type="button" 
          className={`btn btn-2-${theme}`} 
          onClick={onHide}
          disabled={isLoading}
        >
          Cancelar
        </button>
        <button 
          type="button" 
          className={`btn btn-1-${theme}`} 
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Salvando...
            </>
          ) : (
            'Salvar Webhook'
          )}
        </button>
      </Modal.Footer>
    </Modal>
  );
}

export default FilasWebhookModal; 