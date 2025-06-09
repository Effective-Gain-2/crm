import React, { useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useEffect } from 'react';
import axios from 'axios';

function WhatsappFilasModal({ theme, show, onHide, contato }) {
  const [filas, setFilas] = useState([])
  const userData = JSON.parse(localStorage.getItem('user')); 
  const schema = userData?.schema
  const url = process.env.REACT_APP_URL;

  useEffect(()=>{
    const handleQueues = async()=>{
      try{  
        const response = await axios.get(`${url}/queue/get-conn-queues/${contato.queue_id}/${schema}`)
        setFilas(Array.isArray(response.data.result)?response.data.result:[response.data.result])
      }catch(error){
        console.error(error)
      }
    }
    handleQueues()
  }, [contato, schema])

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

          <div className="table-responsive">
            <table className={`custom-table-${theme} align-middle w-100`}>
              <thead>
                <tr>
                  <th className={`text-start px-3 py-2 header-text-${theme}`}>Nome da Fila</th>
                  <th className={`text-start px-3 py-2 header-text-${theme}`}>Setor</th>
                  <th className={`text-start px-3 py-2 header-text-${theme}`}>Data de Vinculação</th>
                  <th className={`text-start px-3 py-2 header-text-${theme}`}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filas.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center px-3 py-2">
                      <span className={`card-subtitle-${theme}`}>
                        Nenhuma fila vinculada.
                      </span>
                    </td>
                  </tr>
                ) : (
                  filas.map((fila, index) => (
                    <tr key={index}>
                      <td className={`px-3 py-2 card-subtitle-${theme}`}>{fila.name}</td>
                      <td className={`px-3 py-2 card-subtitle-${theme}`}>{fila.setor}</td>
                      <td className={`px-3 py-2 card-subtitle-${theme}`}>
                        {new Date(fila.dataVinculacao).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="btn btn-sm delete-btn"
                          data-bs-toggle="tooltip"
                          data-bs-placement="top"
                          title="Remover da Fila"
                        >
                          <i className="bi bi-trash-fill"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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