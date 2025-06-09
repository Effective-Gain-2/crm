import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const iconesPessoais = [
  'bi-person', 'bi-briefcase', 'bi-calendar', 'bi-alarm', 'bi-envelope',
  'bi-telephone', 'bi-clipboard', 'bi-lightbulb', 'bi-flag', 'bi-star',
  'bi-graph-up', 'bi-gear', 'bi-chat-dots', 'bi-book', 'bi-cash',
  'bi-clipboard-check', 'bi-clock', 'bi-people', 'bi-award', 'bi-activity', 'bi-check2-circle'
];
const maxMsgLen = 240;

// Mock de filas para exemplo
const mockFilas = [
  { id: '1', nome: 'Suporte' },
  { id: '2', nome: 'Vendas' },
  { id: '3', nome: 'Financeiro' },
  { id: '4', nome: 'Marketing' },
  { id: '5', nome: 'RH' }
];

function LembreteNovoLembrete({ show, onHide, onSave, tipoDefault = 'geral', filas = mockFilas, userRole = 'user', theme, lembreteEdit, onTestToast }) {
  const [tipo, setTipo] = useState(lembreteEdit ? lembreteEdit.tipo : tipoDefault);
  const [titulo, setTitulo] = useState(lembreteEdit ? lembreteEdit.titulo : '');
  const [mensagem, setMensagem] = useState(lembreteEdit ? lembreteEdit.mensagem : '');
  const [icone, setIcone] = useState(lembreteEdit ? lembreteEdit.icone : iconesPessoais[0]);
  const [data, setData] = useState(lembreteEdit ? lembreteEdit.data : '');
  const [filasSelecionadas, setFilasSelecionadas] = useState(lembreteEdit && lembreteEdit.filas ? lembreteEdit.filas : []);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();
  const [hoveredIcon, setHoveredIcon] = useState(null);
  const [filasDisponiveis, setFilasDisponiveis] = useState(mockFilas);
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;
  const [filasDropdownOpen, setFilasDropdownOpen] = useState(false);
  const filasDropdownRef = useRef();
  const [hoveredFila, setHoveredFila] = useState(null);

  // Buscar filas do backend
  useEffect(() => {
    const fetchFilas = async () => {
      try {
        const response = await axios.get(`${url}/queue/get-all-queues/${schema}`);
        if (response.data && Array.isArray(response.data)) {
          setFilasDisponiveis(response.data);
        } else {
          console.warn('Resposta da API não é um array de filas:', response.data);
          setFilasDisponiveis(mockFilas);
        }
      } catch (error) {
        console.error('Erro ao buscar filas:', error);
        setFilasDisponiveis(mockFilas);
      }
    };
    fetchFilas();
  }, [schema, url]);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  // Atualizar campos ao abrir para edição
  useEffect(() => {
    if (lembreteEdit) {
      setTipo(lembreteEdit.tipo);
      setTitulo(lembreteEdit.titulo);
      setMensagem(lembreteEdit.mensagem);
      setIcone(lembreteEdit.icone);
      setData(lembreteEdit.data);
      setFilasSelecionadas(lembreteEdit.filas || []);
    } else {
      setTipo(tipoDefault);
      setTitulo('');
      setMensagem('');
      setIcone(iconesPessoais[0]);
      setData('');
      setFilasSelecionadas([]);
    }
  }, [lembreteEdit, show, tipoDefault]);

  // Adicionar useEffect para o dropdown de filas
  useEffect(() => {
    if (!filasDropdownOpen) return;
    function handleClick(e) {
      if (filasDropdownRef.current && !filasDropdownRef.current.contains(e.target)) {
        setFilasDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [filasDropdownOpen]);

  if (!show) return null;

  const handleMsgChange = e => {
    const val = e.target.value.slice(0, maxMsgLen);
    setMensagem(val);
  };

  const handleSalvar = () => {
    if (!titulo.trim() || !mensagem.trim() || !data) return;
    onSave && onSave({ tipo, titulo, mensagem, icone, data, filas: filasSelecionadas });
    setTitulo(''); setMensagem(''); setIcone(iconesPessoais[0]); setData(''); setFilasSelecionadas([]);
    onHide && onHide();
  };

  // Permissões atualizadas
  const podeGeral = ['admin', 'tecnico'].includes(userRole);
  const podeSetorial = ['admin', 'tecnico', 'superuser'].includes(userRole);
  const podePessoal = true; // Todos podem criar lembretes pessoais

  // Função para alternar seleção de fila
  const toggleFila = (filaId) => {
    setFilasSelecionadas(prev => {
      if (prev.includes(filaId)) {
        return prev.filter(id => id !== filaId);
      } else {
        return [...prev, filaId];
      }
    });
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-md modal-dialog-centered">
        <div className="modal-content" style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <div className="modal-header gap-2">
            <i className={`bi ${
              tipo === 'geral' ? 'bi-globe-americas' : tipo === 'setorial' ? 'bi-diagram-3' : icone
            } header-text-${theme}`}></i>
            <h5 className={`modal-title header-text-${theme}`}>Novo Lembrete</h5>
            <button type="button" className="btn-close" onClick={onHide}></button>
          </div>
          <div className="modal-body">
            {/* Tipo de Lembrete */}
            <div className="mb-3 d-flex gap-2">
              {podeGeral && (
                <button className={`btn btn-sm ${tipo === 'geral' ? 'btn-1-' + theme : 'btn-2-' + theme}`} onClick={() => setTipo('geral')}>
                  <i className="bi bi-globe-americas me-1"></i>Geral
                </button>
              )}
              {podeSetorial && (
                <button className={`btn btn-sm ${tipo === 'setorial' ? 'btn-1-' + theme : 'btn-2-' + theme}`} onClick={() => setTipo('setorial')}>
                  <i className="bi bi-diagram-3 me-1"></i>Setorial
                </button>
              )}
              {podePessoal && (
                <button className={`btn btn-sm ${tipo === 'pessoal' ? 'btn-1-' + theme : 'btn-2-' + theme}`} onClick={() => setTipo('pessoal')}>
                  <i className={`bi ${icone} me-1`}></i>Pessoal
                </button>
              )}
            </div>
            {/* Seleção de Filas para Setorial */}
            {tipo === 'setorial' && (
              <div className="mb-3">
                <label className={`form-label card-subtitle-${theme}`}>Filas</label>
                <div className="position-relative" ref={filasDropdownRef}>
                  <button
                    type="button"
                    className={`form-control d-flex align-items-center justify-content-between input-${theme} header-text-${theme}`}
                    style={{ cursor: 'pointer', minHeight: 38 }}
                    onClick={() => setFilasDropdownOpen(v => !v)}
                  >
                    <span className="d-flex align-items-center gap-2">
                      <i className="bi bi-diagram-3"></i>
                      {filasSelecionadas.length === 0 
                        ? 'Selecione as filas' 
                        : filasSelecionadas.length === 1 
                          ? filasDisponiveis.find(f => f.id === filasSelecionadas[0])?.nome 
                          : `${filasSelecionadas.length} filas selecionadas`}
                    </span>
                    <i className={`bi bi-chevron-${filasDropdownOpen ? 'up' : 'down'}`}></i>
                  </button>
                  {filasDropdownOpen && (
                    <div
                      className={`position-absolute w-100 border rounded shadow-sm mt-1 header-text-${theme}`}
                      style={{
                        zIndex: 20,
                        background: `var(--bg-color-${theme})`,
                        color: `var(--text-color-${theme})`,
                        border: `1px solid var(--border-color-${theme}) !important`,
                        maxHeight: 220,
                        overflowY: 'auto',
                      }}
                    >
                      {Array.isArray(filasDisponiveis) && filasDisponiveis.map(fila => {
                        const isSelected = filasSelecionadas.includes(fila.id);
                        const isHovered = fila.id === hoveredFila;
                        let bg = 'transparent';
                        if (isSelected) bg = 'var(--placeholder-color)';
                        else if (isHovered) bg = theme === 'dark' ? 'var(--bs-gray-700)' : 'var(--bs-gray-200)';
                        
                        return (
                          <div
                            key={fila.id}
                            className={`d-flex align-items-center gap-2 px-2 py-1 ${isSelected ? 'header-text-light' : 'header-text-' + theme}`}
                            style={{
                              cursor: 'pointer',
                              background: bg,
                              transition: 'background 0.15s',
                            }}
                            onClick={() => toggleFila(fila.id)}
                            onMouseEnter={() => setHoveredFila(fila.id)}
                            onMouseLeave={() => setHoveredFila(null)}
                          >
                            <i className={`bi ${isSelected ? 'bi-check2-square' : 'bi-square'}`}></i>
                            <span>{fila.nome}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <small className={`header-text-${theme}`}>Selecione uma ou mais filas entre as que você possui permissão.</small>
              </div>
            )}
            {/* Ícone para Pessoal - Dropdown customizado */}
            {tipo === 'pessoal' && (
              <div className="mb-3">
                <label className={`form-label card-subtitle-${theme}`}>Ícone</label>
                <div className="position-relative" ref={dropdownRef}>
                  <button
                    type="button"
                    className={`form-control d-flex align-items-center justify-content-between input-${theme} header-text-${theme}`}
                    style={{ cursor: 'pointer', minHeight: 38 }}
                    onClick={() => setDropdownOpen(v => !v)}
                  >
                    <span className="d-flex align-items-center gap-2">
                      <i className={`bi ${icone}`}></i>
                      {(() => { const nome = icone.replace('bi-', '').replace(/-/g, ' '); return nome.charAt(0).toUpperCase() + nome.slice(1); })()}
                    </span>
                    <i className={`bi bi-chevron-${dropdownOpen ? 'up' : 'down'}`}></i>
                  </button>
                  {dropdownOpen && (
                    <div
                      className={`position-absolute w-100 border rounded shadow-sm mt-1 header-text-${theme}`}
                      style={{
                        zIndex: 20,
                        background: `var(--bg-color-${theme})`,
                        color: `var(--text-color-${theme})`,
                        border: `1px solid var(--border-color-${theme}) !important`,
                        maxHeight: 220,
                        overflowY: 'auto',
                      }}
                    >
                      {iconesPessoais.map(ic => {
                        const nome = ic.replace('bi-', '').replace(/-/g, ' ');
                        const nomeFormatado = nome.charAt(0).toUpperCase() + nome.slice(1);
                        const isSelected = ic === icone;
                        const isHovered = ic === hoveredIcon;
                        let bg = 'transparent';
                        if (isSelected) bg = 'var(--placeholder-color)';
                        else if (isHovered) bg = theme === 'dark' ? 'var(--bs-gray-700)' : 'var(--bs-gray-200)';
                        return (
                          <div
                            key={ic}
                            className={`d-flex align-items-center gap-2 px-2 py-1 ${isSelected ? 'header-text-light' : 'header-text-' + theme}`}
                            style={{
                              cursor: 'pointer',
                              background: bg,
                              transition: 'background 0.15s',
                            }}
                            onClick={() => { setIcone(ic); setDropdownOpen(false); }}
                            onMouseEnter={() => setHoveredIcon(ic)}
                            onMouseLeave={() => setHoveredIcon(null)}
                          >
                            <i className={`bi ${ic}`}></i>
                            <span>{nomeFormatado}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Título */}
            <div className="mb-3">
              <label className={`form-label card-subtitle-${theme}`}>Título</label>
              <input
                type="text"
                className={`form-control input-${theme}`}
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                maxLength={60}
                placeholder="Título do lembrete"
              />
            </div>
            {/* Mensagem */}
            <div className="mb-3">
              <label className={`form-label card-subtitle-${theme}`}>Mensagem</label>
              <textarea
                className={`form-control input-${theme}`}
                value={mensagem}
                onChange={handleMsgChange}
                rows={3}
                maxLength={maxMsgLen}
                placeholder="Digite a mensagem do lembrete"
              />
              <div className="d-flex justify-content-end mt-1">
                <small style={{ color: mensagem.length >= maxMsgLen ? 'var(--error-color)' : undefined }}>
                  {maxMsgLen - mensagem.length} caracteres restantes
                </small>
              </div>
            </div>
            {/* Data de disparo */}
            <div className="mb-2">
              <label className={`form-label card-subtitle-${theme}`}>Data do lembrete</label>
              <input
                type="datetime-local"
                className={`form-control input-${theme}`}
                value={data}
                onChange={e => setData(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className={`btn btn-2-${theme}`} onClick={onHide}>Cancelar</button>
            <button type="button" className={`btn btn-2-${theme}`} onClick={() => onTestToast && onTestToast({ tipo, titulo, mensagem, icone, data, filas: filasSelecionadas })}>
              Testar Lembrete
            </button>
            <button type="button" className={`btn btn-1-${theme}`} onClick={handleSalvar} disabled={!titulo.trim() || !mensagem.trim() || !data}>
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LembreteNovoLembrete; 