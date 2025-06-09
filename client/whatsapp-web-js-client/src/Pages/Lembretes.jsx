import React, { useState, useRef, useEffect } from 'react';
import * as bootstrap from 'bootstrap';
import anime from 'animejs';
import LembreteNovoLembrete from './modalPages/Lembrete_novoLembrete';
import LembreteDeletarLembrete from './modalPages/Lembrete_deletarLembrete';

const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Mock de lembretes
const mockLembretes = [
  { id: 1, tipo: 'geral', titulo: 'Reunião Geral', mensagem: 'Reunião mensal da empresa', data: '2025-06-10T10:00', icone: 'bi-globe-americas', filas: ['1', '2', '3', '4', '5'] },
  { id: 2, tipo: 'setorial', titulo: 'Meta do Setor', mensagem: 'Alinhar metas do mês', data: '2025-06-10T14:00', icone: 'bi-diagram-3', filas: ['1', '2'] },
  { id: 3, tipo: 'pessoal', titulo: 'Dentista', mensagem: 'Consulta marcada', data: '2025-06-10T15:30', icone: 'bi-alarm', filas: [] },
  { id: 4, tipo: 'geral', titulo: 'Treinamento de Equipe', mensagem: 'Treinamento sobre novas funcionalidades', data: '2025-06-05T09:00', icone: 'bi-people', filas: ['1', '2', '3', '4', '5'] },
  { id: 5, tipo: 'setorial', titulo: 'Reunião de Vendas', mensagem: 'Análise de resultados do mês', data: '2025-06-05T11:00', icone: 'bi-graph-up', filas: ['2'] },
  { id: 6, tipo: 'pessoal', titulo: 'Entrega de Relatório', mensagem: 'Finalizar relatório mensal', data: '2025-06-18T16:00', icone: 'bi-file-earmark-text', filas: [] },
  { id: 7, tipo: 'geral', titulo: 'Atualização do Sistema', mensagem: 'Manutenção programada', data: '2025-06-18T22:00', icone: 'bi-gear', filas: ['1', '2', '3', '4', '5'] },
  { id: 8, tipo: 'setorial', titulo: 'Capacitação', mensagem: 'Workshop de atendimento', data: '2025-06-08T13:00', icone: 'bi-book', filas: ['1', '2'] },
  { id: 9, tipo: 'pessoal', titulo: 'Aniversário Cliente', mensagem: 'Enviar parabéns para João Silva', data: '2025-06-14T10:00', icone: 'bi-gift', filas: [] },
  { id: 10, tipo: 'geral', titulo: 'Feriado', mensagem: 'Dia de Corpus Christi', data: '2025-06-19T00:00', icone: 'bi-calendar-event', filas: ['1', '2', '3', '4', '5'] },
  { id: 11, tipo: 'setorial', titulo: 'Reunião de Suporte', mensagem: 'Alinhamento da equipe de suporte', data: '2025-06-19T11:00', icone: 'bi-headset', filas: ['1'] },
  { id: 12, tipo: 'pessoal', titulo: 'Follow-up Cliente', mensagem: 'Ligar para Maria Souza', data: '2025-06-19T14:30', icone: 'bi-telephone', filas: [] },
  { id: 13, tipo: 'geral', titulo: 'Encerramento do Mês', mensagem: 'Fechamento das atividades de junho', data: '2025-06-30T17:00', icone: 'bi-calendar-check', filas: ['1', '2', '3', '4', '5'] },
  { id: 14, tipo: 'setorial', titulo: 'Análise de Métricas', mensagem: 'Revisão dos indicadores de performance', data: '2025-06-30T10:00', icone: 'bi-bar-chart', filas: ['1', '2', '3'] },
  { id: 15, tipo: 'pessoal', titulo: 'Backup Mensal', mensagem: 'Realizar backup dos dados', data: '2025-06-30T23:00', icone: 'bi-cloud-upload', filas: [] },
  { id: 16, tipo: 'geral', titulo: 'Coffee Break', mensagem: 'Pausa para café com a equipe', data: '2025-06-10T16:00', icone: 'bi-cup-hot', filas: ['1', '2', '3', '4', '5'] },
  { id: 17, tipo: 'setorial', titulo: 'Feedback Individual', mensagem: 'Reuniões individuais de feedback', data: '2025-06-05T14:00', icone: 'bi-person-lines-fill', filas: ['1'] },
  { id: 18, tipo: 'pessoal', titulo: 'Almoço com Cliente', mensagem: 'Almoço com Tech Solutions', data: '2025-06-18T12:00', icone: 'bi-basket', filas: [] },
  { id: 19, tipo: 'geral', titulo: 'Apresentação de Projeto', mensagem: 'Apresentar novo projeto ao cliente', data: '2025-06-19T15:00', icone: 'bi-presentation', filas: ['1', '2', '3', '4', '5'] },
  { id: 20, tipo: 'setorial', titulo: 'Treinamento de Vendas', mensagem: 'Workshop de técnicas de vendas', data: '2025-06-30T09:00', icone: 'bi-graph-up-arrow', filas: ['2'] },
  { id: 21, tipo: 'pessoal', titulo: 'Reunião de Equipe', mensagem: 'Alinhamento diário da equipe', data: '2025-06-10T09:00', icone: 'bi-people-fill', filas: [] },
  { id: 22, tipo: 'geral', titulo: 'Integração de Sistemas', mensagem: 'Teste de integração com novo sistema', data: '2025-06-05T16:00', icone: 'bi-hdd-network', filas: ['1', '2', '3', '4', '5'] }
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}

function LembretesPage({ theme }) {
  const [showNovoLembrete, setShowNovoLembrete] = useState(false);
  const [lembretes, setLembretes] = useState(mockLembretes);
  const hoje = new Date();
  const [mesAtual, setMesAtual] = useState(hoje.getMonth());
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());
  const [popoverDia, setPopoverDia] = useState(null); // {dia, anchor}
  const iconRefs = useRef({});
  const [lembreteEditando, setLembreteEditando] = useState(null);
  const [lembreteDeletando, setLembreteDeletando] = useState(null);
  const [shownToasts, setShownToasts] = useState([]);
  const buttonRefs = useRef({});

  // Navegação do calendário
  const handlePrevMonth = () => {
    if (mesAtual === 0) {
      setMesAtual(11);
      setAnoAtual(anoAtual - 1);
    } else {
      setMesAtual(mesAtual - 1);
    }
  };
  const handleNextMonth = () => {
    if (mesAtual === 11) {
      setMesAtual(0);
      setAnoAtual(anoAtual + 1);
    } else {
      setMesAtual(mesAtual + 1);
    }
  };
  const handleHoje = () => {
    const hoje = new Date();
    setMesAtual(hoje.getMonth());
    setAnoAtual(hoje.getFullYear());
  };

  // Adicionar lembrete
  const handleSalvarLembrete = (novo) => {
    setLembretes([...lembretes, { ...novo, id: Date.now() }]);
  };

  // Renderização do calendário
  const diasNoMes = getDaysInMonth(anoAtual, mesAtual);
  const primeiroDiaSemana = getFirstDayOfWeek(anoAtual, mesAtual);
  const dias = [];
  for (let i = 0; i < primeiroDiaSemana; i++) dias.push(null);
  for (let d = 1; d <= diasNoMes; d++) dias.push(d);

  // Agrupar lembretes por dia
  const lembretesPorDia = lembretes.reduce((acc, l) => {
    const data = new Date(l.data);
    if (data.getMonth() === mesAtual && data.getFullYear() === anoAtual) {
      const dia = data.getDate();
      if (!acc[dia]) acc[dia] = [];
      acc[dia].push(l);
    }
    return acc;
  }, {});

  // Ordenar lembretes do mais antigo para o mais recente
  const lembretesOrdenados = [...lembretes].sort((a, b) => new Date(a.data) - new Date(b.data));

  // Adicione este useEffect no início do componente, logo após as declarações de estado
  React.useEffect(() => {
    function handleClickOutside(event) {
      if (popoverDia && !event.target.closest('.expand-container') && !event.target.closest('[data-bs-toggle="popover"]')) {
        setPopoverDia(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [popoverDia]);

  React.useEffect(() => {
    if (lembreteDeletando) {
      const modalElement = document.getElementById('DeleteLembreteModal');
      if (modalElement) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.show();
      }
    }
  }, [lembreteDeletando]);

  // Adicione esta função auxiliar no início do componente, após as declarações de estado
  const formatarFilas = (filas) => {
    if (!filas || filas.length === 0) return '';
    const nomesFilas = {
      '1': 'Suporte',
      '2': 'Vendas',
      '3': 'Financeiro',
      '4': 'Marketing',
      '5': 'RH'
    };
    const filasFormatadas = filas.map(id => nomesFilas[id] || id);
    return filasFormatadas.length === 1 ? filasFormatadas[0] : filasFormatadas.join(' | ');
  };

  // Function to show a toast notification
  const showToast = (lembrete) => {
    const toastId = `toast-${lembrete.id}-${Date.now()}`;
    const isLight = theme === 'light';
    const bgClass = isLight ? 'bg-light' : 'bg-dark';
    const textClass = isLight ? 'text-dark' : 'text-light';
    const iconColor = isLight ? '#212529' : '#E0E0E0';
    const toastElement = document.createElement('div');
    toastElement.className = `toast align-items-center border-0 ${bgClass}`;
    toastElement.setAttribute('role', 'alert');
    toastElement.setAttribute('aria-live', 'assertive');
    toastElement.setAttribute('aria-atomic', 'true');
    toastElement.id = toastId;
    toastElement.innerHTML = `
      <div class="toast-header ${bgClass} ${textClass}" style="background-color: var(--input-bg-color-${theme}); border-bottom: 1px solid var(--border-color-${theme});">
        <i class="bi ${lembrete.tipo === 'geral' ? 'bi-globe-americas' : lembrete.tipo === 'setorial' ? 'bi-diagram-3' : lembrete.icone} me-2" style="color: ${iconColor}"></i>
        <strong class="me-auto">${lembrete.titulo}</strong>
        <button type="button" class="btn-close ms-2 mb-1" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body ${textClass}">
        ${lembrete.mensagem}
        ${lembrete.tipo === 'setorial' && lembrete.filas && lembrete.filas.length > 0 ? 
          `<div style="font-size: 0.85rem; color: var(--placeholder-color); margin-top: 4px;">${formatarFilas(lembrete.filas)}</div>` 
          : ''}
      </div>
    `;
    const toastContainer = document.getElementById('toast-container');
    if (toastContainer) {
      toastContainer.appendChild(toastElement);
      const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: 10000
      });
      toast.show();
      toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
      });
    }
    console.log('Toast disparado:', lembrete);
  };

  // Function to check for due reminders
  const checkDueReminders = () => {
    const now = new Date();
    lembretes.forEach(lembrete => {
      const reminderDate = new Date(lembrete.data);
      const reminderKey = `${lembrete.id}-${reminderDate.toISOString().split('T')[0]}`;
      
      // Check if the reminder is due within the last minute and hasn't been shown yet
      if (reminderDate <= now && 
          reminderDate > new Date(now.getTime() - 60000) && 
          !shownToasts.includes(reminderKey)) {
        showToast(lembrete);
        setShownToasts(prev => [...prev, reminderKey]);
      }
    });
  };

  // Set up interval to check for due reminders
  useEffect(() => {
    const interval = setInterval(checkDueReminders, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [lembretes, shownToasts]);

  // Função para animar o botão
  const animateButton = (button, isExpanding, lembretesDia) => {
    const targetWidth = isExpanding ? Math.max(80, lembretesDia.length * 24) : 80;
    
    anime({
      targets: button,
      width: targetWidth,
      duration: 200,
      easing: 'easeOutQuad',
      begin: () => {
        if (isExpanding) {
          button.style.overflow = 'visible';
          button.style.borderColor = `var(--primary-color)`;
          button.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
          button.style.zIndex = '2';
        }
      },
      complete: () => {
        if (!isExpanding) {
          button.style.overflow = 'hidden';
          button.style.borderColor = `var(--border-color-${theme})`;
          button.style.boxShadow = 'none';
          button.style.zIndex = '1';
        }
      }
    });
  };

  return (
    <div className="h-100 w-100  pt-3">
      {/* Add toast container */}
      <div id="toast-container" className="toast-container position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1060 }}></div>
      
      <div className="d-flex flex-row gap-3 h-100" style={{ minHeight: 400 }}>
        {/* Lista de lembretes à esquerda */}
        <div style={{ width: '30%', minWidth: 220, maxWidth: 400, display: 'flex', flexDirection: 'column', borderRight: `1px solid var(--border-color-${theme})` }} className="px-3">
          <div className="d-flex flex-row align-items-center justify-content-between mb-3">
            <h3 className={`ps-3 title-${theme} m-0`} style={{ fontWeight: 400 }}>Lista</h3>
            <button className={`btn btn-1-${theme} d-flex gap-2 align-items-center`} onClick={() => { setLembreteEditando(null); setShowNovoLembrete(true); }}>
              <i className="bi bi-plus-lg"></i> Novo Lembrete
            </button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {lembretesOrdenados.length === 0 && (
              <div className="text-muted">Nenhum lembrete cadastrado.</div>
            )}
            {lembretesOrdenados.map(l => (
              <div key={l.id} className={`d-flex align-items-center gap-2 mb-2 rounded px-3`} style={{ background: 'var(--input-bg-color-' + theme + ')', border: '1px solid var(--border-color-' + theme + ')', minHeight: 44, paddingTop: 8, paddingBottom: 8 }}>
                <i className={`bi ${l.tipo === 'geral' ? 'bi-globe-americas' : l.tipo === 'setorial' ? 'bi-diagram-3' : l.icone} fs-5 header-text-${theme}`}></i>
                <div className={`flex-grow-1 header-text-${theme}`}>
                  <div className="fw-semibold">{l.titulo}</div>
                  <div className="small">{new Date(l.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })} • {l.tipo.charAt(0).toUpperCase() + l.tipo.slice(1)}</div>
                </div>
                <button
                  className={`btn btn-sm btn-2-${theme}`}
                  style={{ maxWidth: '38px' }}
                  title="Editar"
                  onClick={() => { setLembreteEditando(l); setShowNovoLembrete(true); }}
                >
                  <i className="bi bi-pencil-fill"></i>
                </button>
                <button
                  className={`btn btn-sm delete-btn`}
                  style={{ maxWidth: '38px' }}
                  title="Excluir"
                  onClick={() => setLembreteDeletando(l)}
                >
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            ))}
          </div>
        </div>
        {/* Calendário à direita */}
        <div style={{ width: '70%' }}>
          <div className="d-flex flex-row align-items-center justify-content-between mb-3">
            <h3 className={`ms-3 title-${theme} m-0`} style={{ fontWeight: 400 }}>Calendário</h3>

            <div className="d-flex flex-row gap-2 align-items-center">
              <button className="btn btn-2-light btn-sm" onClick={handleHoje}>Hoje</button>
              <button className="btn btn-2-light btn-sm" onClick={handlePrevMonth}><i className="bi bi-chevron-left"></i></button>
              <span className={`title-${theme} fw-bold`} style={{ minWidth: 120, textAlign: 'center' }}>{meses[mesAtual]} {anoAtual}</span>
              <button className="btn btn-2-light btn-sm" onClick={handleNextMonth}><i className="bi bi-chevron-right"></i></button>
            </div>
          </div>
          <div className={`table-responsive custom-table-${theme}`}>
            <table className="table table-bordered table-hover m-0" style={{ borderColor: `var(--border-color-${theme}) !important` }}>
              <thead>
                <tr>
                  <th>Dom</th><th>Seg</th><th>Ter</th><th>Qua</th><th>Qui</th><th>Sex</th><th>Sáb</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.ceil(dias.length / 7) }).map((_, i) => (
                  <tr key={i}>
                    {dias.slice(i * 7, i * 7 + 7).map((dia, j) => {
                      const lembretesDia = dia ? (lembretesPorDia[dia] || []) : [];
                      return (
                        <td key={j} style={{ verticalAlign: 'top', minWidth: 80, height: 70, position: 'relative', padding: 4 }}>
                          <div className="d-flex flex-column align-items-start h-100">
                            <span className="fw-bold ms-1 mb-1">{dia}</span>
                            <div className="w-100 d-flex justify-content-center">
                              {lembretesDia.length > 0 && (
                                <div
                                  ref={el => { if (dia) buttonRefs.current[dia] = el; }}
                                  className={`px-2 border-rounded position-relative`}
                                  style={{ 
                                    background: 'var(--input-bg-color-' + theme + ')', 
                                    border: '1px solid var(--border-color-' + theme + ')', 
                                    padding: '2px 4px', 
                                    minWidth: 24, 
                                    minHeight: 24, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 6, 
                                    borderRadius: 6, 
                                    justifyContent: 'center', 
                                    cursor: 'pointer',
                                    position: 'relative',
                                    transition: 'border-color 0.2s, box-shadow 0.2s'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (lembretesDia.length > 2) {
                                      const button = e.currentTarget;
                                      button.style.borderColor = `var(--primary-color)`;
                                      button.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                                      button.style.zIndex = '2';
                                      
                                      // Criar ou atualizar o container de expansão
                                      let expandContainer = button.querySelector('.expand-container');
                                      if (!expandContainer) {
                                        expandContainer = document.createElement('div');
                                        expandContainer.className = 'expand-container';
                                        expandContainer.style.cssText = `
                                          position: absolute;
                                          left: 50%;
                                          top: 50%;
                                          transform: translate(-50%, -50%);
                                          background: var(--input-bg-color-${theme});
                                          border: 1px solid var(--primary-color);
                                          border-radius: 6px;
                                          display: flex;
                                          align-items: center;
                                          justify-content: center;
                                          gap: 6px;
                                          padding: 4px 6px;
                                          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                                          z-index: 3;
                                          min-height: 32px;
                                          width: 0;
                                          overflow: hidden;
                                        `;
                                        button.appendChild(expandContainer);
                                      }

                                      // Animar a largura do container de expansão
                                      anime({
                                        targets: expandContainer,
                                        width: Math.max(90, lembretesDia.length * 24),
                                        duration: 150,
                                        easing: 'easeOutQuad'
                                      });

                                      // Adicionar os ícones ao container de expansão
                                      expandContainer.innerHTML = lembretesDia.map(l => `
                                        <i class="bi ${l.tipo === 'geral' ? 'bi-globe-americas' : l.tipo === 'setorial' ? 'bi-diagram-3' : l.icone}" 
                                           style="font-size: 16px; flex-shrink: 0;"></i>
                                      `).join('');
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (lembretesDia.length > 2) {
                                      const button = e.currentTarget;
                                      button.style.borderColor = `var(--border-color-${theme})`;
                                      button.style.boxShadow = 'none';
                                      button.style.zIndex = '1';

                                      const expandContainer = button.querySelector('.expand-container');
                                      if (expandContainer) {
                                        anime({
                                          targets: expandContainer,
                                          width: 0,
                                          duration: 150,
                                          easing: 'easeOutQuad',
                                          complete: () => {
                                            expandContainer.remove();
                                          }
                                        });
                                      }
                                    }
                                  }}
                                  onClick={e => { 
                                    e.stopPropagation(); 
                                    setPopoverDia({ dia, anchor: buttonRefs.current[dia] }); 
                                  }}
                                >
                                  {lembretesDia.slice(0, 2).map((l, idx) => (
                                    <i
                                      key={l.id}
                                      className={`bi ${l.tipo === 'geral' ? 'bi-globe-americas' : l.tipo === 'setorial' ? 'bi-diagram-3' : l.icone}`}
                                      style={{ 
                                        fontSize: 14,
                                        flexShrink: 0
                                      }}
                                    ></i>
                                  ))}
                                  {lembretesDia.length > 2 && (
                                    <i
                                      className={`bi ${lembretesDia[2].tipo === 'geral' ? 'bi-globe-americas' : lembretesDia[2].tipo === 'setorial' ? 'bi-diagram-3' : lembretesDia[2].icone}`}
                                      style={{ 
                                        fontSize: 14,
                                        flexShrink: 0,
                                        WebkitMaskImage: 'linear-gradient(to right, black 0%, transparent 100%)',
                                        maskImage: 'linear-gradient(to right, black 0%, transparent 100%)',
                                        WebkitMaskSize: '100% 100%',
                                        maskSize: '100% 100%',
                                        WebkitMaskRepeat: 'no-repeat',
                                        maskRepeat: 'no-repeat'
                                      }}
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                            {/* Popover de lembretes do dia */}
                            {popoverDia && popoverDia.dia === dia && (
                              <div
                                className={`position-fixed border rounded shadow-sm py-2 px-3`}
                                style={{
                                  zIndex: 10,
                                  top: popoverDia.anchor.getBoundingClientRect().bottom + 4,
                                  left: (() => {
                                    const anchorRect = popoverDia.anchor.getBoundingClientRect();
                                    const windowWidth = window.innerWidth;
                                    const popoverWidth = 180; // minWidth do popover
                                    const rightEdge = anchorRect.left + popoverWidth;
                                    
                                    // Se o popover ultrapassar a janela, ajusta para a esquerda
                                    if (rightEdge > windowWidth) {
                                      return Math.max(10, windowWidth - popoverWidth - 10);
                                    }
                                    return anchorRect.left;
                                  })(),
                                  minWidth: 180,
                                  background: `var(--bg-color-${theme})`,
                                  color: `var(--text-color-${theme})`,
                                  boxShadow: '0 2px 8px 0 rgba(0,0,0,0.07)',
                                  border: `1px solid var(--border-color-${theme}) !important`
                                }}
                              >
                                <div className={`d-flex mb-2 justify-content-center`} style={{ color: `var(--primary-color)` }}>Lembretes - dia {dia}</div>
                                {lembretesDia.map((l, index) => (
                                  <React.Fragment key={l.id}>
                                    <div className="mb-2">
                                      <div className={`d-flex align-items-center gap-2 header-text-${theme}`}> 
                                        <i className={`bi ${l.tipo === 'geral' ? 'bi-globe-americas' : l.tipo === 'setorial' ? 'bi-diagram-3' : l.icone}`}></i>
                                        <span className="fw-semibold">{l.titulo}</span>
                                      </div>
                                      <div style={{ fontSize: '0.95rem' }}>{l.mensagem}</div>
                                      {l.tipo === 'setorial' && l.filas && l.filas.length > 0 && (
                                        <div style={{ fontSize: '0.85rem', color: 'var(--placeholder-color)' }}>
                                          {formatarFilas(l.filas)}
                                        </div>
                                      )}
                                    </div>
                                    {index < lembretesDia.length - 1 && (
                                      <hr style={{ margin: '0.5rem 0', borderColor: 'var(--placeholder-color)', opacity: 0.5 }} />
                                    )}
                                  </React.Fragment>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <LembreteNovoLembrete
        show={showNovoLembrete}
        onHide={() => { setShowNovoLembrete(false); setLembreteEditando(null); }}
        onSave={novo => {
          if (lembreteEditando) {
            setLembretes(lembretes.map(l => l.id === lembreteEditando.id ? { ...l, ...novo } : l));
          } else {
            setLembretes([...lembretes, { ...novo, id: Date.now() }]);
          }
          setShowNovoLembrete(false);
          setLembreteEditando(null);
        }}
        theme={theme}
        userRole="admin"
        filas={[]}
        {...(lembreteEditando ? {
          tipoDefault: lembreteEditando.tipo,
          lembreteEdit: lembreteEditando
        } : {})}
        onTestToast={showToast}
      />
      <LembreteDeletarLembrete
        theme={theme}
        lembrete={lembreteDeletando}
        onDelete={() => {
          setLembretes(lembretes.filter(l => l.id !== lembreteDeletando.id));
          setLembreteDeletando(null);
        }}
      />
    </div>
  );
}

export default LembretesPage;