import React from 'react';
import axios from 'axios';
import * as bootstrap from 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

function DeleteDisparoModal({ theme, disparo, onDelete }) {
  // Como é fictício, não precisamos do schema real
  const handleDelete = async () => {
    try {
      // Simulando a chamada da API
      console.log('Simulando exclusão do disparo:', disparo?.id);
      // Chama o callback para atualizar a lista
      onDelete(); 
    } catch (error) {
      console.error('Erro ao deletar disparo:', error);
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
                {disparo.titulo}
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