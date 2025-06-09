import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import './assets/style.css';

function ChangeQueueModal({ show, onHide, theme, selectedChat }) {
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [countdown, setCountdown] = useState(10);
  const [isConfirming, setIsConfirming] = useState(false);

  // Dados fictícios de filas
  const queues = [
    { id: 1, name: 'Suporte Técnico', color: '#FF5733' },
    { id: 2, name: 'Vendas', color: '#33FF57' },
    { id: 3, name: 'Financeiro', color: '#3357FF' },
    { id: 4, name: 'Atendimento', color: '#F333FF' },
    { id: 5, name: 'Pós-vendas', color: '#FF33A8' }
  ];

  useEffect(() => {
    let timer;
    if (show && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown, show]);

  // Reset countdown when modal opens
  useEffect(() => {
    if (show) {
      setCountdown(10);
    }
  }, [show]);

  const handleConfirm = () => {
    setIsConfirming(true);
    setCountdown(10);
  };

  const handleChangeQueue = () => {
    // Aqui você implementará a lógica para alterar a fila
    console.log('Alterando fila para:', selectedQueue);
    onHide();
  };

  return (
    <Modal
      show={show}
      onHide={() => {
        onHide();
      }}
      centered
      className={`modal-${theme}`}
    >
      <Modal.Header 
        closeButton 
        className={`modal-header-${theme} bg-form-${theme}`}
      >
        <Modal.Title
        className={`header-text-${theme}`}
        >Alterar Fila</Modal.Title>
      </Modal.Header>

      <Modal.Body className={`modal-body-${theme} bg-form-${theme}`}>
        {/* Informações do contato */}
        <div className="mb-4">
          <h6 className={`header-text-${theme}`}>Informações do Contato</h6>
          <div className={`input-${theme} p-3 rounded`} style={{ border: `1px solid var(--border-color-${theme})` }}>
            <p className="mb-1"><strong>Nome:</strong> {selectedChat?.contact_name || 'Sem nome'}</p>
            <p className="mb-0"><strong>Número:</strong> {selectedChat?.contact_phone || 'Não disponível'}</p>
          </div>
        </div>

        {/* Seleção de fila */}
        <div className="mb-4">
          <h6 className={`header-text-${theme}`}>Nova Fila</h6>
          <div className="queue-selector">
            {queues.map((queue) => (
              <div
                key={queue.id}
                className={`queue-option ${selectedQueue?.id === queue.id ? 'selected' : ''} input-${theme}`}
                onClick={() => setSelectedQueue(queue)}
                style={{
                  border: `2px solid ${queue.color}`,
                  backgroundColor: selectedQueue?.id === queue.id ? `${queue.color}20` : 'transparent'
                }}
              >
                <div 
                  className="queue-color-indicator"
                  style={{ backgroundColor: queue.color }}
                />
                <span>{queue.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Aviso */}
        <div 
        className={`alert d-flex justify-content-center`}
        style={{ 
            backgroundColor: 'transparent',
            border: `1px solid var(--error-color)`,
            color: `var(--error-color)`
         }}
        >
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          Atenção: Esta alteração não poderá ser desfeita.
        </div>

        {/* Botão de confirmação com contagem regressiva */}
        {isConfirming && (
          <div className="text-center mt-3">
            <Button
              variant="danger"
              disabled
              className="w-100"
            >
              Confirmar alteração em {countdown}s
            </Button>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className={`modal-footer-${theme} bg-form-${theme}`}>
        <Button 
          variant="secondary" 
          onClick={onHide}
          className={`btn-2-${theme}`}
        >
          Cancelar
        </Button>
        {!isConfirming ? (
          <Button
            style={{ backgroundColor: 'transparent' }}
            variant="primary"
            onClick={handleConfirm}
            disabled={!selectedQueue || countdown > 0}
            className={`btn-2-${theme}`}
          >
            {countdown > 0 ? `Aguarde ${countdown}s` : 'Alterar Fila'}
          </Button>
        ) : countdown === 0 && (
          <Button
            variant="primary"
            onClick={handleChangeQueue}
            className={`btn-2-${theme}`}
          >
            Confirmar Alteração
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}

export default ChangeQueueModal; 