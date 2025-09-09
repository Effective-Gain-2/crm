import React, { useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';

function WhatsappFilasModal({ theme, show, onHide, contato, onQueueChange }) {
  const { showSuccess } = useToast();
  const [filas, setFilas] = useState([])
  const [todasFilas, setTodasFilas] = useState([])
  const [filaAtual, setFilaAtual] = useState(null)
  const [loading, setLoading] = useState(false)
  const userData = JSON.parse(localStorage.getItem('user')); 
  const schema = userData?.schema
  const url = process.env.REACT_APP_URL;

  useEffect(()=>{
    const handleQueues = async()=>{
      if (!contato) return;
      
      setLoading(true);
      try{  
        // Buscar fila atual do contato
        const responseFilaAtual = await axios.get(`${url}/queue/get-conn-queues/${contato.queue_id}/${schema}`,
        {
      withCredentials: true
    })
        const filaAtualData = Array.isArray(responseFilaAtual.data.result) 
          ? responseFilaAtual.data.result[0] 
          : responseFilaAtual.data.result;
        setFilaAtual(filaAtualData);
        
        // Buscar todas as filas disponíveis
        const responseTodasFilas = await axios.get(`${url}/queue/get-all-queues/${schema}`,
        {
      withCredentials: true
    })
        setTodasFilas(responseTodasFilas.data.result || []);
      }catch(error){
        console.error(error)
      } finally {
        setLoading(false);
      }
    }
    handleQueues()
  }, [contato, schema])

  const trocarFila = async (novaFilaId) => {
    if (!contato || !novaFilaId) return;
    
    setLoading(true);
    try {
      const response = await axios.post(`${url}/connection/setConnQueue`, {
        connection_id: contato.id,
        queue_id: novaFilaId,
        schema: schema
      },
        {
      withCredentials: true
    });

      if (response.data.success) {
        const novaFila = todasFilas.find(f => f.id === novaFilaId);
        setFilaAtual(novaFila);
        
        // Notificar o componente pai sobre a mudança
        if (onQueueChange) {
          onQueueChange(contato.id, novaFilaId, novaFila);
        }
        
      }
    } catch (error) {
      console.error('Erro ao trocar fila:', error);
    } finally {
      setLoading(false);
    }
  };

  const desvincularFila = async () => {
    if (!contato) return;
    
    setLoading(true);
    try {
      const response = await axios.post(`${url}/connection/setConnQueue`, {
        connection_id: contato.id,
        queue_id: null,
        schema: schema
      },
        {
      withCredentials: true
    });

      if (response.data.success) {
        setFilaAtual(null);
        
        // Notificar o componente pai sobre a mudança
        if (onQueueChange) {
          onQueueChange(contato.id, null, null);
        }
        
        // Feedback visual
        showSuccess('Contato desvinculado da fila com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao desvincular fila:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      backdrop="static"
      style={{ zIndex: 1060 }}
    >
      <Modal.Header closeButton style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <div className="d-flex align-items-center gap-3">
          <i className={`bi bi-diagram-3 header-text-${theme}`}></i>
          <h5 className={`modal-title header-text-${theme}`}>Filas do Contato</h5>
        </div>
      </Modal.Header>

      <Modal.Body style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <div className="d-flex flex-column gap-3">
          <div>
            <button
              type="button"
              className={`btn btn-2-${theme}`}
              onClick={onHide}
            >
              <i className="bi bi-arrow-left me-2"></i>
              Voltar
            </button>
          </div>

          <div className={`card-subtitle-${theme} mb-2`}>
            Contato: <strong>{contato?.name}</strong>
          </div>

          {loading ? (
            <div className="text-center py-3">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Carregando...</span>
              </div>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {/* Fila Atual */}
              <div className={`card card-${theme}`}>
                <div className="card-header">
                  <h6 className={`header-text-${theme} mb-0`}>
                    <i className="bi bi-folder me-2"></i>
                    Fila Atual
                  </h6>
                </div>
                <div className="card-body">
                  {filaAtual ? (
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <span className={`card-subtitle-${theme} fw-bold`}>{filaAtual.name}</span>
                        {filaAtual.color && (
                          <span 
                            className="ms-2 px-2 py-1 rounded"
                            style={{ 
                              backgroundColor: filaAtual.color,
                              color: 'white',
                              fontSize: '0.8rem'
                            }}
                          >
                            {filaAtual.color}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm delete-btn"
                        onClick={desvincularFila}
                        disabled={loading}
                      >
                        <i className="bi bi-trash-fill me-1"></i>
                        Desvincular
                      </button>
                    </div>
                  ) : (
                    <span className={`card-subtitle-${theme}`}>
                      Nenhuma fila vinculada
                    </span>
                  )}
                </div>
              </div>

              {/* Trocar Fila */}
              <div className={`card card-${theme}`}>
                <div className="card-header">
                  <h6 className={`header-text-${theme} mb-0`}>
                    <i className="bi bi-arrow-repeat me-2"></i>
                    Trocar Fila
                  </h6>
                </div>
                <div className="card-body">
                  <div className="d-flex gap-2 flex-wrap">
                    {todasFilas.map((fila) => (
                      <button
                        key={fila.id}
                        type="button"
                        className={`btn btn-sm ${filaAtual?.id === fila.id ? `btn-1-${theme}` : `btn-2-${theme}`}`}
                        onClick={() => trocarFila(fila.id)}
                        disabled={loading || filaAtual?.id === fila.id}
                      >
                        {fila.name}
                        {filaAtual?.id === fila.id && (
                          <i className="bi bi-check-circle ms-1"></i>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <button type="button" className={`btn btn-2-${theme}`} onClick={onHide}>
          Fechar
        </button>
      </Modal.Footer>
    </Modal>
  );
}

export default WhatsappFilasModal;