import * as bootstrap from 'bootstrap';
import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import shortlogo from './assets/favicon.png';
import logo from './assets/effective-gain_logo.png';
import './assets/style.css';
import { useTheme } from './assets/js/useTheme';
import { useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';
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

function Painel() {
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [theme, setTheme] = useTheme();
  const [page, setPage] = useState('dashboard');
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const navigate = useNavigate();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!userData || !userData.schema) {
      navigate('/'); // Redireciona para login se não estiver logado ou sem schema
      return;
    }
    setUsername(userData.username);
    setRole(userData.role);
    setEmpresa(userData.empresa);
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

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard theme={theme} />;
      case 'chats': return <ChatPage theme={theme} />;
      case 'kanban': return <Manutencao theme={theme} />;
      case 'filas': return <FilaPage theme={theme} />;
      case 'usuarios': return <UsuariosPage theme={theme} />;
      case 'agenda': return <Manutencao theme={theme} />;
      case 'relatorios': return <Manutencao theme={theme} />;
      case 'insights': return <Manutencao theme={theme} />;
      case 'disparos': return <DisparosPage theme={theme} />;
      case 'ajuda': return <AjudaPage theme={theme} />;
      default: return <Dashboard theme={theme} />;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleWhatsapp = () => {
    setShowWhatsappModal(true);
  };

  return (
    <div className={`bg-screen-${theme}`} style={{ height: '100vh', overflow: 'hidden' }}>
      <div className="d-flex h-100">
        <div id="sidebar" className={`bg-form-${theme} h-100 sidebar ${isSidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'} border-end border-${theme} card-${theme}`}>
          <div id="sidebar-top" style={{ height: '10%', width: '100%' }} className="p-2 d-flex flex-row align-items-center justify-content-evenly">
            <img src={isSidebarExpanded ? logo : shortlogo} alt="Logo" className="img-fluid" style={{ height: 'auto', width: isSidebarExpanded ? '80%' : '65%' }} />
          </div>
          <div style={{ flexGrow: 1, width: '100%' }} id="sidebar-body" className="d-flex flex-column align-items-center justify-content-start my-5 gap-3">
            <button
              id="dashboard"
              onClick={() => setPage('dashboard')}
              data-bs-toggle="tooltip"
              data-bs-placement="right"
              data-bs-title="Dashboard"
              className={`btn ${page === 'dashboard' ? `btn-1-${theme}` : `btn-2-${theme}`} d-flex flex-row align-items-center justify-content-center gap-2 ${isSidebarExpanded ? 'w-75' : ''}`}
            >
              <i className="bi bi-speedometer2"></i>
              <span className="sidebar-label d-none">Dashboard</span>
            </button>
            <hr className={`hr-${theme} mx-auto my-0`} style={{ width: '50%' }} />
            <button
              id="chats"
              onClick={() => setPage('chats')}
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
              onClick={() => setPage('kanban')}
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
              onClick={() => setPage('filas')}
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
              onClick={() => setPage('disparos')}
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
              onClick={() => setPage('usuarios')}
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
              onClick={() => setPage('agenda')}
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
              onClick={() => setPage('relatorios')}
              data-bs-toggle="tooltip"
              data-bs-placement="right"
              data-bs-title="Relatórios"
              className={`btn ${page === 'relatorios' ? `btn-1-${theme}` : `btn-2-${theme}`} d-flex flex-row align-items-center justify-content-center gap-2 ${isSidebarExpanded ? 'w-75' : ''}`}
            >
              <i className="bi bi-bar-chart-line"></i>
              <span className="sidebar-label d-none">Relatórios</span>
            </button>
            <button
              id="insights"
              onClick={() => setPage('insights')}
              data-bs-toggle="tooltip"
              data-bs-placement="right"
              data-bs-title="Insights"
              className={`btn ${page === 'insights' ? `btn-1-${theme}` : `btn-2-${theme}`} d-flex flex-row align-items-center justify-content-center gap-2 ${isSidebarExpanded ? 'w-75' : ''}`}
            >
              <i className="bi bi-rocket"></i>
              <span className="sidebar-label d-none">Insights</span>
            </button>
            <hr className={`hr-${theme} mx-auto my-0`} style={{ width: '50%' }} />
            <button
              id="ajuda"
              onClick={() => setPage('ajuda')}
              data-bs-toggle="tooltip"
              data-bs-placement="right"
              data-bs-title="Ajuda"
              className={`btn ${page === 'ajuda' ? `btn-1-${theme}` : `btn-2-${theme}`} d-flex flex-row align-items-center justify-content-center gap-2 ${isSidebarExpanded ? 'w-75' : ''}`}
            >
              <i className="bi bi-question-circle"></i>
              <span className="sidebar-label d-none">Ajuda</span>
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
    </div>
  );
}

export default Painel;