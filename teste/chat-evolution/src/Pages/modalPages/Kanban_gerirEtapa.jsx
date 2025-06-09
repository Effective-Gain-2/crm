import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

function SortableEtapa({ etapa, idx, theme, handleEtapaChange, handleMoveEtapa, handleRemoveEtapa, etapas, onDragStart }) {
  const handleDragStart = (e) => {
    onDragStart(etapa);
    
    // Obter valores computados das variáveis CSS
    const root = document.documentElement;
    const bgColor = getComputedStyle(root).getPropertyValue(`--bg-color-${theme}`) || '#222';
    const textColor = getComputedStyle(root).getPropertyValue(`--text-color-${theme}`) || '#fff';
    const borderColor = getComputedStyle(root).getPropertyValue('--placeholder-color') || '#888';

    const dragElement = document.createElement('div');
    dragElement.style.position = 'absolute';
    dragElement.style.top = '-1000px';
    dragElement.style.padding = '8px 16px';
    dragElement.style.background = bgColor.trim();
    dragElement.style.border = `1px solid ${borderColor.trim()}`;
    dragElement.style.borderRadius = '4px';
    dragElement.style.color = textColor.trim();
    dragElement.style.fontSize = '14px';
    dragElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    dragElement.style.zIndex = '9999';
    dragElement.style.pointerEvents = 'none';
    
    // Garantir que temos o nome da etapa
    const etapaNome = etapa.nome || etapa.etapa || 'Nova Etapa';
    dragElement.textContent = etapaNome;
    
    // Adicionar o elemento ao DOM antes de definir o drag image
    document.body.appendChild(dragElement);
    
    // Definir o drag image
    e.dataTransfer.setDragImage(dragElement, dragElement.offsetWidth / 2, dragElement.offsetHeight / 2);
    
    // Remover o elemento após o drag começar
    requestAnimationFrame(() => {
      document.body.removeChild(dragElement);
    });
  };

  return (
    <div className="row mb-3 mx-1 d-flex justify-content-between align-items-center" style={{ borderRight: '1px solid var(--placeholder-color)', WebkitBorderTopRightRadius: '8px', WebkitBorderBottomRightRadius: '8px' }}>
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
          borderRadius: '4px'
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
      <div className="col-3 d-flex align-items-center" >
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
  const [etapas, setEtapas] = useState(etapasProp || []);
  const [draggedEtapa, setDraggedEtapa] = useState(null);
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;

  React.useEffect(() => {
    setEtapas(etapasProp || []);
  }, [etapasProp, show]);

  useEffect(() => {
    const fetchEtapas = async () => {
      const response = await axios.get(`${url}/kanban/get-stages/${funil}/${schema}`);
      const etapasConvertidas = (Array.isArray(response.data) ? response.data : [response.data]).map((e, i) => ({
        ...e,
        cor: e.cor ?? e.color ?? '#2ecc71',
        index: e.pos ?? i
      }));
      setEtapas(etapasConvertidas);
    };
    if (show) fetchEtapas();
  }, [funil, show]);

  const handleDragStart = (etapa) => {
    setDraggedEtapa(etapa);
  };

  const handleDrop = (targetIdx) => {
    if (!draggedEtapa) return;
    
    const draggedIdx = etapas.findIndex(e => e.uid === draggedEtapa.uid);
    if (draggedIdx === targetIdx) return;

    const newEtapas = [...etapas];
    const [removed] = newEtapas.splice(draggedIdx, 1);
    newEtapas.splice(targetIdx, 0, removed);
    
    // Atualiza o index de cada etapa
    newEtapas.forEach((etapa, i) => etapa.index = i);
    setEtapas(newEtapas);
    setDraggedEtapa(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
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
      alert('Preencha todos os campos obrigatórios das etapas.');
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
          });
        } else {
          await axios.put(`${url}/kanban/update-stage-name`, {
            etapa_id: etapa.id,
            etapa_nome: etapa.nome ?? etapa.etapa,
            sector: funil,
            color: etapa.cor,
            schema: schema,
            index: etapa.index
          });
        }
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar etapas!');
    }
    if (onSave) onSave(etapas);
    if (onHide) onHide();
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content" style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <div className="modal-header gap-3">
            <i className={`bi bi-layout-sidebar-inset header-text-${theme}`}></i>
            <h5 className={`modal-title header-text-${theme}`}>Gerir Etapas do Funil</h5>
            <button type="button" className="btn-close" onClick={onHide}></button>
          </div>
          <div className="modal-body">
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
            <div className="d-flex flex-column gap-2">
              {etapas.map((etapa, idx) => (
                <div
                  key={etapa.uid}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(idx)}
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
                  />
                </div>
              ))}
            </div>
            <button className={`btn btn-2-${theme} w-100 mb-2 mt-3`} onClick={handleAddEtapa}>
              <i className="bi bi-plus-circle me-2"></i>Nova Etapa
            </button>
          </div>
          <div className="modal-footer">
            <button type="button" className={`btn btn-2-${theme}`} onClick={onHide}>Cancelar</button>
            <button type="button" className={`btn btn-1-${theme}`} onClick={handleSave}>Salvar Etapas</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GerirEtapaModal; 