import React from 'react';

function LembreteDeletarLembrete({ theme, lembrete, onDelete }) {
  if (!lembrete) return null;

  return (
    <div className="modal fade" id="DeleteLembreteModal" tabIndex="-1" aria-labelledby="DeleteLembreteModalLabel" aria-hidden="true">
      <div className="modal-dialog modal-md">
        <div className="modal-content" style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <div className="modal-header gap-3">
            <i className={`bi bi-trash header-text-${theme}`}></i>
            <h5 className={`modal-title header-text-${theme}`} id="DeleteLembreteModalLabel">
              Confirmar exclusão do lembrete
            </h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>

          <div className="modal-body">
            <p className={`card-subtitle-${theme} mb-1`}>
              Tem certeza que deseja excluir este lembrete?
            </p>
            <p className="text-danger-true fw-bold mb-1">
              Título:
              <span className={`fw-bold header-text-${theme} ms-1`}>
                {lembrete.titulo}
              </span>
            </p>
            <p className="text-danger-true fw-bold mb-1">
              Data:
              <span className={`fw-bold header-text-${theme} ms-1`}>
                {new Date(lembrete.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            </p>
            <p className="text-danger-true fw-bold mb-1">
              Tipo:
              <span className={`fw-bold header-text-${theme} ms-1`}>
                {lembrete.tipo.charAt(0).toUpperCase() + lembrete.tipo.slice(1)}
              </span>
            </p>
            <p className={`card-subtitle-${theme}`}>
              Essa será uma ação irreversível.<br />
              Todos os dados relacionados a este lembrete serão permanentemente excluídos.
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
              onClick={onDelete}
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

export default LembreteDeletarLembrete; 