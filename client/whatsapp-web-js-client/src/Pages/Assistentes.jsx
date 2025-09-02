import React, { useState, useEffect } from 'react';
import * as bootstrap from 'bootstrap';
import NewAssistantModal from './modalPages/Assistentes_novoAssistente';
import DeleteAssistantModal from './modalPages/Assistentes_delete';
import EditAssistantModal from './modalPages/Assistentes_editarAssistente';
import axios from 'axios';

function AssistentesPage({ theme }) {
  const [assistentes, setAssistentes] = useState([]);
  const [assistente, setAssistente] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssistant, setSelectedAssistant] = useState(null);
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;
  // Mock data para demonstração - será substituído pela API real
  useEffect(() => {
    const fetchAssistentes = async () => {
      const response = await axios.get(`${url}/bot/get-bots/${schema}`, {withCredentials:true})
      setAssistentes(Array.isArray(response.data.data)?response.data.data:[response.data.data])
    }
      fetchAssistentes()
  }, [url, schema]);

  useEffect(() => {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(el => {
      if (el) {
        return new bootstrap.Tooltip(el);
      }
      return null;
    });

    return () => {
      tooltipList.forEach(t => {
        if (t && t._element && t._element.closest) {
          t.dispose();
        }
      });
    };
  }, [assistentes]);

  const assistentesFiltrados = assistentes.filter(assistente => {
    const nome = assistente?.name || '';
    return nome.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleAssistantDeleted = (assistantId) => {
    setAssistentes(prevAssistentes => prevAssistentes.filter(assistente => assistente.id !== assistantId));
  };

  return (
    <div className="h-100 w-100 mx-2 pt-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className={`mb-0 ms-3 header-text-${theme}`} style={{ fontWeight: 400 }}>Assistentes ChatGPT</h2>

        <div className="input-group" style={{ width: '40%' }}>
          <input
            type="text"
            className={`form-control input-${theme}`}
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button 
            className={`btn btn-1-${theme} d-flex gap-2`}
            data-bs-toggle="modal"
            data-bs-target="#NewAssistantModal"
          >
            <i className="bi-plus-lg"></i>
            Novo Assistente
          </button>        
        </div>
      </div>

      <div className="row g-3" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
        {assistentesFiltrados.map((assistente) => (
          <div key={assistente.id} className="col-md-3 col-lg-3 col-xl-3">
            <div className={`card h-100 card-${theme}`} style={{ minHeight: '150px' }}>
              <div className="card-body d-flex flex-column justify-content-between p-3">
                <div>
                  <h6 className={`card-title mb-2 header-text-${theme}`} style={{ fontSize: '0.9rem' }}>
                    {assistente.name}
                  </h6>
                  <p className={`card-subtitle-${theme} mb-2`} style={{ fontSize: '0.8rem', lineHeight: '1.3' }}>
                    {assistente.instructions.length > 80 
                      ? `${assistente.instructions.substring(0, 80)}...` 
                      : assistente.instructions}
                  </p>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className={`badge bg-primary`} style={{ fontSize: '0.7rem' }}>
                      {assistente.model}
                    </span>
                    <small className={`card-subtitle-${theme}`} style={{ fontSize: '0.7rem' }}>
                      Criado em {new Date(Number(assistente.created_at)).toLocaleDateString('pt-BR')}
                    </small>
                  </div>
                </div>
                
                <div className="d-flex gap-1 mt-2 justify-content-center">
                  <button
                    className={`btn btn-sm btn-2-${theme}`}
                    data-bs-toggle="tooltip"
                    title="Editar"
                    onClick={() => {
                      setSelectedAssistant(assistente);
                      const modal = new bootstrap.Modal(document.getElementById('EditAssistantModal'));
                      modal.show();
                    }}
                  >
                    <i className="bi bi-pencil-fill" style={{ fontSize: '0.8rem' }}></i>
                  </button>

                  <button
                    className="btn btn-sm delete-btn"
                    data-bs-toggle="tooltip"
                    title="Excluir"
                    onClick={() => {
                      const modal = new bootstrap.Modal(document.getElementById('DeleteAssistantModal'));
                      modal.show();
                      setAssistente(assistente)
                    }}
                  >
                    <i className="bi bi-trash-fill" style={{ fontSize: '0.8rem' }}></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <NewAssistantModal theme={theme}/>
        <DeleteAssistantModal theme={theme} assistente={assistente} onAssistantDeleted={handleAssistantDeleted}/>
        <EditAssistantModal theme={theme} assistente={selectedAssistant}/>
      </div>
    </div>
  );
}

export default AssistentesPage;
