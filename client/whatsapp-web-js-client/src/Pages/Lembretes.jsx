import React, { useState, useRef, useEffect } from 'react';
import * as bootstrap from 'bootstrap';
import LembreteNovoLembrete from './modalPages/Lembrete_novoLembrete';
import LembreteDeletarLembrete from './modalPages/Lembrete_deletarLembrete';
import anime from 'animejs';
import { api } from '../utils/axiosConfig';
import { useToast } from '../contexts/ToastContext';
import { socket } from '../socket';
import { useAuth } from '../contexts/AuthContext';

// Estilo moderno para o botão Google Calendar
const style = document.createElement('style');
style.innerHTML = `
.google-calendar-btn {
  background: transparent;
  color: #F4B400;
  border: 1.5px solid #F4B400;
  border-radius: 6px;
  font-weight: 500;
  padding: 5px 14px;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(244,180,0,0.08);
  transition: background 0.2s, color 0.2s;
  cursor: pointer;
  outline: none;
}
.google-calendar-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.google-calendar-btn:hover:not(:disabled),
.google-calendar-btn:focus-visible:not(:disabled) {
  background: #F4B400;
  color: #fff;
}
`;
style.innerHTML += `
.google-calendar-btn-disconnect {
  background: transparent;
  color: #e53935;
  border: 1.5px solid #e53935;
  border-radius: 6px;
  font-weight: 500;
  padding: 5px 14px;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(229,57,53,0.08);
  transition: background 0.2s, color 0.2s;
  cursor: pointer;
  outline: none;
}
.google-calendar-btn-disconnect:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.google-calendar-btn-disconnect:hover:not(:disabled),
.google-calendar-btn-disconnect:focus-visible:not(:disabled) {
  background: #e53935;
  color: #fff;
}
`;
document.head.appendChild(style);

const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year, month) {
    return new Date(year, month, 1).getDay();
}


function LembretesPage({ theme, lembretes, atualizarLembretes }) {
    const { showError, showSuccess } = useToast();
    const [showNovoLembrete, setShowNovoLembrete] = useState(false);
    const hoje = new Date();
    const [mesAtual, setMesAtual] = useState(hoje.getMonth());
    const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());
    const [popoverDia, setPopoverDia] = useState(null); // {dia, anchor}
    const [lembreteEditando, setLembreteEditando] = useState(null);
    const [lembreteDeletando, setLembreteDeletando] = useState(null);
    const [lembretesState, setLembretesState] = useState(lembretes);
    const buttonRefs = useRef({});
    const userData = useAuth().userData
    const schema = userData?.schema;
    const [loadingGoogle, setLoadingGoogle] = useState(false);
    const [isGoogleConnected, setIsGoogleConnected] = useState(false);

    // Verifica se está conectado ao Google Calendar
    useEffect(() => {
        const checkGoogleStatus = async () => {
            try {
                await api.get('/calendar/events', {
                    params: {
                        user_id: userData.id,
                        schema: schema
                    }
                });
                setIsGoogleConnected(true);
            } catch (err) {
                setIsGoogleConnected(false);
            }
        };
        checkGoogleStatus();
    }, [userData.id, schema]);

    const handleDisconnectGoogleCalendar = async () => {
        try {
            await api.post('/calendar/disconnect', {
                user_id: userData.id,
                schema: schema
            });
            setIsGoogleConnected(false);
        } catch (err) {
            showError('Erro ao desconectar do Google Calendar');
        }
    };

    const handleConnectGoogleCalendar = async () => {
        setLoadingGoogle(true);
        try {
            // Salva user_id e schema na sessão antes do OAuth
            await api.post('/calendar/set-session', {
                user_id: userData.id,
                schema: schema,
                userRole: userData.role
            });
            const response = await api.get('/calendar/auth-url');
            if (response.data.url) {
                window.location.href = response.data.url;
            }
        } catch (err) {
            showError('Erro ao conectar com o Google Calendar');
        } finally {
            setLoadingGoogle(false);
        }
    };

    // --- Funções Auxiliares para lidar com a inconsistência de dados ---
    const getReminderIconClass = (lembrete) => {
        if (lembrete.tipo === 'google') return 'bi-calendar-event';
        // Prioriza 'tag' se ela mapear para um ícone padrão
        if (lembrete.tag === 'geral') return 'bi-globe-americas';
        if (lembrete.tag === 'setorial') return 'bi-diagram-3';
        // Se houver uma propriedade 'icone' (como nos mocks), usa-a
        if (lembrete.icone) return lembrete.icone;
        // Fallback para 'pessoal' ou outros se nenhuma classe de ícone específica for fornecida
        if (lembrete.tag === 'pessoal') return 'bi-alarm'; // Ícone padrão para lembretes pessoais
        return 'bi-info-circle'; // Ícone genérico de fallback
    };

    const getReminderTitle = (lembrete) => {
        return lembrete.lembrete_name || lembrete.titulo || 'Sem Título';
    };

    const getReminderMessage = (lembrete) => {
        return lembrete.message || lembrete.mensagem || 'Sem Mensagem';
    };
    // --- Fim das Funções Auxiliares ---

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



    const handleSalvarLembrete = (lembreteCriadoOuEditado) => {
        console.log('Salvando lembrete:', lembreteCriadoOuEditado);
        setLembretesState(prev => {
            // Mantém os eventos do Google
            const googleEvents = prev.filter(l => l.tipo === 'google');
            // Atualiza ou adiciona o lembrete do sistema
            const outros = prev.filter(l => l.tipo !== 'google');
            const idx = outros.findIndex(l => l.id === lembreteCriadoOuEditado.id);
            let novosLembretes;
            if (idx !== -1) {
                outros[idx] = lembreteCriadoOuEditado;
                novosLembretes = outros;
                showSuccess('Lembrete atualizado com sucesso!');
            } else {
                novosLembretes = [...outros, lembreteCriadoOuEditado];
                showSuccess('Lembrete criado com sucesso!');
            }
            return [...novosLembretes, ...googleEvents];
        });
        setShowNovoLembrete(false);
        setLembreteEditando(null);
    };
    useEffect(() => {
        setLembretesState(prev => {
            // Mantém os eventos do Google
            const googleEvents = prev.filter(l => l.tipo === 'google');
            // Adiciona os lembretes do sistema recebidos por props
            return [...lembretes, ...googleEvents];
        });
    }, [lembretes]);

    // Função para buscar eventos do Google Calendar
    const fetchGoogleEvents = React.useCallback(async () => {
        try {
            const response = await api.get('/calendar/events', {
                params: {
                    user_id: userData.id,
                    schema: schema
                }
            });
            const googleEvents = (response.data || []).map(ev => {
                let timestamp;
                if (ev.start?.dateTime) {
                    timestamp = Math.floor(new Date(ev.start.dateTime).getTime() / 1000);
                } else if (ev.start?.date) {
                    timestamp = Math.floor(new Date(ev.start.date + 'T00:00:00').getTime() / 1000);
                } else {
                    timestamp = null;
                }
                return {
                    id: 'google-' + ev.id,
                    google_event_id: ev.id,
                    titulo: ev.summary,
                    mensagem: ev.description || '',
                    date: timestamp, // padronizado
                    icone: 'bi-calendar-event',
                    tipo: 'google',
                };
            });
            setLembretesState(prev => {
                // Filtra eventos do Google que já possuem lembrete do sistema com o mesmo google_event_id
                const lembretesSistema = prev.filter(l => l.tipo !== 'google');
                const googleEventIdsSistema = new Set(lembretesSistema.map(l => l.google_event_id).filter(Boolean));
                const googleEventsFiltrados = googleEvents.filter(ev => !googleEventIdsSistema.has(ev.google_event_id));
                return [...lembretesSistema, ...googleEventsFiltrados];
            });
        } catch (err) {
            console.error('Erro ao buscar eventos do Google:', err);
        }
    }, [userData.id, schema]);

    // Buscar eventos do Google Calendar ao carregar
    useEffect(() => {
        fetchGoogleEvents();
    }, [fetchGoogleEvents]);

    // Socket.IO - Escutar novos lembretes em tempo real
    useEffect(() => {
        const socketConnection = socket();

        // Escutar quando um novo lembrete é criado
        const handleNovoLembrete = (novoLembrete) => {
            console.log('Novo lembrete recebido:', novoLembrete);
            setLembretesState(prev => {
                // Evitar duplicatas
                const exists = prev.find(l => l.id === novoLembrete.id);
                if (exists) return prev;

                // Adicionar o novo lembrete
                return [...prev, novoLembrete];
            });
            showSuccess('Novo lembrete criado com sucesso!');
        };

        // Escutar quando um lembrete é criado (evento alternativo)
        const handleLembreteCriado = (data) => {
            console.log('Lembrete criado:', data);
            if (data.lembrete) {
                setLembretesState(prev => {
                    const exists = prev.find(l => l.id === data.lembrete.id);
                    if (exists) return prev;
                    return [...prev, data.lembrete];
                });
            }
        };

        socketConnection.on('novo-lembrete', handleNovoLembrete);
        socketConnection.on('lembrete-criado', handleLembreteCriado);

        return () => {
            socketConnection.off('novo-lembrete', handleNovoLembrete);
            socketConnection.off('lembrete-criado', handleLembreteCriado);
            socketConnection.disconnect();
        };
    }, [showSuccess]);

    // Inicializar tooltips do Bootstrap
    useEffect(() => {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });

        return () => {
            tooltipList.forEach(tooltip => tooltip.dispose());
        };
    }, [lembretesState]);

    const handleDeleteLembrete = (id) => {
        setLembretesState(prev => prev.filter(l => l.id !== id));
        setLembreteDeletando(null);
    };


    // Renderização do calendário
    const diasNoMes = getDaysInMonth(anoAtual, mesAtual);
    const primeiroDiaSemana = getFirstDayOfWeek(anoAtual, mesAtual);
    const dias = [];
    for (let i = 0; i < primeiroDiaSemana; i++) dias.push(null);
    for (let d = 1; d <= diasNoMes; d++) dias.push(d);

    const lembretesPorDia = lembretesState.reduce((acc, l) => {
        const data = new Date(Number(l.date || l.data) * 1000);
        if (data.getMonth() === mesAtual && data.getFullYear() === anoAtual) {
            const dia = data.getDate();
            if (!acc[dia]) acc[dia] = [];
            acc[dia].push(l);
        }
        return acc;
    }, {});


    const lembretesOrdenados = [...lembretesState].sort((a, b) => {
        const dateA = new Date(Number(a.date || a.data) * 1000);
        const dateB = new Date(Number(b.date || b.data) * 1000);
        return dateA - dateB;
    });

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

    // Função para formatar filas
    const formatarFilas = (filas) => {
        if (!filas || filas.length === 0) return '';
        const nomesFilas = {
            '1': 'Suporte', '2': 'Vendas', '3': 'Financeiro', '4': 'Marketing', '5': 'RH'
        };
        const filasFormatadas = filas.map(id => nomesFilas[id] || id);
        return filasFormatadas.length === 1 ? filasFormatadas[0] : filasFormatadas.join(' | ');
    };

    // Função para mostrar um toast de notificação
    // const showToast = (lembrete) => {
    //     const toastId = `toast-${lembrete.id}-${Date.now()}`;
    //     const isLight = theme === 'light';
    //     const bgClass = isLight ? 'bg-light' : 'bg-dark';
    //     const textClass = isLight ? 'text-dark' : 'text-light';
    //     const iconColor = isLight ? '#212529' : '#E0E0E0';
    //     const toastElement = document.createElement('div');
    //     toastElement.className = `toast align-items-center border-0 ${bgClass}`;
    //     toastElement.setAttribute('role', 'alert');
    //     toastElement.setAttribute('aria-live', 'assertive');
    //     toastElement.setAttribute('aria-atomic', 'true');
    //     toastElement.id = toastId;

    //     toastElement.innerHTML = `
    //         <div class="toast-header ${bgClass} ${textClass}" style="background-color: var(--input-bg-color-${theme}); border-bottom: 1px solid var(--border-color-${theme});">
    //             <i class="bi ${getReminderIconClass(lembrete)} me-2" style="color: ${iconColor}"></i>
    //             <strong class="me-auto">${getReminderTitle(lembrete)}</strong>
    //             <button type="button" class="btn-close ms-2 mb-1" data-bs-dismiss="toast" aria-label="Close"></button>
    //         </div>
    //         <div class="toast-body ${textClass}">
    //             ${getReminderMessage(lembrete)}
    //             ${(lembrete.tag === 'setorial' || lembrete.tipo === 'setorial') && lembrete.filas && lembrete.filas.length > 0 ?
    //             `<div style="font-size: 0.85rem; color: var(--placeholder-color); margin-top: 4px;">${formatarFilas(lembrete.filas)}</div>`
    //             : ''}
    //         </div>
    //     `;
    //     const toastContainer = document.getElementById('toast-container');
    //     if (toastContainer) {
    //         toastContainer.appendChild(toastElement);
    //         const toast = new bootstrap.Toast(toastElement, {
    //             autohide: true,
    //             delay: 10000
    //         });
    //         toast.show();
    //         toastElement.addEventListener('hidden.bs.toast', () => {
    //             toastElement.remove();
    //         });
    //     }
    // };

    // Função para verificar lembretes com data de vencimento
    // const checkDueReminders = () => {
    //     const now = new Date();
    //     lembretes.forEach(lembrete => {
    //         const reminderDate = new Date(Number(lembrete.date || lembrete.data) * 1000);
    //         const reminderKey = `${lembrete.id}-${reminderDate.toISOString().split('T')[0]}`;

    //         // Verifica se o lembrete está vencido no último minuto e não foi mostrado ainda
    //         // Inclui verificação de ano/mês/dia para evitar toasts de lembretes antigos ao carregar
    //         if (reminderDate.getFullYear() === now.getFullYear() &&
    //             reminderDate.getMonth() === now.getMonth() &&
    //             reminderDate.getDate() === now.getDate() &&
    //             reminderDate <= now &&
    //             reminderDate > new Date(now.getTime() - 60000) &&
    //             !shownToasts.includes(reminderKey)) {
    //             // showToast(lembrete); // Comentado para evitar toasts automáticos
    //             setShownToasts(prev => [...prev, reminderKey]);
    //         }
    //     });
    // };


    return (
        <div className="h-100 w-100 pt-3">
            {/* Botão Google Calendar */}
            <div className="d-flex justify-content-end mb-2 px-3 gap-2">
                {isGoogleConnected ? (
                    <button
                        className="d-flex align-items-center gap-2 google-calendar-btn-disconnect"
                        onClick={handleDisconnectGoogleCalendar}
                        style={{ minWidth: 120 }}
                    >

                        Desconectar Google
                    </button>
                ) : (
                    <button
                        className="d-flex align-items-center gap-2 google-calendar-btn d-none"
                        onClick={handleConnectGoogleCalendar}
                        disabled={loadingGoogle}
                    >
                        <i className="bi bi-calendar-event"></i>
                        {loadingGoogle ? 'Conectando...' : 'Conectar Google Calendar'}
                    </button>
                )}
            </div>
            {/* Container para as notificações Toast */}
            {/* <div id="toast-container" className="toast-container position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1060 }}></div> */}

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
                        {lembretesOrdenados.map(l => {
                            const podeExcluir =
                                userData?.role === 'admin' ||
                                userData?.role === 'tecnico' ||
                                l.user_id === userData?.id;

                            return (
                                <div key={l.id} className={`d-flex align-items-center gap-2 mb-2 rounded px-3`} style={{ background: 'var(--input-bg-color-' + theme + ')', border: '1px solid var(--border-color-' + theme + ')', minHeight: 44, paddingTop: 8, paddingBottom: 8 }}>
                                    <i className={`bi ${getReminderIconClass(l)} fs-5 header-text-${theme} ${l.tipo === 'google' || l.google_event_id ? 'text-primary' : ''}`}></i>
                                    <div className={`flex-grow-1 header-text-${theme}`}>
                                        <div className="fw-semibold d-flex align-items-center">
                                            {isGoogleConnected && (l.tipo === 'google' || l.google_event_id) && (
                                                <span
                                                    className="badge bg-primary me-2 flex-shrink-0"
                                                    data-bs-toggle="tooltip"
                                                    data-bs-placement="right"
                                                    data-bs-title="Evento no Google Calendar"
                                                    style={{
                                                        cursor: 'help',
                                                        width: '20.5px',
                                                        height: '20px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        padding: '0'
                                                    }}
                                                >
                                                    <i className="bi bi-google d-flex align-items-center justify-content-center" style={{ flex: 1 }}></i>
                                                </span>
                                            )}
                                            <span>{getReminderTitle(l)}</span>
                                        </div>
                                        <div className="small">
                                            {new Date(Number(l.date) * 1000).toLocaleString('pt-BR', {
                                                day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
                                            })}
                                            {' • '}
                                            {l.tag ? l.tag.charAt(0).toUpperCase() + l.tag.slice(1) : (l.tipo ? l.tipo.charAt(0).toUpperCase() + l.tipo.slice(1) : '')}
                                        </div>
                                    </div>
                                    {podeExcluir && l.tipo !== 'google' && (
                                        <button
                                            className={`btn btn-sm btn-2-${theme}`}
                                            style={{ maxWidth: '38px' }}
                                            title="Editar"
                                            onClick={() => { setLembreteEditando(l); setShowNovoLembrete(true); }}
                                        >
                                            <i className="bi bi-pencil-fill"></i>
                                        </button>
                                    )}
                                    {podeExcluir && l.tipo !== 'google' && (
                                        <button
                                            className={`btn btn-sm delete-btn`}
                                            style={{ maxWidth: '38px' }}
                                            title="Excluir"
                                            onClick={() => setLembreteDeletando(l)}
                                        >
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    )}
                                </div>
                            )
                        })}
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
                                                                        if (lembretesDia.length > 0) { // Condição alterada para > 0
                                                                            const button = e.currentTarget;
                                                                            button.style.borderColor = `var(--primary-color)`;
                                                                            button.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                                                                            button.style.zIndex = '2';

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

                                                                            anime({
                                                                                targets: expandContainer,
                                                                                width: Math.max(90, lembretesDia.length * 24),
                                                                                duration: 150,
                                                                                easing: 'easeOutQuad'
                                                                            });

                                                                            // Adiciona TODOS os ícones ao container de expansão
                                                                            expandContainer.innerHTML = lembretesDia.map(l => `
                                                                                <i class="bi ${getReminderIconClass(l)}"
                                                                                    style="font-size: 16px; flex-shrink: 0;"></i>
                                                                            `).join('');
                                                                        }
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        if (lembretesDia.length > 0) { // Condição alterada para > 0
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
                                                                    {/* Exibe os ícones iniciais (até 2, mais um mascarado se houver mais de 2) */}
                                                                    {lembretesDia.slice(0, 2).map((l, idx) => (
                                                                        <i
                                                                            key={l.id}
                                                                            className={`bi ${getReminderIconClass(l)}`}
                                                                            style={{
                                                                                fontSize: 14,
                                                                                flexShrink: 0
                                                                            }}
                                                                        ></i>
                                                                    ))}
                                                                    {lembretesDia.length > 2 && (
                                                                        <i
                                                                            className={`bi ${getReminderIconClass(lembretesDia[2])}`} // Pega o ícone para o terceiro
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

                                                                        // Ajusta a posição do popover para que ele não saia da tela
                                                                        if (anchorRect.right + popoverWidth > windowWidth && anchorRect.left - popoverWidth > 0) {
                                                                            return anchorRect.left - popoverWidth;
                                                                        }
                                                                        if (anchorRect.left + popoverWidth > windowWidth) {
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
                                                                                <i className={`bi ${getReminderIconClass(l)}`}></i>
                                                                                <span className="fw-semibold">{getReminderTitle(l)}</span>
                                                                            </div>
                                                                            <div style={{ fontSize: '0.95rem' }}>{getReminderMessage(l)}</div>
                                                                            {(l.tag === 'setorial' || l.tipo === 'setorial') && l.filas && l.filas.length > 0 && (
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
                onSave={handleSalvarLembrete}
                theme={theme}
                userRole="admin"
                filas={[]}
                {...(lembreteEditando ? {
                    tipoDefault: lembreteEditando.tag || lembreteEditando.tipo, // Prioriza 'tag' para edição
                    lembreteEdit: lembreteEditando
                } : {})}
                // onTestToast={showToast} // Comentado pois showToast não existe mais
                fetchGoogleEvents={fetchGoogleEvents}
                isGoogleConnected={isGoogleConnected}
            />
            <LembreteDeletarLembrete
                theme={theme}
                lembrete={lembreteDeletando}
                onDelete={handleDeleteLembrete}
            />
        </div>
    );
}

export default LembretesPage;