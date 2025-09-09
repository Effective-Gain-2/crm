import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Modal } from 'react-bootstrap';
import { useToast } from '../../contexts/ToastContext';

function SortableEtapa({ etapa, idx, theme, handleEtapaChange, handleMoveEtapa, handleRemoveEtapa, etapas, onDragStart, isDragging, dragOverIndex }) {
  const handleDragStart = (e) => {
    onDragStart(etapa);
    
    // Criar um elemento de drag mais robusto
    const dragElement = document.createElement('div');
    dragElement.style.position = 'absolute';
    dragElement.style.top = '-1000px';
    dragElement.style.left = '-1000px';
    dragElement.style.padding = '12px 20px';
    dragElement.style.background = theme === 'light' ? '#ffffff' : '#2c2c2c';
    dragElement.style.border = '1px solid #007bff';
    dragElement.style.borderRadius = '8px';
    dragElement.style.color = theme === 'light' ? '#333333' : '#ffffff';
    dragElement.style.fontSize = '14px';
    dragElement.style.fontWeight = '500';
    dragElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    dragElement.style.zIndex = '9999';
    dragElement.style.pointerEvents = 'none';
    dragElement.style.minWidth = '150px';
    dragElement.style.textAlign = 'center';
    dragElement.style.fontFamily = 'Arial, sans-serif';
    
    // Garantir que temos o nome da etapa
    const etapaNome = etapa.nome || etapa.etapa || 'Nova Etapa';
    dragElement.textContent = etapaNome;
    
    // Adicionar o elemento ao DOM
    document.body.appendChild(dragElement);
    
    // Definir o drag image
    e.dataTransfer.setDragImage(dragElement, dragElement.offsetWidth / 2, dragElement.offsetHeight / 2);
    
    // Remover o elemento após o drag começar
    setTimeout(() => {
      if (document.body.contains(dragElement)) {
        document.body.removeChild(dragElement);
      }
    }, 0);
  };

  const etapaId = etapa.uid || etapa.id || `temp-${idx}`;
  const isBeingDragged = isDragging && (isDragging.uid === etapaId || isDragging.id === etapaId);
  const showDropIndicator = dragOverIndex === idx && !isBeingDragged;

  return (
    <div 
      className="row mb-3 mx-1 d-flex justify-content-between align-items-center" 
      style={{ 
        borderRight: '1px solid var(--placeholder-color)', 
        WebkitBorderTopRightRadius: '8px', 
        WebkitBorderBottomRightRadius: '8px',
        position: 'relative',
        opacity: isBeingDragged ? 0.5 : 1,
        transform: isBeingDragged ? 'scale(0.95)' : 'scale(1)',
        transition: 'all 0.2s ease'
      }}
    >
      {/* Indicador de drop */}
      {showDropIndicator && (
        <div 
          style={{
            position: 'absolute',
            top: '-8px',
            left: '0',
            right: '0',
            height: '2px',
            background: '#007bff',
            borderRadius: '1px',
            zIndex: 10
          }}
        />
      )}
      
      <div 
        className="col-auto d-flex align-items-center"
        draggable
        onDragStart={handleDragStart}
        style={{ 
          cursor: 'grab',
          height: '30px',
          width: '16px',
          color: 'var(--primary-color)',
          border: '1px solid var(--placeholder-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
          zIndex: 1
        }}
        title="Arrastar para reordenar"
      >
        <i className="bi bi-grip-vertical"></i>
      </div>
      <div className="col-6" style={{ borderLeft: '1px solid var(--placeholder-color)', WebkitBorderTopLeftRadius: '8px', WebkitBorderBottomLeftRadius: '8px' }}>
        <label className={`form-label card-subtitle-${theme}`}>Nome da Etapa</label>
        <input
          type="text"
          className={`form-control input-${theme}`}
          value={etapa.nome ?? etapa.etapa ?? ''}
          onChange={e => handleEtapaChange(idx, 'nome', e.target.value)}
          placeholder={`Nome da etapa ${idx + 1}`}
        />
      </div>
      <div className="col-3 d-flex align-items-center">
        <div className="w-100">
          <label className={`form-label card-subtitle-${theme}`}>Cor</label>
          <input
            type="color"
            className={`form-control form-control-color border-${theme}`}
            value={/^#[0-9A-Fa-f]{6}$/.test(etapa.cor) ? etapa.cor : '#2ecc71'}
            onChange={e => handleEtapaChange(idx, 'cor', e.target.value)}
            title="Escolha a cor da etapa"
            style={{ width: '100%', backgroundColor: 'transparent' }}
          />
        </div>
      </div>
      <div className="col-2 d-flex align-items-center gap-1 h-100">
        <button
          className={`btn btn-sm btn-2-${theme}`}
          onClick={() => handleMoveEtapa(idx, -1)}
          disabled={idx === 0}
          title="Mover para cima"
        >
          <i className="bi bi-arrow-up"></i>
        </button>
        <button
          className={`btn btn-sm btn-2-${theme}`}
          onClick={() => handleMoveEtapa(idx, 1)}
          disabled={idx === etapas.length - 1}
          title="Mover para baixo"
        >
          <i className="bi bi-arrow-down"></i>
        </button>
        <button
          className="btn btn-sm delete-btn"
          onClick={() => handleRemoveEtapa(idx)}
          disabled={etapas.length <= 1}
          title="Remover etapa"
        >
          <i className="bi bi-trash"></i>
        </button>
      </div>
    </div>
  );
}

function GerirEtapaModal({ theme, show, onHide, onSave, funil, etapas: etapasProp }) {
  const { showError } = useToast();
  const [etapas, setEtapas] = useState(etapasProp || []);
  const [draggedEtapa, setDraggedEtapa] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;

  React.useEffect(() => {
    setEtapas(etapasProp || []);
  }, [etapasProp, show]);

  useEffect(() => {
    const fetchEtapas = async () => {
      try {
        const response = await axios.get(`${url}/kanban/get-stages/${funil}/${schema}`,
        {
      withCredentials: true
    });
        const etapasConvertidas = (Array.isArray(response.data) ? response.data : [response.data]).map((e, i) => ({
          ...e,
          cor: e.cor ?? e.color ?? '#2ecc71',
          index: e.pos ?? i,
          uid: e.uid || e.id || `etapa-${i}`
        }));
        setEtapas(etapasConvertidas);
      } catch (error) {
        console.error('Erro ao buscar etapas:', error);
      }
    };
    if (show) fetchEtapas();
  }, [funil, show, schema, url]);

  const handleDragStart = (etapa) => {
    setDraggedEtapa(etapa);
  };

  const handleDragEnd = () => {
    setDraggedEtapa(null);
    setDragOverIndex(null);
  };

  const handleDrop = (targetIdx) => {
    if (!draggedEtapa) return;
    
    const draggedIdx = etapas.findIndex(e => {
      const draggedId = draggedEtapa.uid || draggedEtapa.id;
      const currentId = e.uid || e.id;
      return draggedId === currentId;
    });
    
    if (draggedIdx === -1 || draggedIdx === targetIdx) {
      setDragOverIndex(null);
      return;
    }

    const newEtapas = [...etapas];
    const [removed] = newEtapas.splice(draggedIdx, 1);
    newEtapas.splice(targetIdx, 0, removed);
    
    // Atualiza o index de cada etapa
    newEtapas.forEach((etapa, i) => etapa.index = i);
    setEtapas(newEtapas);
    setDraggedEtapa(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (draggedEtapa) {
      setDragOverIndex(idx);
    }
  };

  const handleDragEnter = (e, idx) => {
    e.preventDefault();
    if (draggedEtapa) {
      setDragOverIndex(idx);
    }
  };

  const handleDragLeave = (e) => {
    // Só limpa se realmente saiu da área de drop
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const handleMoveEtapa = (idx, direction) => {
    const newEtapas = [...etapas];
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= etapas.length) return;
    // Troca as etapas de lugar
    [newEtapas[idx], newEtapas[targetIdx]] = [newEtapas[targetIdx], newEtapas[idx]];
    // Atualiza o index de cada etapa
    newEtapas.forEach((etapa, i) => etapa.index = i);
    setEtapas(newEtapas);
  };

  const handleEtapaChange = (index, field, value) => {
    const novasEtapas = etapas.map((etapa, i) =>
      i === index ? { ...etapa, [field]: value } : etapa
    );
    setEtapas(novasEtapas);
  };

  const handleAddEtapa = () => {
    setEtapas([
      ...etapas,
      { uid: uuidv4(), nome: '', cor: '#2ecc71', index: etapas.length }
    ]);
  };

  const handleRemoveEtapa = (index) => {
    if (etapas.length <= 1) return;
    setEtapas(etapas.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (etapas.some(e => !(e.nome ?? e.etapa) || !e.cor)) {
      showError('Preencha todos os campos obrigatórios das etapas.');
      return;
    }
    try {
      for (const etapa of etapas) {
        if (!etapa.id) {
          await axios.post(`${url}/kanban/create-kanban`, {
            name: etapa.nome,
            color: etapa.cor,
            sector: funil,
            schema: schema,
            pos: etapa.index
          },
        {
      withCredentials: true
    });
        } else {
          await axios.put(`${url}/kanban/update-stage-name`, {
            etapa_id: etapa.id,
            etapa_nome: etapa.nome ?? etapa.etapa,
            sector: funil,
            color: etapa.cor,
            schema: schema,
            index: etapa.index
          },
        {
      withCredentials: true
    });
        }
      }
      
      // Busca as etapas atualizadas do backend para garantir que os IDs estejam corretos
      try {
        const response = await axios.get(`${url}/kanban/get-stages/${funil}/${schema}`,
        {
      withCredentials: true
    });
        const etapasAtualizadas = (Array.isArray(response.data) ? response.data : [response.data]).map((e, i) => ({
          ...e,
          cor: e.cor ?? e.color ?? '#2ecc71',
          index: e.pos ?? i,
          uid: e.uid || e.id || `etapa-${i}`,
          nome: e.nome || e.etapa
        }));
        
        if (onSave) onSave(etapasAtualizadas);
      } catch (error) {
        console.error('Erro ao buscar etapas atualizadas:', error);
        // Se falhar ao buscar, usa as etapas locais
        if (onSave) onSave(etapas);
      }
    } catch (error) {
      console.error(error);
      showError('Erro ao salvar etapas!');
      return;
    }
    
    if (onHide) onHide();
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      backdrop="static"
      className={`modal-${theme}`}
    >
      <Modal.Header closeButton className={`bg-form-${theme}`}>
        <div className="d-flex align-items-center gap-3">
          <i className={`bi bi-layout-sidebar-inset header-text-${theme}`}></i>
          <h5 className={`modal-title header-text-${theme}`}>Gerir Etapas do Funil</h5>
        </div>
      </Modal.Header>

      <Modal.Body className={`bg-form-${theme}`}>
        <div className="mb-3">
          <label className={`form-label card-subtitle-${theme}`}>Funil Selecionado</label>
          <input
            type="text"
            className={`form-control input-${theme}`}
            style={{ backgroundColor: 'transparent' }}
            value={funil.charAt(0).toUpperCase() + funil.slice(1) || ''}
            disabled
          />
        </div>
        <div 
          className="d-flex flex-column gap-2" 
          style={{ position: 'relative' }}
          onDragEnd={handleDragEnd}
        >
          {etapas.map((etapa, idx) => (
            <div
              key={etapa.uid || etapa.id || `etapa-${idx}`}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnter={(e) => handleDragEnter(e, idx)}
              onDragLeave={(e) => handleDragLeave(e)}
              onDrop={() => handleDrop(idx)}
              style={{ 
                position: 'relative',
                minHeight: '20px',
                padding: '4px 0'
              }}
            >
              <SortableEtapa
                etapa={etapa}
                idx={idx}
                theme={theme}
                handleEtapaChange={handleEtapaChange}
                handleMoveEtapa={handleMoveEtapa}
                handleRemoveEtapa={handleRemoveEtapa}
                etapas={etapas}
                onDragStart={handleDragStart}
                isDragging={draggedEtapa}
                dragOverIndex={dragOverIndex}
              />
            </div>
          ))}
          
          {/* Área de drop no final da lista */}
          <div
            onDragOver={(e) => handleDragOver(e, etapas.length)}
            onDragEnter={(e) => handleDragEnter(e, etapas.length)}
            onDragLeave={(e) => handleDragLeave(e)}
            onDrop={() => handleDrop(etapas.length)}
            style={{
              position: 'relative',
              minHeight: '20px',
              padding: '4px 0',
              border: dragOverIndex === etapas.length ? '2px dashed #007bff' : '2px dashed transparent',
              borderRadius: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            {dragOverIndex === etapas.length && (
              <div 
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: '#007bff',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Soltar aqui para adicionar ao final
              </div>
            )}
          </div>
        </div>
        <button className={`btn btn-2-${theme} w-100 mb-2 mt-3`} onClick={handleAddEtapa}>
          <i className="bi bi-plus-circle me-2"></i>Nova Etapa
        </button>
      </Modal.Body>

      <Modal.Footer className={`bg-form-${theme}`}>
        <button type="button" className={`btn btn-2-${theme}`} onClick={onHide}>Cancelar</button>
        <button type="button" className={`btn btn-1-${theme}`} onClick={handleSave}>Salvar Etapas</button>
      </Modal.Footer>
    </Modal>
  );
}

export default GerirEtapaModal; 