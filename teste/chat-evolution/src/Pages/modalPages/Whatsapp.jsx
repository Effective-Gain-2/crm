import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import WhatsappNovoContatoModal from './Whatsapp_novoContato';
import WhatsappDeleteModal from './Whatsapp_delete';
import WhatsappFilasModal from './Whatsapp_filas';
import axios from 'axios';

function WhatsappModal({ theme, show, onHide }) {
  const [contatos, setContatos] = useState([]);
  const [selectedContato, setSelectedContato] = useState(null);
  const [filas, setFilas] = useState([]);
  const [showNovoContatoModal, setShowNovoContatoModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUsuariosModal, setShowUsuariosModal] = useState(false);
  const userData = JSON.parse(localStorage.getItem('user')); 
  const schema = userData?.schema
  const url = process.env.REACT_APP_URL;

  useEffect(() => {
    const handleConns = async()=>{
      try{
        const response = await axios.get(`${url}/connection/get-all-connections/${schema}`)
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
      setContatos(contatos.filter(c => c.id !== contato.id));
    } catch (error) {
      console.error('Erro ao excluir contato:', error);
    } finally {
      setShowDeleteModal(false);
      setSelectedContato(null);
    }
  };

  const handleVerFilas = (contato) => {
    setSelectedContato(contato);
    setFilas([
      { nome: 'Fila Suporte', setor: 'Suporte', dataVinculacao: '2024-03-15T10:00:00' },
      { nome: 'Fila Vendas', setor: 'Vendas', dataVinculacao: '2024-03-16T11:30:00' }
    ]);
    setShowUsuariosModal(true);
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
                  <th className={`text-start px-3 py-2 header-text-${theme}`}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {contatos.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center px-3 py-2">
                      <span className={`card-subtitle-${theme}`}>Nenhum contato cadastrado.</span>
                    </td>
                  </tr>
                ) : (
                  contatos.map((contato) => (
                    <tr key={contato.id}>
                      <td className={`px-3 py-2 card-subtitle-${theme}`}>{contato.name}</td>
                      <td className={`px-3 py-2 card-subtitle-${theme}`}>{contato.number}</td>
                      <td className="px-3 py-2">
                        <div className="d-flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={`btn btn-sm btn-2-${theme}`}
                            data-bs-toggle="tooltip"
                            data-bs-placement="top"
                            title="Editar"
                            onClick={() => {
                              setSelectedContato(contato);
                              setShowNovoContatoModal(true);
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
                            onClick={() => handleVerFilas(contato)}
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
                              setSelectedContato(contato);
                              setShowDeleteModal(true);
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
            filas={filas} 
          />
        </div>
      )}
    </>
  );
}

export default WhatsappModal;
