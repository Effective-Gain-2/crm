import React from 'react';
import * as bootstrap from 'bootstrap';

function DeleteAssistantModal({ theme, assistente, onAssistantDeleted }) {
  const handleDelete = async () => {
    if (!assistente?.id) {
      console.error('Assistente não encontrado');
      return;
    }

    try {
      // Aqui será implementada a chamada para a API quando o backend estiver pronto
      console.log('Excluindo assistente:', assistente.id);
      
      // Simular sucesso
      if (onAssistantDeleted) {
        onAssistantDeleted(assistente.id);
      }
      
      // Fechar modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('DeleteAssistantModal'));
      if (modal) {
        modal.hide();
      }
    } catch (error) {
      console.error('Erro ao excluir o assistente:', error);
    }
  };

  return (
    <div className="modal fade" id="DeleteAssistantModal" tabIndex="-1" aria-labelledby="DeleteAssistantModalLabel" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content" style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <div className="modal-header gap-3">
            <i className="bi bi-exclamation-triangle text-warning"></i>
            <h5 className={`modal-title header-text-${theme}`} id="DeleteAssistantModalLabel">
              Confirmar Exclusão
            </h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          
          <div className="modal-body">
            <div className="text-center">
              <i className="bi bi-robot text-danger" style={{ fontSize: '3rem' }}></i>
              <h6 className={`mt-3 header-text-${theme}`}>
                Tem certeza que deseja excluir o assistente?
              </h6>
              <p className={`card-subtitle-${theme} mb-0`}>
                <strong>"{assistente?.name || 'Assistente'}"</strong>
              </p>
              <p className={`card-subtitle-${theme} mt-2`} style={{ fontSize: '0.9rem' }}>
                Esta ação não pode ser desfeita e todas as conversas associadas serão perdidas.
              </p>
            </div>
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
              className="btn btn-danger"
              onClick={handleDelete}
            >
              <i className="bi bi-trash-fill me-2"></i>
              Excluir Assistente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeleteAssistantModal;
