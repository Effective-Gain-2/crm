import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import axios from 'axios';
import './assets/style.css';

function ChatKanbanStageModal({ show, onHide, theme, selectedChat, schema, url, onTransfer }) {
  const [selectedFunil, setSelectedFunil] = useState('');
  const [selectedEtapa, setSelectedEtapa] = useState('');
  const [funis, setFunis] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Buscar funis disponíveis
  useEffect(() => {
    if (show && schema && url) {
      const fetchFunis = async () => {
        try {
          const response = await axios.get(`${url}/kanban/get-funis/${schema}`, {
            withCredentials: true
          });
          console.log('Resposta da API:', response.data);
          // A API retorna { name: ['funil1', 'funil2', ...] }
          const funisData = response.data?.name || [];
          setFunis(Array.isArray(funisData) ? funisData : []);
        } catch (error) {
          console.error('Erro ao buscar funis:', error);
          setFunis([]);
        }
      };
      fetchFunis();
    }
  }, [show, schema, url]);

  // Buscar etapas do funil selecionado
  useEffect(() => {
    if (show && selectedFunil && schema && url) {
      const fetchEtapas = async () => {
        try {
          const response = await axios.get(`${url}/kanban/get-stages/${selectedFunil.charAt(0).toLowerCase() + selectedFunil.slice(1)}/${schema}`, {
            withCredentials: true
          });
          setEtapas(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
          console.error('Erro ao buscar etapas:', error);
          setEtapas([]);
        }
      };
      fetchEtapas();
    } else {
      setEtapas([]);
    }
  }, [show, selectedFunil, schema, url]);

  // Resetar seleções quando o modal abrir
  useEffect(() => {
    if (show) {
      setSelectedFunil('');
      setSelectedEtapa('');
    }
  }, [show]);

  const handleTransfer = async () => {
    if (!selectedFunil || !selectedEtapa) return;
    console.log('Transferindo contato para etapa:', selectedEtapa);
    setIsLoading(true);
    try {
      await axios.put(`${url}/kanban/change-stage`,{
        chat_id: selectedChat.id,
        number: selectedChat.contact_phone || selectedChat.number,
        stage_id: selectedEtapa,
        schema: schema
      },{
        withCredentials: true
      })
      setSelectedFunil('');
      setSelectedEtapa('');
      onHide();
    } catch (error) {
      console.error('Erro ao transferir contato:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      className={`modal-${theme}`}
    >
      <Modal.Header 
        closeButton 
        className={`modal-header-${theme} bg-form-${theme}`}
      >
        <Modal.Title className={`header-text-${theme}`}>
          Enviar para Funil
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className={`modal-body-${theme} bg-form-${theme}`}>
        {/* Informações do contato */}
        <div className="mb-4">
          <h6 className={`header-text-${theme}`}>Informações do Contato</h6>
          <div className={`input-${theme} p-3 rounded`} style={{ border: `1px solid var(--border-color-${theme})` }}>
            <div className="d-flex align-items-center">
              <span className="fw-bold me-2">{selectedChat?.contact_name || 'Sem nome'}</span>
              <div className="vr mx-2" style={{ height: '20px', opacity: 0.6 }}></div>
              <span style={{ color: 'var(--text-color-' + theme + ')' }}>{selectedChat?.contact_phone || 'Não disponível'}</span>
            </div>
          </div>
        </div>

        {/* Seleção de funil */}
        <div className="mb-4">
          <h6 className={`header-text-${theme}`}>Escolher Funil</h6>
          <div className="funil-selector">
            {funis.map((funil) => (
              <div
                key={funil}
                className={`funil-option ${selectedFunil === funil ? 'selected' : ''} input-${theme}`}
                onClick={() => {
                  setSelectedFunil(funil);
                  setSelectedEtapa(''); // Reset etapa quando mudar funil
                }}
                style={{
                  border: `2px solid ${selectedFunil === funil ? 'var(--primary-color)' : 'var(--border-color-' + theme + ')'}`,
                  backgroundColor: selectedFunil === funil ? 'var(--primary-color)15' : 'transparent',
                  cursor: 'pointer',
                  marginBottom: 8,
                  padding: 12,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 45,
                  transition: 'all 0.2s ease',
                  boxShadow: selectedFunil === funil ? '0 2px 8px var(--primary-color)30' : 'none'
                }}
              >
                <span className="fw-medium">{funil}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Seleção de etapa */}
        {selectedFunil && (
          <div className="mb-4">
            <h6 className={`header-text-${theme}`}>Escolher Etapa</h6>
            <div className="etapa-selector">
              {etapas.map((etapa) => (
                <div
                  key={etapa.id}
                  className={`etapa-option ${selectedEtapa === etapa.id ? 'selected' : ''} input-${theme}`}
                  onClick={() => setSelectedEtapa(etapa.id)}
                  style={{
                    border: `2px solid ${selectedEtapa === etapa.id ? (etapa.color || 'var(--primary-color)') : 'var(--border-color-' + theme + ')'}`,
                    backgroundColor: selectedEtapa === etapa.id ? `${etapa.color || 'var(--primary-color)'}15` : 'transparent',
                    cursor: 'pointer',
                    marginBottom: 8,
                    padding: 12,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: 45,
                    transition: 'all 0.2s ease',
                    boxShadow: selectedEtapa === etapa.id ? `0 2px 8px ${etapa.color || 'var(--primary-color)'}30` : 'none'
                  }}
                >
                  <span className="fw-medium">{etapa.etapa}</span>
                  {etapa.color && (
                    <div 
                      style={{ 
                        width: 20, 
                        height: 20, 
                        backgroundColor: etapa.color, 
                        borderRadius: '50%',
                        border: '2px solid white'
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aviso */}
        <div 
          className={`alert d-flex justify-content-center`}
          style={{ 
            backgroundColor: 'transparent',
            border: `1px solid var(--warning-color)`,
            color: `var(--warning-color)`
          }}
        >
          <i className="bi bi-info-circle-fill me-2"></i>
          O contato será movido para a etapa selecionada do funil.
        </div>
      </Modal.Body>

      <Modal.Footer className={`modal-footer-${theme} bg-form-${theme}`}>
        <Button 
          variant="secondary" 
          onClick={onHide}
          className={`btn-2-${theme}`}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleTransfer}
          disabled={!selectedFunil || !selectedEtapa || isLoading}
          className={`btn-2-${theme}`}
          style={{ backgroundColor: (!selectedFunil || !selectedEtapa || isLoading) ? 'transparent' : undefined }}
        >
          {isLoading ? 'Enviando...' : 'Enviar para Funil'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ChatKanbanStageModal;
