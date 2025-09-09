import React from 'react';
import { Modal } from 'react-bootstrap';
import axios from 'axios';

function WhatsappDeleteModal({ theme, show, onHide, contato, onDelete }) {
  const userData = JSON.parse(localStorage.getItem('user')); 
  const schema = userData?.schema
  const url = process.env.REACT_APP_URL;

  const handleDelete = async () => {
    try {
      const response = await axios.delete(`${url}/connection/delete/${contato.id}/${contato.name}/${schema}`,
        {
      withCredentials: true
    })
      onDelete(contato);
    } catch (error) {
      console.error(error)
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      backdrop="static"
      style={{ zIndex: 1060 }}
    >
      <Modal.Header closeButton style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <div className="d-flex align-items-center gap-3">
          <i className={`bi bi-trash header-text-${theme}`}></i>
          <h5 className={`modal-title header-text-${theme}`}>Confirmar Exclusão</h5>
        </div>
      </Modal.Header>

      <Modal.Body style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <p className={`card-subtitle-${theme} mb-1`}>
          Tem certeza que deseja excluir o contato <strong>{contato?.name}</strong>?
        </p>
        <p className="text-danger-true fw-bold mb-1">
          Nome:
          <span className={`fw-bold header-text-${theme} ms-1`}>
            {contato?.name}
          </span>
        </p>
        <p className="text-danger-true fw-bold mb-3">
          Número:
          <span className={`fw-bold header-text-${theme} ms-1`}>
            {contato?.number}
          </span>
        </p>
        <p className={`card-subtitle-${theme}`}>
          Esta ação não pode ser desfeita.
        </p>
      </Modal.Body>

      <Modal.Footer style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <button type="button" className={`btn btn-2-${theme}`} onClick={onHide}>
          Cancelar
        </button>
        <button type="button" className={`btn btn-1-${theme}`} onClick={handleDelete}>
          Excluir
        </button>
      </Modal.Footer>
    </Modal>
  );
}

WhatsappDeleteModal.defaultProps = {
  show: false,
  onHide: () => {},
  onDelete: () => {},
};

export default WhatsappDeleteModal; 