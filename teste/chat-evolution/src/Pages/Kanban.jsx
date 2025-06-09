import React, { useState, useRef, useEffect } from 'react';
import NovoFunilModal from './modalPages/Kanban_novoFunil';
import GerirEtapaModal from './modalPages/Kanban_gerirEtapa';
import { Dropdown } from 'react-bootstrap';
import KanbanExcluirEtapaModal from './modalPages/Kanban_excluirEtapa';
import axios from 'axios';
import { socket } from '../socket';
import ChatPage from './Chats';



function maskPhone(num) {
  // Remove tudo que não for dígito
  const digits = num.replace(/\D/g, '');
  // Aplica a máscara
  return digits.replace(/^(\d{2})(\d{2})(\d{5})(\d{4})$/, '+$1 ($2) $3-$4');
}

// Componente Dropdown para Kanban
function KanbanDropdown({ theme, funis, funilAtualId, onSelect }) {
  const [show, setShow] = useState(false);
  const funisDisponiveis = funis.filter(f => f.id !== funilAtualId);
  
  return (
    <div className="dropdown">
      <button
        className={`btn btn-2-${theme} btn-sm no-caret dropdown-toggle`}
        style={{ padding: 6, minWidth: 35, minHeight: 35 }}
        title="Alterar funil"
        onClick={() => setShow(!show)}
      >
        <i className="bi bi-funnel-fill"></i>
      </button>
      {show && (
        <div 
          className={`dropdown-menu input-${theme}`}
          style={{ 
            display: 'block',
            position: 'absolute',
            zIndex: 1000,
            minWidth: '200px'
          }}
        >
          <div className="dropdown-header" style={{ opacity: 1, color: 'var(--placeholder-color)' }}>
            Mover para...
          </div>
          {funisDisponiveis.length === 0 && (
            <div className="dropdown-item disabled">Nenhum outro funil</div>
          )}
          {funisDisponiveis.map(f => (
            <button
              key={f.id}
              className="dropdown-item"
              onClick={() => {
                onSelect(f);
                setShow(false);
              }}
            >
              {f.nome}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Dropdown de gerenciamento de tags
function KanbanTagsDropdown({ theme, leadTags, onChange }) {
  const [show, setShow] = useState(false);
  
  return (
    <div className="dropdown">
      <button
        className={`btn btn-2-${theme} btn-sm no-caret dropdown-toggle`}
        style={{ padding: 6, minWidth: 35, minHeight: 35 }}
        title="Gerenciar tags"
        onClick={() => setShow(!show)}
      >
        <i className="bi bi-tags"></i>
      </button>
      {show && (
        <div 
          className={`dropdown-menu input-${theme}`}
          style={{ 
            display: 'block',
            position: 'absolute',
            zIndex: 1000,
            minWidth: '180px'
          }}
        >
          {/* {allTags.map(tag => (
            <div 
              key={tag} 
              className="dropdown-item d-flex align-items-center gap-2"
              onClick={e => e.stopPropagation()}
            >
              <input
                type="checkbox"
                className="form-check-input"
                id={`tag-${tag}`}
                checked={leadTags.includes(tag)}
                onChange={e => {
                  onChange(tag, e.target.checked);
                }}
                style={{ cursor: 'pointer' }}
              />
              <label 
                htmlFor={`tag-${tag}`} 
                className={`form-check-label card-subtitle-${theme} mb-0`} 
                style={{ cursor: 'pointer' }}
              >
                {tag}
              </label>
            </div>
          ))} */}
        </div>
      )}
    </div>
  );
}

function KanbanPage({ theme }) {
  const [funis, setFunis] = useState([]);
  const [leads, setLeads] = useState([]);
  const [funilSelecionado, setFunilSelecionado] = useState('');
  const [editingEtapaId, setEditingEtapaId] = useState(null);
  const [editingEtapaNome, setEditingEtapaNome] = useState('');
  const [etapas, setEtapas] = useState([])
  const [draggedLead, setDraggedLead] = useState(null);
  const [cards, setCards] = useState([])
  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;
  const [socketInstance] = useState(socket)
  const [leadSelecionado, setLeadSelecionado] = useState(null);

  useEffect(()=>{
    const fetchFunis = async () => {
    try {
      const response = await axios.get(`${url}/kanban/get-funis/${schema}`);
        setFunis(Array.isArray(response.data.name) ? response.data.name : []);
        console.log(response.data)
      } catch (error) {
        console.error('Erro ao buscar funis:', error);
      }
    };
    
    fetchFunis();
  }, [])
  useEffect(() => {
    if (!funilSelecionado) {
      setEtapas([]);
      return;
    }
    const fetchEtapas = async () => {
      try {
        const response = await axios.get(`${url}/kanban/get-stages/${funilSelecionado.charAt(0).toLowerCase() + funilSelecionado.slice(1)}/${schema}`);
        setEtapas(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error(error);
      }
    };
    fetchEtapas();
  }, [funilSelecionado, schema]);

  useEffect(()=>{
    const fetchCards = async()=>{
    try {
        const response = await axios.get(`${url}/kanban/get-cards/${funilSelecionado}/${schema}`)
        setCards(Array.isArray(response.data)?response.data:[response.data])
        console.log(response.data)
      }catch (error) {
      console.error(error)
    } 
  }
  fetchCards()
  }, [funilSelecionado])
 
  // Adiciona/remover listeners globais para mousemove/mouseup
  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e) => {
      const x = e.pageX - (scrollRef.current?.offsetLeft || 0);
      const walk = x - startX;
      if (scrollRef.current) {
        scrollRef.current.scrollLeft = scrollLeft - walk;
      }
    };
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, startX, scrollLeft]);

  const handleMouseDown = (e) => {
    // Só ativa se clicar no container, não em um card
    if (e.button !== 0) return;
    if (e.target.closest('.kanban-card')) return;
    setIsDragging(true);
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0));
    setScrollLeft(scrollRef.current?.scrollLeft || 0);
  };

  const funilAtual = funis.find(f => f.id === funilSelecionado) || { etapas: [], contatosVinculados: [], filasVinculadas: [] };

  // CRUD de etapas e tags: placeholders para modais ou menus
  const handleAddEtapa = () => setShowGerirEtapaModal(true);
  const handleEditEtapa = (etapa) => {
    setEditingEtapaId(etapa.id);
    setEditingEtapaNome(etapa.etapa);
  };
  const handleSaveEditEtapa = async(etapa) => {
    setFunis(funis => funis.map(f =>
      f.id === funilSelecionado
        ? { ...f, etapas: f.etapas.map(e =>
            e.id === etapa.id ? { ...e, name: editingEtapaNome } : e
          ) }
        : f
    ));
    const response = await axios.put(`${url}/kanban/update-stage-name`,{
      etapa_id:editingEtapaId,
      etapa_nome:editingEtapaNome,
      sector: funilSelecionado,
      schema: schema
    })

     setEtapas(etapas =>
    etapas.map(e =>
      e.id === etapa.id ? { ...e, etapa: editingEtapaNome } : e
    )
  );

    
    setEditingEtapaId(null);
    setEditingEtapaNome('');
  };
  const [showExcluirEtapaModal, setShowExcluirEtapaModal] = useState(false);
  const [etapaParaExcluir, setEtapaParaExcluir] = useState(null);

  const handleDeleteEtapa = (etapa) => {
    setEtapaParaExcluir(etapa);
    setShowExcluirEtapaModal(true);
  };
  const handleConfirmarExcluirEtapa = () => {
    setFunis(funis => funis.map(f =>
      f.id === funilSelecionado
        ? { ...f, etapas: f.etapas.filter(e => e.id !== etapaParaExcluir.id) }
        : f
    ));
    setShowExcluirEtapaModal(false);
    setEtapaParaExcluir(null);
  };
  const handleManageTags = (lead) => alert(`Gerenciar tags de ${lead.nome}`);

  // Drag and drop handlers
  const onDragStart = (lead) => setDraggedLead(lead);
  const onDrop = async(etapaId) => {
   if (draggedLead) {
    setCards(cards =>
      cards.map(l =>
        l.id === draggedLead.id ? { ...l, etapa_id: etapaId } : l
      )
    );
    setDraggedLead(null);
    try {
      const respose = await axios.put(`${url}/kanban/change-stage`,{
        chat_id: draggedLead.id,
        stage_id: etapaId,
        schema: schema
      })
      
      socketInstance.emit('leadMoved',{
        chat_id: draggedLead.id,
        stage_id: etapaId,
        schema: schema
      })
      
    } catch (error) {
      console.error(error)
    }
  }
  };
  useEffect(() => {
function handleLeadMoved({ chat_id, etapa_id, stage_id }) {
  const novoEtapaId = etapa_id || stage_id;
  setCards(cards =>
    cards.map(l =>
      l.id === chat_id ? { ...l, etapa_id: novoEtapaId } : l
    )
  );
}
  socketInstance.on('leadMoved', handleLeadMoved);
  return () => {
    socketInstance.off('leadMoved', handleLeadMoved);
  };
}, []);

  const [showNovoFunilModal, setShowNovoFunilModal] = useState(false);
  const [showGerirEtapaModal, setShowGerirEtapaModal] = useState(false);

  useEffect(() => {
}, [funilSelecionado]);
  // Salvar novo funil
  const handleSalvarNovoFunil = ({ titulo, etapas }) => {
    const novoId = funis.length > 0 ? Math.max(...funis.map(f => f.id)) + 1 : 1;
    const novoFunil = {
      id: novoId,
      nome: titulo,
      etapas: etapas.map((etapa, idx) => ({
        id: novoId * 100 + idx + 1, // Garante id único
        nome: etapa.etapa,
        cor: etapa.color
      })),
      contatosVinculados: [],
      usuariosVinculados: [],
      filasVinculadas: []
    };
    setFunis([...funis, novoFunil]);
    setFunilSelecionado(novoId);
  };
useEffect(() => {
  if (funis.length > 0 && !funilSelecionado) {
    setFunilSelecionado(funis[0]);
  }
}, [funis, funilSelecionado]);

  // Salvar etapas do funil
  const handleSalvarEtapas = (novasEtapas) => {
    setFunis(funis.map(f =>
      f.id === funilSelecionado
        ? { ...f, etapas: novasEtapas.map((etapa, idx) => ({
            ...etapa,
            id: f.etapas[idx]?.id || (f.id * 100 + idx + 1)
          })) }
        : f
    ));
  };

  const renderPage = () => {
  if (!leadSelecionado) return null;
  return <ChatPage theme={theme} chat_id={leadSelecionado.id} />;
};
  return leadSelecionado ? (
    renderPage()
  ) :(
    <div className={`main-kanban bg-form-${theme} px-1 pt-3 h-100 w-100`} style={{ minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Seletor de Funil */}
      <div className="d-flex align-items-center justify-content-between gap-3 mb-3">

        <div className={`d-flex flex-row align-items-center mb-0 ms-3 header-text-${theme} gap-2`}>
          <h2 style={{ color: 'var(--placeholder-color)', fontWeight: 400 }}>Kanban</h2>
          <h2 style={{ fontWeight: 400 }}>
  {funilSelecionado
    ? funilSelecionado.charAt(0).toUpperCase() + funilSelecionado.slice(1)
    : ''}
</h2>
        </div>
        
        <div className="d-flex gap-2 align-items-center">
            <div className="input-group">
                <span className={`input-group-text igt-${theme}`}>
                    <i className="bi bi-funnel-fill"></i>
                </span>
                <select
  className={`form-select input-${theme}`}
  style={{ width: 150 }}
  value={funilSelecionado}
   onChange={e => {
    setFunilSelecionado(e.target.value);
    console.log('funilSelecionado:', e.target.value);
  }}
>
  {funis.map(nome => (
    <option key={nome} value={nome}>
      {nome.charAt(0).toUpperCase() + nome.slice(1)}
    </option>
  ))}
</select>
            </div>

            <button className={`btn btn-1-${theme}`} style={{ minWidth: 140 }} onClick={() => setShowNovoFunilModal(true)}>
                <i className="bi bi-funnel me-2"></i>Novo Funil
            </button>
            
            <button className={`btn btn-1-${theme}`} style={{ minWidth: 140 }} onClick={handleAddEtapa}>
                <i className="bi bi-layout-sidebar-inset me-2"></i>Gerir Etapas
            </button>

        </div>
      </div>

      {/* Vinculações */}
      <div id="vinculados" className="w-100">
        <div className={`px-3 mb-3 card-${theme} d-flex flex-row align-items-center justify-content-between`}
          style={{ 
            overflowX: 'auto', whiteSpace: 'nowrap',
            borderRadius: '0.375rem', 
            padding: '6px',
            border: `1px solid var(--border-color-${theme})`
          }}>
          
          {/* Contatos */}
          <div className="d-flex flex-row align-items-center">
            <span className={`card-subtitle-${theme} me-2`}>
              <i className="bi bi-whatsapp me-2"></i> Contatos 
            </span>
            {(funilAtual.contatosVinculados || []).map((num, i) => (
              <span key={num} className="badge bg-primary me-2">{maskPhone(num)}</span>
            ))}
          </div>

          {/* Divider Vertical entre Contatos e Filas */}
          <div style={{
            width: '1px',
            height: '30px',
            backgroundColor: `var(--border-color-${theme})`,
            margin: '0 10px'
          }}></div>

          {/* Filas */}
          <div className="d-flex flex-row align-items-center">
            <span className={`card-subtitle-${theme} me-2`}>
              <i className="bi bi-diagram-3 me-2"></i> Filas
            </span>
            {(funilAtual.filasVinculadas || []).map((fila) => (
              <span key={fila.id} className="badge bg-secondary me-2">{fila.nome}</span>
            ))}
          </div>

          {/* Divider Vertical entre Filas e Usuários */}
          <div style={{
            width: '1px',
            height: '30px',
            backgroundColor: `var(--border-color-${theme})`,
            margin: '0 10px'
          }}></div>

          {/* Usuários */}
          <div className="d-flex flex-row align-items-center">
            <span className={`card-subtitle-${theme} me-2`}>
              <i className="bi bi-people me-2"></i> Usuários 
            </span>
            {(funilAtual.usuariosVinculados || []).map((usuario) => (
              <span key={usuario.id} className="badge bg-secondary me-2">{usuario.nome}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Colunas do Kanban (etapas) */}
      <div style={{ width: '100%', height: '100%' }}>
        <div
          className="kanban-scroll-container"
          ref={scrollRef}
          style={{
            overflowX: 'auto',
            height: '100%',
            border: `1px solid var(--border-color-${theme})`,
            padding: '12px',
            borderRadius: '0.375rem',
            background: 'inherit'
          }}
          onMouseDown={handleMouseDown}
        >
          <div className="d-flex flex-row gap-4"
            style={{ minHeight: 0, minWidth: '100%', width: 'max-content' }}>
            {etapas.map(etapa => {
              const etapaTemLeads = leads.some(lead => lead.funilId === funilSelecionado && lead.etapaId === etapa.id);
              return   (
                <div key={etapa.id} className={`kanban-col card-${theme} border border-${theme} rounded p-2`} style={{ minWidth: 300, maxWidth: 300 }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => onDrop(etapa.id)}
                >
                  <div className="d-flex flex-column mb-2 mx-2">
                    <div
                      style={{
                        width: '100%',
                        height: '6px',
                        background: `${etapa.color}`,
                        borderRadius: '4px',
                        marginBottom: '8px'
                      }}
                    />
                    <div className="d-flex flex-row justify-content-between align-items-center mb-2">
                      {editingEtapaId === etapa.id ? (
                        <input
                          className={`form-control input-${theme} mb-0`}
                          style={{ maxWidth: 160, fontWeight: 600, fontSize: '1rem', lineHeight: '1.2', height: 'auto', padding: '2px 8px' }}
                          value={editingEtapaNome}
                          autoFocus
                          onChange={e => setEditingEtapaNome(e.target.value)}
                          onBlur={() => handleSaveEditEtapa(etapa)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveEditEtapa(etapa); }}
                        />
                      ) : (
                        <h6 className={`mb-0 header-text-${theme}`} style={{ fontWeight: 600 }}>{etapa.etapa}</h6>
                      )}
                      <div className="d-flex gap-1">
                        <button
                          className={`btn btn-sm btn-2-${theme} ${editingEtapaId === etapa.id ? 'disabled-btn' : ''}`}
                          title="Editar etapa"
                          onClick={() => handleEditEtapa(etapa)}
                          disabled={editingEtapaId === etapa.id}
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className={`btn btn-sm btn-2-${theme} delete-btn`}
                          title="Excluir etapa"
                          onClick={() => handleDeleteEtapa(etapa)}
                          disabled={etapaTemLeads}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>

                    {/* Container para os leads com scroll */}
                    <div style={{ 
                      maxHeight: '580px', // Altura máxima para ~5 cards
                      overflowY: 'auto',
                      paddingRight: '4px' // Espaço para a scrollbar
                    }}>
                      {/* Renderizando os leads filtrados */}
                      {(cards.filter(lead => lead.etapa_id === etapa.id) || []).map(lead => (
                        <div key={lead.id} className={`kanban-card card-${theme} border border-${theme} mb-2 py-2 px-3`}
                          draggable
                          onDragStart={() => onDragStart(lead)}
                        >
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className={`fw-bold header-text-${theme}`}>{lead.contact_name}</span>
                            <div className="d-flex gap-1">
                              {/* Dropdown de gerenciamento de tags */}
                              <KanbanTagsDropdown
                                theme={theme}
                                leadTags={lead.tags || []}
                                onChange={(tag, checked) => {
                                  setLeads(leads => leads.map(l =>
                                    l.id === lead.id
                                      ? { ...l, tags: checked
                                        ? [...(l.tags || []), tag]
                                        : (l.tags || []).filter(t => t !== tag)
                                      }
                                      : l
                                  ));
                                }}
                              />
                              {/* Dropdown de alterar funil */}
                              <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                                <KanbanDropdown
                                  theme={theme}
                                  funis={funis}
                                  funilAtualId={funilSelecionado}
                                  onSelect={f => alert(`Mover lead para o funil: ${f.nome}`)}
                                />
                              </span>
                              <button
  className="btn btn-sm btn-2-light"
  title="Abrir chat"
  style={{ cursor: 'pointer', minWidth: 35, minHeight: 35 }}
  onClick={() => setLeadSelecionado(lead)}
>
  <i className="bi bi-chat-dots"></i>
</button>
                            </div>
                          </div>
                          {/* Exibir tags do lead */}
                          <div className="mt-1 mb-1 d-flex flex-wrap gap-1">
                            {(lead.tags || []).map(tag => (
                              <span key={tag} className="badge bg-secondary">{tag}</span>
                            ))}
                          </div>
                          <div className={`small header-text-${theme}`}>{maskPhone(lead.contact_phone)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal de Novo Funil */}
      <NovoFunilModal
        theme={theme}
        show={showNovoFunilModal}
        onHide={() => setShowNovoFunilModal(false)}
        onSave={handleSalvarNovoFunil}
      />
      {/* Modal de Gerir Etapas */}
      <GerirEtapaModal
        theme={theme}
        show={showGerirEtapaModal}
        onHide={() => setShowGerirEtapaModal(false)}
        onSave={handleSalvarEtapas}
        funil={funilSelecionado}
        etapas={etapas}
      />
      {/* Modal de Excluir Etapa */}
      <KanbanExcluirEtapaModal
        show={showExcluirEtapaModal}
        onHide={() => setShowExcluirEtapaModal(false)}
        onConfirm={handleConfirmarExcluirEtapa}
        etapa={etapaParaExcluir}
        funil={funilSelecionado}
        theme={theme}
      />

    </div>
  );
}

export default KanbanPage;