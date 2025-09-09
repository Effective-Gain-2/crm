import React from 'react';
import axios from 'axios';
import * as bootstrap from 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { useToast } from '../../contexts/ToastContext';

function DeleteDisparoModal({ theme, disparo, onDelete }) {
  const { showError, showSuccess } = useToast();
  const userData = JSON.parse(localStorage.getItem('user')); 
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;

  const handleDelete = async () => {
    try {
      const response = await axios.delete(`${url}/campaing/delete/${disparo.id}/${schema}`,
        {
      withCredentials: true
    });
      
      if (response.data.success) {
        onDelete(); 
        showSuccess('Disparo deletado com sucesso!');
      } else {
        showError('Erro ao deletar disparo');
      }
    } catch (error) {
      console.error('Erro ao deletar disparo:', error);
      showError('Erro ao deletar disparo');
    }
  }

  // Se não houver disparo selecionado, não renderiza nada
  if (!disparo) return null;

  return (
    <div className="modal fade" id="DeleteDisparoModal" tabIndex="-1" aria-labelledby="DeleteDisparoModalLabel" aria-hidden="true">
      <div className="modal-dialog modal-md">
        <div className="modal-content" style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <div className="modal-header gap-3">
            <i className={`bi bi-trash header-text-${theme}`}></i>
            <h5 className={`modal-title header-text-${theme}`} id="DeleteDisparoModalLabel">
              Confirmar exclusão do disparo
            </h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>

          <div className="modal-body">
            <p className={`card-subtitle-${theme} mb-1`}>
              Tem certeza que deseja excluir este disparo?
            </p>
            <p className="text-danger-true fw-bold mb-1">
              ID:
              <span className={`fw-bold header-text-${theme} ms-1`}>
                {disparo.id}
              </span>
            </p>
            <p className="text-danger-true fw-bold mb-1">
              Título:
              <span className={`fw-bold header-text-${theme} ms-1`}>
                {disparo.campaing_name}
              </span>
            </p>
            <p className="text-danger-true fw-bold mb-3">
              Status:
              <span className={`fw-bold header-text-${theme} ms-1`}>
                {disparo.status}
              </span>
            </p>
            <p className={`card-subtitle-${theme}`}>
              Essa será uma ação irreversível.<br></br>
              Todos os dados relacionados a este disparo serão permanentemente excluídos.
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

export default DeleteDisparoModal; 