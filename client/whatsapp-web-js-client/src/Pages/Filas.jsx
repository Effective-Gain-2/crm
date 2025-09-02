import React, { useState, useEffect } from 'react';
import * as bootstrap from 'bootstrap';
import axios from 'axios';
import NewQueueModal from './modalPages/Filas_novaFila';
import DeleteQueueModal from './modalPages/Filas_delete';
import FilasWebhookModal from './modalPages/Filas_webhook';
import {socket} from '../socket'
import EditQueueModal from './modalPages/Filas_editarFila';
import FilasAssistenteModal from './modalPages/Filas_assistente';

function FilaPage({ theme }) {
  const [filas, setFilas] = useState([]);
  const [fila, setFila] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [showAssistantModal, setShowAssistantModal] = useState(false)
  const [selectedFila, setSelectedFila] = useState(null);
  const userData = JSON.parse(localStorage.getItem('user'));
  const [socketInstance] = useState(socket)  
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;

  useEffect(() => {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(el => {
      if (el) {
        return new bootstrap.Tooltip(el);
      }
      return null;
    });

    return () => {
      tooltipList.forEach(t => {
        if (t && t._element && t._element.closest) {
          t.dispose();
        }
      });
    };
  }, [filas]);

  useEffect(() => {
  const fetchFilas = async () => {
    try {
      const response = await axios.get(`${url}/queue/get-all-queues/${schema}`,
        {
      withCredentials: true
    });
      setFilas(response.data.result || []);
    } catch (error) {
      console.error('Erro ao buscar filas:', error);
    }
  };
  fetchFilas();
}, [url, schema]);

useEffect(() => {
  if (socketInstance) {
    socketInstance.emit('join', `schema_${userData.schema}`);
    
    const handleNewQueue = (queue) => {
      setFilas(prevFilas => [...prevFilas, queue]);
    };
    
    socketInstance.on('new_queue', handleNewQueue);
    
    return () => {
      socketInstance.off('new_queue', handleNewQueue);
    };
  }
}, [socketInstance, userData.schema]);

  const filasFiltradas = filas.filter(fila => {
    const nome = fila?.name || '';
    return nome.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleWebhookSave = (filaId, webhookUrl, webhookEnabled) => {
    setFilas(prevFilas => 
      prevFilas.map(fila => 
        fila.id === filaId 
          ? { ...fila, webhook_url: webhookUrl, webhook_enabled: webhookEnabled }
          : fila
      )
    );
  };

  const handleQueueDeleted = (queueId) => {
    setFilas(prevFilas => prevFilas.filter(fila => fila.id !== queueId));
  };

  return (
    <div className="h-100 w-100 mx-2 pt-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className={`mb-0 ms-3 header-text-${theme}`} style={{ fontWeight: 400 }}>Filas</h2>

        <div className="input-group" style={{ width: '40%' }}>
          <input
            type="text"
            className={`form-control input-${theme}`}
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button 
            className={`btn btn-1-${theme} d-flex gap-2`}
            data-bs-toggle="modal"
            data-bs-target="#NewQueueModal"
          >
            <i className="bi-plus-lg"></i>
            Nova Fila
          </button>        
        </div>
      </div>

      <div className="row g-3" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
        {filasFiltradas.map((fila) => (
          <div key={fila.id} className="col-md-2 col-lg-2 col-xl-2">
            <div className={`card h-100 card-${theme}`} style={{ minHeight: '120px' }}>
              <div className="card-body d-flex flex-column justify-content-between p-3">
                <div>
                  <h6 className={`card-title mb-2 header-text-${theme}`} style={{ fontSize: '0.9rem' }}>
                    {fila.name}
                  </h6>
                  <small className={`card-subtitle-${theme}`}>
                    {fila.distribution ? 'Distribuição automática' : 'Distribuição manual'}
                  </small>
                </div>
                
                <div className="d-flex gap-1 mt-2 justify-content-center">
                  <button
                    className={`btn btn-sm btn-2-${theme}`}
                    data-bs-toggle="tooltip"
                    title="Editar"
                    onClick={() => {
                      setSelectedFila(fila);
                      const modal = new bootstrap.Modal(document.getElementById('EditQueueModal'));
                      modal.show();
                    }}
                  >
                    <i className="bi bi-pencil-fill" style={{ fontSize: '0.8rem' }}></i>
                  </button>

                  <button
                    className={`btn btn-sm btn-2-${theme}`}
                    data-bs-toggle="tooltip"
                    title="Webhook"
                    onClick={() => {
                      setSelectedFila(fila);
                      setShowWebhookModal(true);
                    }}
                  >
                    <i className="bi bi-link-45deg" style={{ fontSize: '0.8rem' }}></i>
                  </button>

                  <button
                   className={`btn btn-sm btn-2-${theme}`}
                   title='Assistente GPT'
                   onClick={()=>{
                    setSelectedFila(fila)
                    setShowAssistantModal(true)
                   }}
                   >
                    <i className='bi bi-robot' style={{ fontSize: '0.8rem' }}></i>
                  </button>

                  <button
                    className="btn btn-sm delete-btn"
                    data-bs-toggle="tooltip"
                    title="Excluir"
                    onClick={() => {
                      const modal = new bootstrap.Modal(document.getElementById('DeleteQueueModal'));
                      modal.show();
                      setFila(fila)
                    }}
                  >
                    <i className="bi bi-trash-fill" style={{ fontSize: '0.8rem' }}></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <NewQueueModal theme={theme}/>
                 <DeleteQueueModal theme={theme} fila={fila} onQueueDeleted={handleQueueDeleted}/>
        <EditQueueModal theme={theme} fila={selectedFila}/>
      </div>

      {showWebhookModal && selectedFila && (
        <FilasWebhookModal 
          theme={theme} 
          show={showWebhookModal}
          onHide={() => {
            setShowWebhookModal(false);
            setSelectedFila(null);
          }}
          fila={selectedFila} 
          onSave={handleWebhookSave}
        />
      )}
    {showAssistantModal && selectedFila && (
      <FilasAssistenteModal
      theme={theme}
      show={showAssistantModal}
      onClose={()=>{
        setShowAssistantModal(false)
        setSelectedFila(null)
      }}
      fila={selectedFila}
      >
      </FilasAssistenteModal>
    )}
    </div>
  );
}

export default FilaPage;