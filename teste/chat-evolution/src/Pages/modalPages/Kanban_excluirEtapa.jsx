import React from 'react';
import axios from 'axios';

function KanbanExcluirEtapaModal({ show, onHide, onConfirm, etapa, funil, theme }) {
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;

  const handleDeleteEtapa = async () => {
    try {
      await axios.delete(`${url}/kanban/delete-stage`,
        {
      data: {
        etapa_id: etapa.id,
        sector: funil,
        schema: schema
      }
    })
      console.log('entrou', etapa.id, funil, schema)
    } catch (error) {
      console.error(error)
    }
  }

  if (!show) return null;
  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-sm modal-dialog-centered">
        <div className="modal-content" style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <div className="modal-header gap-2">
            <i className={`bi bi-trash header-text-${theme}`}></i>
            <h5 className={`modal-title header-text-${theme}`}>Excluir Etapa</h5>
            <button type="button" className="btn-close" onClick={onHide}></button>
          </div>
          <div className="modal-body">
            <p className={`mb-0 header-text-${theme}`}>Tem certeza que deseja excluir a etapa <b>{etapa?.etapa}</b>?<br/>Esta ação é <span style={{ color: 'var(--error-color)' }}>irreversível</span>.</p>
          </div>
          <div className="modal-footer d-flex justify-content-end">
            <button type="button" className={`btn btn-2-${theme}`} onClick={handleDeleteEtapa()}>Cancelar</button>
            <button type="button" className="btn delete-btn" onClick={onConfirm}>Excluir</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default KanbanExcluirEtapaModal; 