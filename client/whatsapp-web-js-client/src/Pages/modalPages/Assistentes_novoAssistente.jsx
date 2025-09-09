import React, { useState } from 'react';
import * as bootstrap from 'bootstrap';
import axios from 'axios';

function NewAssistantModal({ theme }) {
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [model, setModel] = useState('');
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;
  
  
  const modelosDisponiveis = [
    { value: 'gpt-4', label: 'GPT-4', description: 'Modelo mais avançado, ideal para tarefas complexas' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'Versão otimizada do GPT-4, mais rápida' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Modelo equilibrado entre qualidade e velocidade' },
    { value: 'gpt-3.5-turbo-16k', label: 'GPT-3.5 Turbo 16K', description: 'Versão com contexto estendido' }
  ];



  const handleSave = async () => {
    if (!name || !instructions || !model) {
      console.error('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      const response = await axios.post(`${url}/bot/create`,{
        name:name,
        instructions:instructions,
        model:model,
        schema:schema
      }, { withCredentials:true });

      setName('');
      setInstructions('');
      setModel('');
      
      const modal = bootstrap.Modal.getInstance(document.getElementById('NewAssistantModal'));
      if (modal) {
        modal.hide();
      }
    } catch (error) {
      console.error('Erro ao salvar o assistente:', error);
    }
  };

  return (
    <div className="modal fade" id="NewAssistantModal" tabIndex="-1" aria-labelledby="NewAssistantModalLabel" aria-hidden="true">
      <div className="modal-dialog modal-lg">
        <div className="modal-content" style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <div className="modal-header gap-3">
            <i className={`bi bi-robot header-text-${theme}`}></i>
            <h5 className={`modal-title header-text-${theme}`} id="NewAssistantModalLabel">
              Novo Assistente ChatGPT
            </h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          
          <div className="modal-body">
            {/* Nome do Assistente */}
            <div className="mb-3">
              <label htmlFor="assistantName" className={`form-label card-subtitle-${theme}`}>
                Nome do Assistente <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className={`form-control input-${theme}`}
                id="assistantName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Assistente de Vendas, Suporte Técnico..."
                maxLength={100}
              />
              <div className="form-text text-muted">
                Escolha um nome descritivo para identificar o assistente
              </div>
            </div>

            {/* Instruções */}
            <div className="mb-3">
              <label htmlFor="assistantInstructions" className={`form-label card-subtitle-${theme}`}>
                Instruções <span className="text-danger">*</span>
              </label>
              <textarea
                className={`form-control input-${theme}`}
                id="assistantInstructions"
                rows="6"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Descreva o comportamento, conhecimento e estilo de comunicação do assistente..."
                maxLength={1000}
                style={{ resize: 'vertical' }}
              ></textarea>
              <div className="d-flex justify-content-between">
                <div className="form-text text-muted">
                  Seja específico sobre o papel, conhecimento e comportamento esperado
                </div>
                <small className={`text-muted ${instructions.length > 900 ? 'text-warning' : ''}`}>
                  {instructions.length}/1000
                </small>
              </div>
            </div>

            {/* Modelo */}
            <div className="mb-3">
              <label htmlFor="assistantModel" className={`form-label card-subtitle-${theme}`}>
                Modelo <span className="text-danger">*</span>
              </label>
              <select
                className={`form-select input-${theme}`}
                id="assistantModel"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option value="" disabled>
                  Escolha um modelo
                </option>
                {modelosDisponiveis.map((modelo) => (
                  <option key={modelo.value} value={modelo.value}>
                    {modelo.label} - {modelo.description}
                  </option>
                ))}
              </select>
              <div className="form-text text-muted">
                O modelo determina as capacidades e velocidade do assistente
              </div>
            </div>

            {/* Preview das instruções */}
            {instructions && (
              <div className="mb-3">
                <label className={`form-label card-subtitle-${theme}`}>
                  Preview das Instruções
                </label>
                <div className={`p-3 rounded border border-${theme === 'light' ? 'light' : 'secondary'} bg-light`}>
                  <p className="mb-0" style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                    {instructions}
                  </p>
                </div>
              </div>
            )}
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
              onClick={handleSave}
              disabled={!name || !instructions || !model}
            >
              <i className="bi bi-plus-lg me-2"></i>
              Criar Assistente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewAssistantModal;
