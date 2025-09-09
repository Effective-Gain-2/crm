import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import axios from 'axios';
import './assets/style.css';

function ChangeQueueModal({ show, onHide, theme, selectedChat, schema, url, onTransfer }) {
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [queues, setQueues] = useState([]);


  useEffect(() => {
    if (show && schema && url) {
      axios.get(`${url}/queue/get-all-queues/${schema}`,
        {
      withCredentials: true
    })
        .then(res => setQueues(res.data.result || []))
        .catch(() => setQueues([]));
    }
  }, [show, schema, url]);

  useEffect(() => {
    if (show) {
      setSelectedQueue(null);
    }
  }, [show]);

  const handleChangeQueue = async () => {
    if (!selectedQueue) return;
    await onTransfer(selectedQueue.id);
    setSelectedQueue(null);
    onHide();
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
          Alterar Fila
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
                   border: `2px solid ${selectedQueue?.id === queue.id ? queue.color : 'var(--border-color-' + theme + ')'}`,
                   backgroundColor: selectedQueue?.id === queue.id ? `${queue.color}15` : 'transparent',
                   cursor: 'pointer',
                   marginBottom: 8,
                   padding: 12,
                   borderRadius: 8,
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   minHeight: 45,
                   transition: 'all 0.2s ease',
                   boxShadow: selectedQueue?.id === queue.id ? `0 2px 8px ${queue.color}30` : 'none'
                 }}
               >
                 <span className="fw-medium">{queue.name}</span>
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


      </Modal.Body>

      <Modal.Footer className={`modal-footer-${theme} bg-form-${theme}`}>
        <Button 
          variant="secondary" 
          onClick={onHide}
          className={`btn-2-${theme}`}
        >
          Cancelar
        </Button>
                 <Button
           variant="primary"
           onClick={handleChangeQueue}
           disabled={!selectedQueue}
           className={`btn-2-${theme}`}
           style={{ backgroundColor: !selectedQueue ? 'transparent' : undefined }}
         >
           Alterar Fila
         </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ChangeQueueModal;