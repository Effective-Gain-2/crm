import React, { useState, useEffect } from 'react';
import * as bootstrap from 'bootstrap';
import axios from 'axios';

function EditAssistantModal({ theme, assistente }) {
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [model, setModel] = useState('');
  const [funcoesSelecionadas, setFuncoesSelecionadas] = useState([]);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const schema = user.schema;

  const [funcoesDisponiveis, setFuncoesDisponiveis] = useState([]);
  // Lista de modelos aceitos pelo playground do OpenAI
  const modelosDisponiveis = [
    { value: 'gpt-4', label: 'GPT-4', description: 'Modelo mais avançado, ideal para tarefas complexas' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'Versão otimizada do GPT-4, mais rápida' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Modelo equilibrado entre qualidade e velocidade' },
    { value: 'gpt-3.5-turbo-16k', label: 'GPT-3.5 Turbo 16K', description: 'Versão com contexto estendido' }
  ];

  // Carregar dados do assistente quando o modal abrir
  useEffect(() => {
    if (assistente) {
      setName(assistente.name || '');
      setInstructions(assistente.instructions || '');
      setModel(assistente.model || '');
    }
  }, [assistente]);

  const adicionarFuncao = () => {
  const disponiveis = funcoesDisponiveis.filter(f => !funcoesSelecionadas.some(fs => fs.value === f.value));
  if (disponiveis.length > 0) {
    setFuncoesSelecionadas(prev => [...prev, disponiveis[0]]);
  }
};

const alterarFuncao = (idx, novaFuncaoValue) => {
  const novaFuncaoObj = funcoesDisponiveis.find(f => f.value === novaFuncaoValue);
  if (novaFuncaoObj && !funcoesSelecionadas.some(fs => fs.value === novaFuncaoValue)) {
    setFuncoesSelecionadas(prev => prev.map((f, i) => i === idx ? novaFuncaoObj : f));
  }
};
const removerFuncao = (idx) => {
  setFuncoesSelecionadas(prev => prev.filter((_, i) => i !== idx));
};

  useEffect(()=>{
    const fetchFuncoes = async () => {
      const response = await axios.get(`${process.env.REACT_APP_URL}/bot/get-functions/${schema}`, {withCredentials:true})
      setFuncoesDisponiveis(response.data.data)
    }
    fetchFuncoes()
  }, [schema])

  const handleSave = async () => {
    if (!name || !instructions || !model || !assistente?.id) {
      console.error('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      const response = await axios.put(`${process.env.REACT_APP_URL}/bot/update-assistant/${assistente.id}`, {
        name,
        instructions,
        model,
        functions: funcoesSelecionadas,
        schema:schema
      }, { withCredentials: true });

      // Fechar modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('EditAssistantModal'));
      if (modal) {
        modal.hide();
      }
    } catch (error) {
      console.error('Erro ao atualizar o assistente:', error);
    }
  };

  const handleCancel = () => {
    // Restaurar valores originais
    if (assistente) {
      setName(assistente.name || '');
      setInstructions(assistente.instructions || '');
      setModel(assistente.model || '');
    }
  };

  return (
    <div className="modal fade" id="EditAssistantModal" tabIndex="-1" aria-labelledby="EditAssistantModalLabel" aria-hidden="true">
      <div className="modal-dialog modal-lg">
        <div className="modal-content" style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <div className="modal-header gap-3">
            <i className={`bi bi-pencil-square header-text-${theme}`}></i>
            <h5 className={`modal-title header-text-${theme}`} id="EditAssistantModalLabel">
              Editar Assistente
            </h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          
          <div className="modal-body">
            {/* Nome do Assistente */}
            <div className="mb-3">
              <label htmlFor="editAssistantName" className={`form-label card-subtitle-${theme}`}>
                Nome do Assistente <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className={`form-control input-${theme}`}
                id="editAssistantName"
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
              <label htmlFor="editAssistantInstructions" className={`form-label card-subtitle-${theme}`}>
                Instruções <span className="text-danger">*</span>
              </label>
              <textarea
                className={`form-control input-${theme}`}
                id="editAssistantInstructions"
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
              <label htmlFor="editAssistantModel" className={`form-label card-subtitle-${theme}`}>
                Modelo <span className="text-danger">*</span>
              </label>
              <select
                className={`form-select input-${theme}`}
                id="editAssistantModel"
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
            <div className="mb-3">
  <label className={`form-label card-subtitle-${theme}`}>Funções do Robô *</label>
  <div className={`d-flex flex-column gap-2`}>
    {funcoesSelecionadas.map((funcao, idx) => (
      <div key={idx} className="d-flex align-items-center gap-2">
        <select
          className={`form-select input-${theme}`}
          value={funcao}
          onChange={e => alterarFuncao(idx, e.target.value)}
        >
          <option value="">Selecione uma função</option>
          {funcoesDisponiveis
            .filter(f => f.value === funcao || !funcoesSelecionadas.includes(f.value))
            .map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
        </select>
        {funcoesSelecionadas.length > 1 && (
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => removerFuncao(idx)}
          >
            <i className="bi bi-x"></i>
          </button>
        )}
      </div>
    ))}
    <button
      type="button"
      className="btn btn-outline-secondary mt-2"
      onClick={adicionarFuncao}
      disabled={funcoesSelecionadas.length >= funcoesDisponiveis.length}
    >
      + Adicionar função
    </button>
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

            {/* Informações do assistente */}
            {assistente && (
              <div className="mb-3">
                <label className={`form-label card-subtitle-${theme}`}>
                  Informações do Assistente
                </label>
                <div className={`p-3 rounded border border-${theme === 'light' ? 'light' : 'secondary'} bg-light`}>
                  <div className="row">
                    <div className="col-6">
                      <small className="text-muted">ID:</small>
                      <p className="mb-1">{assistente.id}</p>
                    </div>
                    <div className="col-6">
                      <small className="text-muted">Atualizado em:</small>
                      <p className="mb-1">
                        {assistente.updated_at ? new Date(Number(assistente.updated_at)).toLocaleDateString('pt-BR') : 'N/A'}
                      </p>
                    </div>
                  </div>
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
              <i className="bi bi-check-lg me-2"></i>
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditAssistantModal;