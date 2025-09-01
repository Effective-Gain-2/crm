  import * as bootstrap from 'bootstrap';
  import React, { useState, useEffect, useRef } from 'react';
  import 'bootstrap/dist/css/bootstrap.min.css';
  import 'bootstrap/dist/js/bootstrap.bundle.min.js';
  import shortlogo from './assets/favicon.png';
  import logo from './assets/effective-gain_logo.png';
  import './assets/style.css';
  import { useTheme } from './assets/js/useTheme';
  import { useNavigate } from 'react-router-dom';
  import Dashboard from './NewDashboard';
  import {socket} from '../socket'
  import ChatPage from './Chats';
  import AgendaPage from './Lembretes';
  import RelatorioPage from './Relatorios';
  import UsuariosPage from './Usuarios';
  import FilaPage from './Filas';
  import KanbanPage from './Kanban';
  import DisparosPage from './Disparos';
  import WhatsappModal from './modalPages/Whatsapp';
  import Manutencao from './Manutencao';
  import AjudaPage from './Ajuda';
  import LembretesPage from './Lembretes';
  import FinanceiroPage from './Financeiro';
  import axios from 'axios';
  import useUserPreferences from '../hooks/useUserPreferences';
  import CustomValuesModal from './modalPages/CustomValuesModal';
  import { useToast } from '../contexts/ToastContext';

  window.addEventListener('error', function (event) {
    if (
      event.message &&
      event.message.includes('Cannot convert undefined or null to object') &&
      event.filename?.includes('bundle.js')
    ) {
      event.preventDefault();
    }
  });

  window.addEventListener('unhandledrejection', function (event) {
    const message = event.reason?.message || '';
    if (message.includes('Cannot convert undefined or null to object')) {
      event.preventDefault();
    }
  });

  const getReminderIconClass = (lembrete) => {
    if (lembrete.tag === 'geral') return 'bi-globe-americas';
    if (lembrete.tag === 'setorial') return 'bi-diagram-3';
    if (lembrete.icone) return lembrete.icone;
    if (lembrete.tag === 'pessoal') return 'bi-alarm';
    return 'bi-info-circle';
  };

  const getReminderTitle = (lembrete) => {
    return lembrete.lembrete_name || lembrete.titulo || 'Sem Título';
  };

  const getReminderMessage = (lembrete) => {
    return lembrete.message || lembrete.mensagem || 'Sem Mensagem';
  };

  const formatarFilas = async (filas) => {
    if (!filas || filas.length === 0) return '';
    const userData = JSON.parse(localStorage.getItem('user'));
    const schema = userData?.schema;
    
    try {
      const response = await axios.get(`${process.env.REACT_APP_URL}/queue/get-all-queues/${schema}`, {
        withCredentials: true
      });
      const todasFilas = response.data?.result || [];
      
      const nomesFilas = filas.map(filaId => {
        const fila = todasFilas.find(f => f.id === filaId);
        return fila ? fila.name : filaId;
      });
      
      return nomesFilas.length === 1 ? nomesFilas[0] : nomesFilas.join(' | ');
    } catch (error) {
      console.error('Erro ao buscar nomes das filas:', error);
      // Fallback para os nomes mock
      const nomesFilas = {
        '1': 'Suporte', '2': 'Vendas', '3': 'Financeiro', '4': 'Marketing', '5': 'RH'
      };
      const filasFormatadas = filas.map(id => nomesFilas[id] || id);
      return filasFormatadas.length === 1 ? filasFormatadas[0] : filasFormatadas.join(' | ');
    }
  };

  function Painel() {
    const [lembretes, setLembretes] = useState([]);
    const [username, setUsername] = useState('');
    const [role, setRole] = useState('');
    const [empresa, setEmpresa] = useState('');
    const [theme, setTheme] = useTheme();
    const { preferences, updatePage } = useUserPreferences();
    const [page, setPage] = useState(preferences.currentPage || 'chats');
    const [showWhatsappModal, setShowWhatsappModal] = useState(false);
    const navigate = useNavigate();
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
    const [shownToasts, setShownToasts] = useState([]);
    const userData = JSON.parse(localStorage.getItem('user'));
    const schema = userData?.schema;
    const url = process.env.REACT_APP_URL;
    const [socketInstance] = useState(() => socket());
    const [showCustomValuesModal, setShowCustomValuesModal] = useState(false);
    const customValuesBtnRef = useRef(null);
    const { showError } = useToast();
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [networkWarningShown, setNetworkWarningShown] = useState(false);
    const [latencyWarningShown, setLatencyWarningShown] = useState(false);

    // Monitoramento de conectividade de rede
    useEffect(() => {
      const handleOnline = () => {
        setIsOnline(true);
        setNetworkWarningShown(false);
        setLatencyWarningShown(false);
      };

      const handleOffline = () => {
        setIsOnline(false);
        if (!networkWarningShown) {
          showError('Sem conexão com a internet. Verifique sua rede.');
          setNetworkWarningShown(true);
        }
      };

      // Verificar latência periodicamente com retry e timeout mais generoso
      const checkLatency = async () => {
        try {
          const startTime = performance.now();
          
          // Usar fetch com timeout mais generoso
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos
          
          const response = await fetch(`${url}/api/test`, {
            method: 'GET',
            credentials: 'include',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          
          const endTime = performance.now();
          const latency = endTime - startTime;

          // Se a latência for maior que 8 segundos, mostrar aviso (muito tolerante)
          if (latency > 8000 && !latencyWarningShown) {
            showError('Conexão lenta detectada. Verifique sua internet.');
            setLatencyWarningShown(true);
          } else if (latency <= 8000 && latencyWarningShown) {
            setLatencyWarningShown(false);
          }
          
          // Resetar avisos se a conexão estiver funcionando
          if (networkWarningShown) {
            setNetworkWarningShown(false);
          }
          
        } catch (error) {
          // Só mostrar erro se realmente não conseguir conectar E estiver offline
          if (!networkWarningShown && !navigator.onLine) {
            showError('Problema de conectividade detectado. Verifique sua internet.');
            setNetworkWarningShown(true);
          }
        }
      };

      // Verificar latência a cada 2 minutos (muito menos frequente)
      const latencyInterval = setInterval(checkLatency, 120000);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Verificação inicial
      if (!navigator.onLine) {
        handleOffline();
      }

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        clearInterval(latencyInterval);
      };
    }, [showError, url, networkWarningShown, latencyWarningShown]);


    // Atualizar página quando as preferências mudarem
    useEffect(() => {
      if (preferences.currentPage && preferences.currentPage !== page) {
        setPage(preferences.currentPage);
      }
    }, [preferences.currentPage, page]);


    useEffect(() => {
      if (!schema || !userData?.id) {
        navigate('/');
      }
    }, [schema, userData?.id, navigate]);



    // Função para atualizar página e salvar preferências
    const handlePageChange = (newPage) => {
      setPage(newPage);
      updatePage(newPage);
    };


  useEffect(() => {
    if (!socketInstance) return;

    const handleLembrete = (lembrete) => {
      // showToast(lembrete); // Comentado para evitar toasts automáticos
    };

    const handleLembreteCriado = (data) => {
      // Atualizar lista de lembretes
      fetchLembretes();
    };

    socketInstance.on('lembrete', handleLembrete);
    socketInstance.on('lembrete-criado', handleLembreteCriado);

    return () => {
      socketInstance.off('lembrete', handleLembrete);
      socketInstance.off('lembrete-criado', handleLembreteCriado);
    };
  }, [socketInstance]);

  // Função para buscar as filas do usuário e fazer join nas salas
  const setupUserQueues = async () => {
    if (!socketInstance || !userData?.id) return;
    
    try {
      // Buscar as filas do usuário
      const response = await axios.get(`${url}/queue/get-user-queue/${userData.id}/${schema}`, 
        {
        withCredentials: true
      });
      const userQueues = response.data?.result || [];
      
      // Fazer join na sala pessoal do usuário
      socketInstance.emit('join', `user_${userData.id}`);
      
      // Fazer join nas salas das filas que o usuário pertence
      if (Array.isArray(userQueues)) {
        userQueues.forEach(queue => {
          const roomName = `fila_${queue.id}`;
          socketInstance.emit('join', roomName);
        });
      } else if (userQueues.id) {
        // Se for apenas uma fila
        const roomName = `fila_${userQueues.id}`;
        socketInstance.emit('join', roomName);
      }
      
    } catch (error) {
      console.error('Erro ao buscar filas do usuário:', error);
    }
  };

  // Função para fazer leave das salas quando desconectar
  const cleanupUserQueues = () => {
    if (!socketInstance || !userData?.id) return;
    
    // Leave da sala pessoal
    socketInstance.emit('leave', `user_${userData.id}`);
    
    // As filas serão limpas automaticamente quando o socket desconectar
  };

  useEffect(() => {
    if (socketInstance && userData?.id) {
      setupUserQueues();
      
      // Emitir evento de login do usuário
      socketInstance.emit('user_login', {
        userId: userData.id,
        schema: schema
      });

      // Função para lidar com mudanças de visibilidade da página
      // const handleVisibilityChange = () => {
      //   if (socketInstance && userData?.id) {
      //     socketInstance.emit('page_visibility_change', {
      //       isVisible: !document.hidden,
      //       userId: userData.id,
      //       schema: schema
      //     });
      //   }
      // };

      // Função para lidar com fechamento da página
      // const handleBeforeUnload = () => {
      //   if (socketInstance && userData?.id) {
      //     // Marcar como offline quando a página for fechada
      //     socketInstance.emit('page_visibility_change', {
      //       isVisible: false,
      //       userId: userData.id,
      //       schema: schema
      //     });
      //   }
      // };

      // Adicionar listeners para eventos de visibilidade
      // document.addEventListener('visibilitychange', handleVisibilityChange);
      // window.addEventListener('beforeunload', handleBeforeUnload);
      
      // Sistema de heartbeat para manter status online
      // const heartbeatInterval = setInterval(() => {
      //   if (socketInstance && userData?.id && !document.hidden) {
      //     socketInstance.emit('heartbeat', {
      //       userId: userData.id,
      //       schema: schema
      //     });
      //   }
      // }, 30000); // 30 segundos
      
      // Cleanup quando o componente for desmontado
      return () => {
        cleanupUserQueues();
        // document.removeEventListener('visibilitychange', handleVisibilityChange);
        // window.removeEventListener('beforeunload', handleBeforeUnload);
        // clearInterval(heartbeatInterval);
      };
    }
  }, [socketInstance, userData?.id, schema, url]);

    useEffect(() => {
      try {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (!userData || !userData.schema || !userData.id) {
          navigate('/'); // Redireciona para login se não estiver logado ou sem dados necessários
          return;
        }
        setUsername(userData.username);
        setRole(userData.role);
        setEmpresa(userData.empresa);
      } catch (error) {
        console.error('Erro ao verificar dados do usuário:', error);
        navigate('/'); // Redireciona para login em caso de erro
      }
    }, [navigate]);
    
    const toggleTheme = () => {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      document.body.classList.remove('light', 'dark');
      document.body.classList.add(newTheme);
      document.cookie = `theme=${newTheme}`;
      setTheme(newTheme);
    };

    const toggleSidebar = () => {
      setIsSidebarExpanded(!isSidebarExpanded);
    };

    useEffect(() => {
    let tooltipList = [];

    try {
      const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
      if (tooltipTriggerList.length > 0) {
        tooltipList = [...tooltipTriggerList].map(el => new bootstrap.Tooltip(el));
      }
    } catch (error) {
      console.error('Erro ao inicializar tooltips:', error);
    }

    return () => {
      if (tooltipList.length > 0) {
        tooltipList.forEach(t => {
          if (t && t._element) {
            t.dispose();
          }
        });
      }
    };
  }, [page]);

  useEffect(() => {
    let tooltipInstance = null;
    if (customValuesBtnRef.current) {
      tooltipInstance = new bootstrap.Tooltip(customValuesBtnRef.current, { trigger: 'hover focus' });
    }
    return () => {
      if (tooltipInstance) {
        tooltipInstance.dispose();
      }
    };
  }, [theme, showCustomValuesModal]);

  const fetchLembretes = async () => {
    try {
      const response = await axios.get(`${url}/lembretes/get-lembretes/${schema}`, {
        withCredentials: true
      });
      setLembretes(Array.isArray(response.data) ? response.data : [response.data]);
    } catch (error) {
      setLembretes([]); // ou mockLembretes se quiser
    }
  };
  useEffect(() => {
      fetchLembretes();
    }, [schema, url]);
    

    // const showToast = async (lembrete) => {
    //         const toastId = `toast-${lembrete.id}-${Date.now()}`;
    //         const isLight = theme === 'light';
    //         const bgClass = isLight ? 'bg-light' : 'bg-dark';
    //         const textClass = isLight ? 'text-dark' : 'text-light';
    //         const iconColor = isLight ? '#212529' : '#E0E0E0';
            
    //         // Formatar filas se for setorial
    //         let filasFormatadas = '';
    //         if ((lembrete.tag === 'setorial' || lembrete.tag === 'setorial') && lembrete.filas && lembrete.filas.length > 0) {
    //           filasFormatadas = await formatarFilas(lembrete.filas);
    //         }
            
    //         const toastElement = document.createElement('div');
    //         const toastElement.className = `toast align-items-center border-0 ${bgClass}`;
    //         toastElement.setAttribute('role', 'alert');
    //         toastElement.setAttribute('aria-live', 'assertive');
    //         toastElement.setAttribute('aria-atomic', 'true');
    //         toastElement.id = toastId;
    
    //         toastElement.innerHTML = `
    //             <div class="toast-header ${bgClass} ${textClass}" style="background-color: var(--input-bg-color-${theme}); border-bottom: 1px solid var(--border-color-${theme});">
    //                 <i class="bi ${getReminderIconClass(lembrete)} me-2" style="color: ${iconColor}"></i>
    //                 <strong class="me-auto">${getReminderTitle(lembrete)}</strong>
    //                 <button type="button" class="btn-close ms-2 mb-1" data-bs-dismiss="toast" aria-label="Close"></button>
    //             </div>
    //             <div class="toast-body ${textClass}">
    //                 ${getReminderMessage(lembrete)}
    //                 ${filasFormatadas ? `<div style="font-size: 0.85rem; color: var(--placeholder-color); margin-top: 4px;">${filasFormatadas}</div>` : ''}
    //             </div>
    //         `;
    //         const toastContainer = document.getElementById('toast-container');
    //         if (toastContainer) {
    //             toastContainer.appendChild(toastElement);
    //             const toast = new bootstrap.Toast(toastElement, {
    //                 autohide: true,
    //                 delay: 10000
    //             });
    //             toast.show();
    //             toastElement.addEventListener('hidden.bs.toast', () => {
    //                 toastElement.remove();
    //             });
    //         }
    //     };


    const renderPage = () => {
      switch (page) {
        case 'dashboard': return <Dashboard theme={theme} />;
        case 'financeiro': return <FinanceiroPage theme={theme} />;
        case 'chats': return <ChatPage theme={theme} />;
        case 'kanban': return <KanbanPage theme={theme} />;
        case 'filas': return <FilaPage theme={theme} />;
        case 'usuarios': return <UsuariosPage theme={theme} />;
        case 'agenda': return <LembretesPage
    theme={theme}
    lembretes={lembretes}
    atualizarLembretes={fetchLembretes}
  />;
        case 'relatorios': return <RelatorioPage theme={theme} />;
        case 'insights': return <Manutencao theme={theme} />;
        case 'disparos': return <DisparosPage theme={theme} />;
        case 'ajuda': return <AjudaPage theme={theme} />;
        default: return <Dashboard theme={theme} />;
      }
    };

    const handleLogout = async () => {
      try {
        await axios.post(`${url}/api/logout`, {},);
        
        localStorage.removeItem('user');
        navigate('/');
      } catch (error) {
        console.error('Erro no logout:', error);
        // Mesmo com erro, limpar dados locais
        localStorage.removeItem('user');
        navigate('/');
      }
    };

    const handleWhatsapp = () => {
      setShowWhatsappModal(true);
    };

    return (
      <div className={`bg-screen-${theme}`} style={{ height: '100vh', overflow: 'hidden' }}>
        {/* <div id="toast-container" className="toast-container position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1060 }}></div> */}
        <div className="d-flex h-100">
          <div id="sidebar" className={`bg-form-${theme} h-100 sidebar ${isSidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'} border-end border-${theme} card-${theme}`}>
            <div id="sidebar-top" style={{ height: '10%', width: '100%', transition: '0.01s' }} className="p-2 d-flex flex-row align-items-center justify-content-evenly">
              <img src={isSidebarExpanded ? logo : shortlogo} alt="Logo" className="img-fluid" style={{ height: 'auto', width: isSidebarExpanded ? '80%' : '65%' }} />
            </div>
            <div style={{ flexGrow: 1, width: '100%' }} id="sidebar-body" className="d-flex flex-column align-items-center justify-content-start my-5 gap-3">
              <button
                id="dashboard"
                onClick={() => handlePageChange('dashboard')}
                data-bs-toggle="tooltip"
                data-bs-placement="right"
                data-bs-title="Dashboard"
                className={`btn ${page === 'dashboard' ? `btn-1-${theme}` : `btn-2-${theme}`} d-flex  flex-row align-items-center justify-content-center gap-2 ${isSidebarExpanded ? 'w-75' : ''} `}
              >
                <i className="bi bi-speedometer2"></i>
                <span className="sidebar-label d-none">Dashboard</span>
              </button>
              <button
                id="financeiro"
                onClick={() => handlePageChange('financeiro')}
                data-bs-toggle="tooltip"
                data-bs-placement="right"
                data-bs-title="Financeiro"
                className={`btn ${page === 'financeiro' ? `btn-1-${theme}` : `btn-2-${theme}`} d-flex flex-row align-items-center justify-content-center gap-2 ${isSidebarExpanded ? 'w-75' : ''}`}
              >
                <i className="bi bi-cash-stack"></i>
                <span className="sidebar-label d-none">Financeiro</span>
              </button>
              <hr className={`hr-${theme} mx-auto my-0 d-none`} style={{ width: '50%' }} />
              <button
                id="chats"
                onClick={() => handlePageChange('chats')}
                data-bs-toggle="tooltip"
                data-bs-placement="right"
                data-bs-title="Chats"
                className={`btn ${page === 'chats' ? `btn-1-${theme}` : `btn-2-${theme}`} d-flex flex-row align-items-center justify-content-center gap-2 ${isSidebarExpanded ? 'w-75' : ''}`}
              >
                <i className="bi bi-chat-dots"></i>
                <span className="sidebar-label d-none">Chats</span>
              </button>
              <button
                id="kanban"
                onClick={() => handlePageChange('kanban')}
                data-bs-toggle="tooltip"
                data-bs-placement="right"
                data-bs-title="Kanban"
                className={`btn ${page === 'kanban' ? `btn-1-${theme}` : `btn-2-${theme}`} d-flex flex-row align-items-center justify-content-center gap-2 ${isSidebarExpanded ? 'w-75' : ''}`}
              >
                <i className="bi bi-kanban"></i>
                <span className="sidebar-label d-none">Kanban</span>
              </button>
              <button
                id="filas"
                onClick={() => handlePageChange('filas')}
                data-bs-toggle="tooltip"
                data-bs-placement="right"
                data-bs-title="Filas"
                className={`btn ${page === 'filas' ? `btn-1-${theme}` : `btn-2-${theme}`} d-flex flex-row align-items-center justify-content-center gap-2 ${isSidebarExpanded ? 'w-75' : ''}`}
              >
                <i className="bi bi-diagram-3"></i>
                <span className="sidebar-label d-none">Filas</span>
              </button>
              <button
                id="disparos"
                onClick={() => handlePageChange('disparos')}
                data-bs-toggle="tooltip"
                data-bs-placement="right"
                data-bs-title="Disparos"
                className={`btn ${page === 'disparos' ? `btn-1-${theme}` : `btn-2-${theme}`} d-flex flex-row align-items-center justify-content-center gap-2 ${isSidebarExpanded ? 'w-75' : ''}`}
              >
                <i className="bi bi-megaphone"></i>
                <span className="sidebar-label d-none">Disparos</span>
              </button>
              <hr className={`hr-${theme} mx-auto my-0`} style={{ width: '50%' }} />
              <button
                id="usuarios"
                onClick={() => handlePageChange('usuarios')}
                data-bs-toggle="tooltip"
                data-bs-placement="right"
                data-bs-title="Usuários"
                className={`btn ${page === 'usuarios' ? `btn-1-${theme}` : `btn-2-${theme}`} d-flex flex-row align-items-center justify-content-center gap-2 ${isSidebarExpanded ? 'w-75' : ''}`}
              >
                <i className="bi bi-people"></i>
                <span className="sidebar-label d-none">Usuários</span>
              </button>
              <button
                id="whatsapp"
                onClick={handleWhatsapp}
                data-bs-toggle="tooltip"
                data-bs-placement="right"
                data-bs-title="WhatsApp"
                className={`btn btn-2-${theme} d-flex flex-row align-items-center justify-content-center gap-2 ${isSidebarExpanded ? 'w-75' : ''}`}
              >
                <i className="bi bi-whatsapp"></i>
                <span className="sidebar-label d-none">WhatsApp</span>
              </button>
              <button
                id="lembretes"
                onClick={() => handlePageChange('agenda')}
                data-bs-toggle="tooltip"
                data-bs-placement="right"
                data-bs-title="Lembretes"
                className={`btn ${page === 'agenda' ? `btn-1-${theme}` : `btn-2-${theme}`} d-flex flex-row align-items-center justify-content-center gap-2 ${isSidebarExpanded ? 'w-75' : ''}`}
              >
                <i className="bi bi-bell"></i>
                <span className="sidebar-label d-none">Lembretes</span>
              </button>
              <hr className={`hr-${theme} mx-auto my-0`} style={{ width: '50%' }} />
              <button
                id="relatorios"
                onClick={() => handlePageChange('relatorios')}
                data-bs-toggle="tooltip"
                data-bs-placement="right"
                data-bs-title="Relatórios"
                className={`btn ${page === 'relatorios' ? `btn-1-${theme}` : `btn-2-${theme}`} d-flex flex-row align-items-center justify-content-center gap-2 ${isSidebarExpanded ? 'w-75' : ''} d-none`}
              >
                <i className="bi bi-bar-chart-line"></i>
                <span className="sidebar-label d-none">Relatórios</span>
              </button>
              <button
                id="insights"
                onClick={() => handlePageChange('insights')}
                data-bs-toggle="tooltip"
                data-bs-placement="right"
                data-bs-title="Insights"
                className={`btn ${page === 'insights' ? `btn-1-${theme}` : `btn-2-${theme}`} d-flex flex-row align-items-center justify-content-center gap-2 ${isSidebarExpanded ? 'w-75' : ''} d-none`}
              >
                <i className="bi bi-rocket"></i>
                <span className="sidebar-label d-none">Insights</span>
              </button>
              <hr className={`hr-${theme} mx-auto my-0 d-none`} style={{ width: '50%' }} />
              <button
                id="ajuda"
                onClick={() => handlePageChange('ajuda')}
                data-bs-toggle="tooltip"
                data-bs-placement="right"
                data-bs-title="Ajuda"
                className={`btn ${page === 'ajuda' ? `btn-1-${theme}` : `btn-2-${theme}`} d-flex flex-row align-items-center justify-content-center gap-2 ${isSidebarExpanded ? 'w-75' : ''}`}
              >
                <i className="bi bi-question-circle"></i>
                <span className="sidebar-label d-none">Ajuda</span>
              </button>
  <button
    id="chatinterno"
    onClick={() => handlePageChange('ChatInterno')}
    data-bs-toggle="tooltip"
    data-bs-placement="right"
    data-bs-title="Chat Interno"
    className={`btn ${page === 'ChatInterno' ? `btn-1-${theme}` : `btn-2-${theme}`} d-flex flex-row align-items-center justify-content-center gap-2 ${isSidebarExpanded ? 'w-75' : ''} d-none`}
  >
    <i className="bi bi-chat-left-text"></i>
    <span className="sidebar-label d-none">Chat Interno</span>
  </button>
            

            </div>
          </div>
          <div className="d-flex flex-column flex-grow-1" style={{ flex: 1, minWidth: 0 }}>
            <div className={`header-${theme} ps-3 pe-4 d-flex align-items-center justify-content-between`} style={{ height: '10%' }}>
              <button data-bs-toggle="tooltip" data-bs-placement="right" data-bs-title="Expandir/Retrair" id="toggleSidebar" className={`btn btn-3-${theme} p-1`} onClick={toggleSidebar}>
                <i className={`bi ${isSidebarExpanded ? 'bi-arrow-bar-left' : 'bi-arrow-bar-right'}`}></i>
              </button>
              <div id="header-title" className="d-flex flex-column align-items-center justify-content-start">
                <h4 className={`header-text-${theme} mb-0`}><span style={{ fontWeight: 400 }}>Bem vindo</span>, <span id="username">{username}</span></h4>
                <h6 className={`header-text-${theme}`} style={{ fontWeight: 400 }}><span id="role">{role}</span> | <span id="empresa">{empresa}</span></h6>
              </div>

              <div className="d-flex flex-row align-items-center gap-2">
                {/* Botão para técnicos */}
                {role === 'tecnico' && (
                  <button
                    type="button"
                    data-bs-toggle="tooltip"
                    data-bs-placement="bottom"
                    data-bs-title="Schemas"
                    className={`btn btn-2-${theme} toggle-${theme}`}
                    onClick={() => navigate('/schemas')}
                  >
                    <i className="bi bi-bounding-box"></i>
                  </button>
                )}
                <button
                  type="button"
                  ref={customValuesBtnRef}
                  data-bs-toggle="tooltip"
                  data-bs-placement="bottom"
                  data-bs-title="Custom Values"
                  className={`btn btn-2-${theme} toggle-${theme}`}
                  onClick={() => setShowCustomValuesModal(true)}
                >
                  <i className="bi bi-sliders"></i>
                </button>
                <button type="button" data-bs-toggle="tooltip" data-bs-placement="right" data-bs-title="Mudar Tema" className={`btn btn-2-${theme} toggle-${theme}`} onClick={toggleTheme}>
                  <i className={`${theme === 'light' ? `bi-sun` : `bi-moon-stars`}`}></i>
                </button>

                <button id="sair" type="button" data-bs-toggle="tooltip" data-bs-placement="right" data-bs-title="Sair" className={`btn btn-2-${theme} toggle-${theme}`} onClick={handleLogout}>
                  <i className="bi bi-door-open"></i>
                </button>
              </div>
            </div>
            <div className={`main-${theme} ps-2 pe-3 pb-3`} style={{ flex: 1, overflow: 'auto', minWidth: 0, height: '90%' }} id="main">
              {renderPage()}
            </div>
          </div>
        </div>

        {/* WhatsApp Modal */}
        <WhatsappModal 
          theme={theme}
          show={showWhatsappModal}
          onHide={() => setShowWhatsappModal(false)}
        />
        <CustomValuesModal
          show={showCustomValuesModal}
          onHide={() => setShowCustomValuesModal(false)}
          theme={theme}
        />
      </div>
    );
  }

  export default Painel;