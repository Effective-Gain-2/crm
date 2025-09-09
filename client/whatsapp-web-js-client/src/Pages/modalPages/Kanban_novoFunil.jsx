import React, { useState } from 'react';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';

function NovoFunilModal({ theme, show, onHide, onSave }) {
  const { showError, showSuccess } = useToast();
  const [titulo, setTitulo] = useState('');
  const [error, setError] = useState('');
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;

  const handleTituloChange = (e) => {
    const value = e.target.value;
    setTitulo(value);
    
    // Verificar se há espaços
    if (value.includes(' ')) {
      setError('O título não pode conter espaços');
    } else {
      setError('');
    }
  };

  const handleSave = async () => {
    if (!titulo) {
      showError('Preencha o título do funil.');
      return;
    }

    if (titulo.includes(' ')) {
      showError('O título não pode conter espaços.');
      return;
    }

    try {
      const response = await axios.post(`${url}/kanban/create-funil`, {
        sector: titulo,
        schema: schema
      },
        {
      withCredentials: true
    });
      
      if (response.data) {
        showSuccess('Funil criado com sucesso!');
        if (onSave) onSave(response.data);
      }
    } catch (error) {
      console.error(error);
      showError('Erro ao criar funil. Tente novamente.');
      return;
    }
    
    if (onHide) onHide();
    setTitulo('');
    setError('');
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
                className={`form-control input-${theme} ${error ? 'is-invalid' : ''}`}
                id="tituloFunil"
                value={titulo}
                onChange={handleTituloChange}
                placeholder="Digite o título do funil (sem espaços)"
              />
              {error && (
                <div className="invalid-feedback d-block">
                  {error}
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className={`btn btn-2-${theme}`} onClick={onHide}>Cancelar</button>
            <button 
              type="button" 
              className={`btn btn-1-${theme}`} 
              onClick={handleSave}
              disabled={!titulo || titulo.includes(' ')}
            >
              Salvar Funil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NovoFunilModal;