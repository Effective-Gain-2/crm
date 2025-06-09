import React, { useState } from 'react';
import axios from 'axios';

function NovoFunilModal({ theme, show, onHide, onSave }) {
  const [titulo, setTitulo] = useState('');
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;

  const handleSave = async () => {
  if (!titulo) {
    alert('Preencha o título do funil.');
    return;
  }
  try {
    const response = await axios.post(`${url}/kanban/create-funil`, {
      sector: titulo,
      schema: schema
    });
    if (onSave) onSave(response.data); // ou { titulo } se o backend não retorna o funil criado
  } catch (error) {
    console.error(error);
  }
  if (onHide) onHide();
  setTitulo('');
};

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content" style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <div className="modal-header gap-3">
            <i className={`bi bi-funnel header-text-${theme}`}></i>
            <h5 className={`modal-title header-text-${theme}`}>Novo Funil</h5>
            <button type="button" className="btn-close" onClick={onHide}></button>
          </div>
          <div className="modal-body">
            {/* Título do Funil */}
            <div className="mb-3">
              <label htmlFor="tituloFunil" className={`form-label card-subtitle-${theme}`}>Título do Funil</label>
              <input
                type="text"
                className={`form-control input-${theme}`}
                id="tituloFunil"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Digite o título do funil"
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className={`btn btn-2-${theme}`} onClick={onHide}>Cancelar</button>
            <button type="button" className={`btn btn-1-${theme}`} onClick={handleSave}>Salvar Funil</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NovoFunilModal;