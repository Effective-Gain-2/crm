import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import WhatsappNovoContatoModal from './Whatsapp_novoContato';
import WhatsappDeleteModal from './Whatsapp_delete';
import WhatsappFilasModal from './Whatsapp_filas';
import { useToast } from '../../contexts/ToastContext';

import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

function WhatsappModal({ theme, show, onHide }) {
  const [contatos, setContatos] = useState([]);
  const [selectedContato, setSelectedContato] = useState(null);
  const [filas, setFilas] = useState([]);
  const [showNovoContatoModal, setShowNovoContatoModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUsuariosModal, setShowUsuariosModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);
  const { showError, showSuccess } = useToast();
  

  const userData = useAuth(); 
  const schema = userData?.schema
  const url = process.env.REACT_APP_URL;

  useEffect(() => {
    const handleConns = async()=>{
      try{
        const response = await axios.get(`${url}/connection/get-all-connections-status/${schema}`,
        {
      withCredentials: true
    })
        setContatos(Array.isArray([response.data])?response.data:[response.data]);
      }catch(error){
        console.error(error)
      }
    }
    handleConns()
  }, []);

  const handleNovoContato = (novoContato) => {
    setContatos([...contatos, { ...novoContato, id: Date.now(), status: 'conectado' }]);
    setShowNovoContatoModal(false);
  };

  const handleDelete = (contato) => {
    try {
      setContatos(contatos.filter(c => c.connection.id !== contato.connection.id));
    } catch (error) {
      console.error('Erro ao excluir contato:', error);
    } finally {
      setShowDeleteModal(false);
      setSelectedContato(null);
    }
  };

  const handleVerFilas = (contato) => {
    setSelectedContato(contato);
    setShowUsuariosModal(true);
  };

  const handleQueueChange = (contatoId, novaFilaId, novaFila) => {
    // Atualizar o contato na lista com a nova fila
    setContatos(prevContatos => 
      prevContatos.map(contato => 
        contato.id === contatoId 
          ? { ...contato, queue_id: novaFilaId }
          : contato
      )
    );
  };

  const handleReconnect = async (contato) => {
    try {
      if (!contato.connection) {
        showError('Dados do contato não encontrados');
        return;
      }
      
      setSelectedContato(contato);
      setShowQRModal(true);
      
      const response = await axios.get(`${url}/evo/generate-qrcode/${contato.connection.name}`, {}, { withCredentials: true });
      if(response.data.data.error){
        showError('Erro ao gerar QRcode, favor entrar em contato com o suporte')
      }
      setQrCodeData(response.data.data.base64);
      
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      showError('Erro ao gerar QRcode, favor entrar em contato com o suporte')
    }
  };



  return (
    <>
      <Modal 
        show={show} 
        onHide={onHide} 
        size="lg" 
        centered
        backdrop="static"
        style={{ zIndex: 1050 }}
      >
        <Modal.Header closeButton style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <div className="d-flex align-items-center gap-3">
            <i className={`bi bi-whatsapp header-text-${theme}`}></i>
            <h5 className={`modal-title header-text-${theme} mb-0`}>Gerenciar Contatos WhatsApp</h5>
          </div>
        </Modal.Header>

        <Modal.Body style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <div className="d-flex justify-content-end mb-3">
            <button
              type="button"
              className={`btn btn-1-${theme}`}
              onClick={() => setShowNovoContatoModal(true)}
            >
              <i className="bi bi-plus-lg me-2"></i> Novo Contato
            </button>
          </div>

          <div className="table-responsive" style={{ maxHeight: 'calc(100vh - 250px)' }}>
            <table className={`custom-table-${theme} align-middle w-100`}>
              <thead>
                <tr>
                  <th className={`text-start px-3 py-2 header-text-${theme}`}>Nome</th>
                  <th className={`text-start px-3 py-2 header-text-${theme}`}>Telefone</th>
                  <th className={`text-center px-3 py-2 header-text-${theme}`}>Status</th>
                  <th className={`text-start px-3 py-2 header-text-${theme}`}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {contatos.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center px-3 py-2">
                      <span className={`card-subtitle-${theme}`}>Nenhum contato cadastrado.</span>
                    </td>
                  </tr>
                ) : (
                  contatos.map((contato) => (
                    <tr key={contato.connection?.id || contato.id}>
                      <td className={`px-3 py-2 card-subtitle-${theme}`}>{contato.connection?.label || contato.connection?.name || 'N/A'}</td>
                      <td className={`px-3 py-2 card-subtitle-${theme}`}>{contato.connection?.number || 'N/A'}</td>
                      <td className="px-3 py-2 text-center">
                        {contato.status === 'open' ? (
                          <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '1.2rem' }}></i>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            data-bs-toggle="tooltip"
                            data-bs-placement="top"
                            title="Reconectar via QR Code"
                            onClick={() => contato.connection && handleReconnect(contato)}
                          >
                            <i className="bi bi-qr-code"></i>
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="d-flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={`btn btn-sm btn-2-${theme}`}
                            data-bs-toggle="tooltip"
                            data-bs-placement="top"
                            title="Editar"
                            onClick={() => {
                              if (contato.connection) {
                                setSelectedContato(contato);
                                setShowNovoContatoModal(true);
                              }
                            }}
                          >
                            <i className="bi bi-pencil-fill"></i>
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm btn-2-${theme}`}
                            data-bs-toggle="tooltip"
                            data-bs-placement="top"
                            title="Filas"
                            onClick={() => contato.connection && handleVerFilas(contato)}
                          >
                            <i className="bi bi-diagram-3"></i>
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm delete-btn"
                            data-bs-toggle="tooltip"
                            data-bs-placement="top"
                            title="Excluir"
                            onClick={() => {
                              if (contato.connection) {
                                setSelectedContato(contato);
                                setShowDeleteModal(true);
                              }
                            }}
                          >
                            <i className="bi bi-trash-fill"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Modal.Body>

        <Modal.Footer style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <button type="button" className={`btn btn-2-${theme}`} onClick={onHide}>
            Fechar
          </button>
        </Modal.Footer>
      </Modal>

      {showNovoContatoModal && (
        <div style={{ zIndex: 1060 }}>
          <WhatsappNovoContatoModal 
            theme={theme} 
            show={showNovoContatoModal}
            onHide={() => {
              setShowNovoContatoModal(false);
              setSelectedContato(null);
            }}
            onSave={handleNovoContato} 
          />
        </div>
      )}
      
      {showDeleteModal && selectedContato && (
        <div style={{ zIndex: 1060 }}>
          <WhatsappDeleteModal 
            theme={theme} 
            show={showDeleteModal}
            onHide={() => {
              setShowDeleteModal(false);
              setSelectedContato(null);
            }}
            contato={selectedContato} 
            onDelete={handleDelete} 
          />
        </div>
      )}
      
      {showUsuariosModal && selectedContato && (
        <div style={{ zIndex: 1060 }}>
          <WhatsappFilasModal 
            theme={theme} 
            show={showUsuariosModal}
            onHide={() => {
              setShowUsuariosModal(false);
              setSelectedContato(null);
            }}
            contato={selectedContato} 
            onQueueChange={handleQueueChange}
          />
        </div>
      )}
      
      {showQRModal && selectedContato && (
        <Modal 
          show={showQRModal} 
          onHide={() => {
            setShowQRModal(false);
            setSelectedContato(null);
            setQrCodeData(null);
          }} 
          size="sm" 
          centered
          backdrop="static"
          style={{ zIndex: 1070 }}
        >
          <Modal.Header closeButton style={{ backgroundColor: `var(--bg-color-${theme})` }}>
            <div className="d-flex align-items-center gap-3">
              <i className={`bi bi-qr-code header-text-${theme}`}></i>
              <h5 className={`modal-title header-text-${theme} mb-0`}>
                Reconectar WhatsApp
              </h5>
            </div>
          </Modal.Header>

          <Modal.Body style={{ backgroundColor: `var(--bg-color-${theme})` }} className="text-center">
            <p className={`card-subtitle-${theme} mb-3`}>
              Escaneie o QR Code abaixo com seu WhatsApp para reconectar:
            </p>
            
            {qrCodeData ? (
              <div className="d-flex justify-content-center">
                <img 
                  src={qrCodeData} 
                  alt="QR Code para reconexão" 
                  style={{ maxWidth: '200px', maxHeight: '200px' }}
                  className="border rounded"
                />
              </div>
            ) : (
              <div className="d-flex justify-content-center">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Carregando...</span>
                </div>
              </div>
            )}
            
            <div className="mt-3">
              <small className={`text-muted`}>
                {selectedContato?.connection?.label || selectedContato?.connection?.name || 'N/A'}
              </small>
            </div>
          </Modal.Body>

          <Modal.Footer style={{ backgroundColor: `var(--bg-color-${theme})` }}>
            <button 
              type="button" 
              className={`btn btn-2-${theme}`} 
              onClick={() => {
                setShowQRModal(false);
                setSelectedContato(null);
                setQrCodeData(null);
              }}
            >
              Fechar
            </button>
          </Modal.Footer>
        </Modal>
      )}
      

    </>
  );
}

export default WhatsappModal;
