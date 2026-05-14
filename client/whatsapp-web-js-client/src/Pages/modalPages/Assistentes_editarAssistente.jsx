import React, { useState, useEffect } from 'react';
import * as bootstrap from 'bootstrap';
import { api } from '../../utils/axiosConfig';

function EditAssistantModal({ theme, assistente, onAssistantUpdated }) {
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [model, setModel] = useState('');
  const [funcoesSelecionadas, setFuncoesSelecionadas] = useState([]);
  const [testMode, setTestMode] = useState(false);
  const [testNumbers, setTestNumbers] = useState([]);
  const [novoNumero, setNovoNumero] = useState('');
  const [savingNumber, setSavingNumber] = useState(false);
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
      setTestMode(!!assistente.test_mode);
      // Só definir funções se existirem e forem um array
      if (assistente.functions && Array.isArray(assistente.functions)) {
        setFuncoesSelecionadas(assistente.functions);
      } else {
        setFuncoesSelecionadas([]);
      }
    }
  }, [assistente]);

  useEffect(() => {
    if (!assistente?.id) {
      setTestNumbers([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const resp = await api.get(`/bot/${assistente.id}/test-numbers`);
        if (!cancelled) setTestNumbers(resp.data.data || []);
      } catch (error) {
        if (!cancelled) console.error('Erro ao carregar números de teste:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [assistente?.id]);

  const handleToggleTestMode = async (next) => {
    if (!assistente?.id) return;
    const previous = testMode;
    setTestMode(next);
    try {
      await api.put(`/bot/${assistente.id}/test-mode`, { test_mode: next });
    } catch (error) {
      console.error('Erro ao alterar modo de teste:', error);
      setTestMode(previous);
    }
  };

  const handleAddTestNumber = async () => {
    if (!assistente?.id) return;
    const numero = novoNumero.replace(/\D/g, '');
    if (!numero) return;
    setSavingNumber(true);
    try {
      const resp = await api.post(`/bot/${assistente.id}/test-numbers`, { number: numero });
      if (resp.data?.data) {
        setTestNumbers(prev => [...prev, resp.data.data]);
      }
      setNovoNumero('');
    } catch (error) {
      console.error('Erro ao adicionar número de teste:', error);
    } finally {
      setSavingNumber(false);
    }
  };

  const handleRemoveTestNumber = async (id) => {
    if (!assistente?.id) return;
    try {
      await api.delete(`/bot/${assistente.id}/test-numbers/${id}`);
      setTestNumbers(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Erro ao remover número de teste:', error);
    }
  };

  const adicionarFuncao = () => {
  const disponiveis = funcoesDisponiveis.filter(f => !funcoesSelecionadas.some(fs => fs.id === f.id || fs.value === f.value));
  if (disponiveis.length > 0) {
    setFuncoesSelecionadas(prev => [...prev, disponiveis[0]]);
  }
};

const alterarFuncao = (idx, novaFuncaoValue) => {
  
  if (!novaFuncaoValue) return;
  
  if (funcoesDisponiveis.length === 0) {
    console.warn('Funções disponíveis ainda não carregaram');
    return;
  }
  
  // Buscar por value (id) ou por name
  const novaFuncaoObj = funcoesDisponiveis.find(f => 
    f.value === novaFuncaoValue || 
    f.id === novaFuncaoValue || 
    f.name === novaFuncaoValue
  );
  
  if (novaFuncaoObj) {
    setFuncoesSelecionadas(prev => {
      const novoArray = prev.map((f, i) => i === idx ? novaFuncaoObj : f);
      return novoArray;
    });
  } else {
    console.warn('Função não encontrada nas funções disponíveis');
  }
};
const removerFuncao = (idx) => {
  setFuncoesSelecionadas(prev => prev.filter((_, i) => i !== idx));
};

  useEffect(()=>{
    const fetchFuncoes = async () => {
      try {
        const response = await api.get(`/bot/get-functions/${schema}`)
        setFuncoesDisponiveis(response.data.data || [])
      } catch (error) {
        console.error('Erro ao carregar funções:', error);
        setFuncoesDisponiveis([]);
      }
    }
    fetchFuncoes()
  }, [schema])

  const handleSave = async () => {
    if (!name || !instructions || !model || !assistente?.id) {
      console.error('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      const response = await api.put(`/bot/update-assistant/${assistente.id}`, {
        name,
        instructions,
        model,
        functions: funcoesSelecionadas,
        schema:schema
      });

      // Chamar callback com dados atualizados
      if (onAssistantUpdated) {
        onAssistantUpdated({
          ...assistente,
          name,
          instructions,
          model,
          functions: funcoesSelecionadas
        });
      }

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
      setFuncoesSelecionadas(assistente.functions || []);
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
                style={{ resize: 'vertical' }}
              ></textarea>
              <div className="form-text text-muted">
                Seja específico sobre o papel, conhecimento e comportamento esperado
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
    {funcoesSelecionadas.map((funcao, idx) => {
      return (
      <div key={`funcao-${idx}-${funcao.value || 'empty'}`} className="d-flex align-items-center gap-2">
        <select
          className={`form-select input-${theme}`}
          value={funcao.id || funcao.value || ''}
          onChange={e => alterarFuncao(idx, e.target.value)}
        >
          <option value="">Selecione uma função</option>
          {funcoesDisponiveis
            .filter(f => {
              // Sempre mostrar a função atual
              if (f.id === funcao.id || f.value === funcao.value) return true;
              // Mostrar outras funções que não estão selecionadas
              return !funcoesSelecionadas.some(fs => fs.id === f.id || fs.value === f.value);
            })
            .map(f => (
              <option key={f.id || f.value} value={f.id || f.value}>{f.label}</option>
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
      );
    })}
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

            {/* Modo de Teste */}
            <div className="mb-3">
              <label className={`form-label card-subtitle-${theme}`}>
                Modo de Teste
              </label>
              <div className={`p-3 rounded border d-flex flex-column gap-3`} style={{ borderColor: `var(--border-color-${theme})` }}>
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="botTestModeSwitch"
                    checked={testMode}
                    onChange={(e) => handleToggleTestMode(e.target.checked)}
                  />
                  <label className={`form-check-label card-subtitle-${theme}`} htmlFor="botTestModeSwitch">
                    Restringir respostas apenas a números cadastrados abaixo
                  </label>
                </div>
                <div className="form-text text-muted">
                  Quando ativo, o bot ignora qualquer número que não esteja na lista. Use para testar sem atrapalhar o uso comercial.
                </div>
                <div className="d-flex gap-2">
                  <input
                    type="text"
                    className={`form-control input-${theme}`}
                    placeholder="Ex: 5511999999999"
                    value={novoNumero}
                    onChange={(e) => setNovoNumero(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTestNumber(); } }}
                    disabled={!testMode}
                  />
                  <button
                    type="button"
                    className={`btn btn-1-${theme}`}
                    onClick={handleAddTestNumber}
                    disabled={!testMode || savingNumber || !novoNumero.trim()}
                  >
                    Adicionar
                  </button>
                </div>
                {testNumbers.length > 0 ? (
                  <ul className="list-group">
                    {testNumbers.map(n => (
                      <li key={n.id} className="list-group-item d-flex justify-content-between align-items-center" style={{ backgroundColor: `var(--bg-color-${theme})` }}>
                        <span className={`card-subtitle-${theme}`}>{n.number}</span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleRemoveTestNumber(n.id)}
                          title="Remover"
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <small className="text-muted">Nenhum número cadastrado.</small>
                )}
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