import React, { useEffect, useState } from 'react';
import axios from 'axios';

function DeleteQueueModal({ theme, fila, onDelete }) {
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData.schema;
  const [superUser, setSuperUser] = useState(null);
  
  const handleDelete = async()=>{
    try {
      await axios.delete(`${process.env.REACT_APP_URL}/queue/delete-queue/${fila.id}/${schema}`);
      onDelete(); 
    } catch (error) {
      console.error('Error deleting queue:', error);
    }
  }
  useEffect(() => {
    const modal = document.getElementById('DeleteQueueModal');
    const handleShow = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_URL}/api/search-user/${schema}/${fila.superuser}`);
        setSuperUser(response.data.user); 
      } catch (error) {
        console.error(error);
      }
    };
    if (modal) {
      modal.addEventListener('shown.bs.modal', handleShow);
    }
    return () => {
      if (modal) {
        modal.removeEventListener('shown.bs.modal', handleShow);
      }
    };
  }, [schema, fila.superuser]);
  return (
    <div className="modal fade" id="DeleteQueueModal" tabIndex="-1" aria-labelledby="DeleteQueueModalLabel" aria-hidden="true">
      <div className="modal-dialog modal-md">
        <div className="modal-content" style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <div className="modal-header gap-3">
            <i className={`bi bi-trash header-text-${theme}`}></i>
            <h5 className={`modal-title header-text-${theme}`} id="DeleteQueueModalLabel">
              Confirmar exclusão da fila
            </h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>

          <div className="modal-body">
            <p className={`card-subtitle-${theme} mb-1`}>
              Tem certeza que deseja excluir esta fila?
            </p>
            <p className="text-danger-true fw-bold mb-1">
              Título:
              <span className={`fw-bold header-text-${theme} ms-1`}>
                {fila.name}
              </span>
            </p>
            <p className="text-danger-true fw-bold mb-3">
              Super-usuário:
             <span className={`fw-bold header-text-${theme} ms-1`}>
              {superUser ? superUser.name : '...'}
            </span>
            </p>
            <p className={`card-subtitle-${theme}`}>
              Essa será uma ação irreversível.<br></br>Todos os usuários que compõem essa fila irão perdê-la.
            </p>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className={`btn btn-2-${theme}`}
              data-bs-dismiss="modal"
            >
              Cancelar
            </button>
            <button
              type="button"
              className={`btn btn-1-${theme}`}
              onClick={handleDelete}
              data-bs-dismiss="modal"
            >
              Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeleteQueueModal;