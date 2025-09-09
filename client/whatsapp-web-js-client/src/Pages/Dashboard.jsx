import React, { useEffect, useState } from 'react';
import * as bootstrap from 'bootstrap';
import axios from 'axios';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChatViewModal from './Componentes/ChatViewModal';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

function Dashboard({ theme }) {
  const url = process.env.REACT_APP_URL;
  const userData = JSON.parse(localStorage.getItem('user'));
  const [user, setUser] = useState()
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeGraficoTab, setActiveGraficoTab] = useState('ganhos');
  const [closedChats, setClosedChats] = useState([]);
  const [statusList, setStatusList] = useState([]);
  const [chartType, setChartType] = useState('bar');
  const schema = userData.schema
  const [userNames, setUserNames] = useState({});
  const [rankingFiltro, setRankingFiltro] = useState('diario');
  const [customFieldsGraph, setCustomFieldsGraph] = useState([]);
  const [customFieldsValues, setCustomFieldsValues] = useState({});
  const [selectedCustomFieldId, setSelectedCustomFieldId] = useState('');
  const [reportData, setReportData] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [queueMap, setQueueMap] = useState({});
  const [connectionMap, setConnectionMap] = useState({});
  const [showChatModal, setShowChatModal] = useState(false);
  const [modalChatId, setModalChatId] = useState(null);
  const [filas, setFilas] = useState([]);

  useEffect(() => {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(
      (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
    );
    return () => tooltipList.forEach((tooltip) => tooltip.dispose());
  }, []);

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const response = await axios.get(`${url}/api/users/${schema}`, {
          withCredentials: true
        });
        setUser(response.data.users || []);
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
      }
    };
    const fetchAllQueues = async () => {
      const response = await axios.get(`${url}/queue/get-all-queues/${schema}`, {
        withCredentials: true
      });
      setFilas(response.data.result || []);
    };
    fetchUsuarios();
    fetchAllQueues()
  }, []);

  useEffect(() => {

      const fetchClosedChats = async () => {
        try {
          const response = await axios.get(`${url}/chat/get-closed-chats/${schema}`, {
            withCredentials: true
          });
          setClosedChats(response.data.result || []);
        } catch (error) {
          setClosedChats([]);
        }
      };
      const fetchStatusList = async () => {
        try {
          const response = await axios.get(`${url}/chat/get-status/${schema}`, {
            withCredentials: true
          });
          setStatusList(response.data.result || []);
        } catch (error) {
          setStatusList([]);
        }
      };
      fetchClosedChats();
      fetchStatusList();
    
  }, [ schema, url]);

  // Buscar nomes dos usuários do ranking
  useEffect(() => {
    async function fetchUserNames() {
      // Pega todos os user_id únicos das conversas fechadas
      const ids = Array.from(new Set(closedChats.map(c => c.user_id).filter(Boolean)));
      if (ids.length === 0) return;
      const namesMap = {};
      for (const id of ids) {
        try {
          const res = await axios.get(`${url}/api/users/${schema}`);
          const user = (res.data.users || []).find(u => u.id === id);
          if (user) namesMap[id] = user.nome || user.username || user.name;
        } catch (e) {}
      }
      setUserNames(namesMap);
    }
    if (closedChats.length > 0) fetchUserNames();
  }, [closedChats, url, schema]);

  // Função para filtrar por data
  function filtrarPorPeriodo(arr, filtro) {
    const now = new Date();
    return arr.filter(c => {
      if (!c.closed_at) return false;
      const closed = new Date(c.closed_at);
      if (filtro === 'diario') {
        return closed.toDateString() === now.toDateString();
      }
      if (filtro === 'semanal') {
        const diff = (now - closed) / (1000 * 60 * 60 * 24);
        return diff < 7;
      }
      if (filtro === 'mensal') {
        const diff = (now - closed) / (1000 * 60 * 60 * 24);
        return diff < 30;
      }
      return true;
    });
  }

  // Agrupar conversas encerradas por user_id, considerando filtro
  const closedChatsFiltrados = filtrarPorPeriodo(closedChats, rankingFiltro);
  const ranking = Object.entries(
    closedChatsFiltrados.reduce((acc, c) => {
      if (!c.user_id) return acc;
      acc[c.user_id] = (acc[c.user_id] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  // Mapear statusId para sucesso
  const statusSuccessMap = {};
  statusList.forEach(s => {
    statusSuccessMap[s.value] = s.success;
  });

  // Separar ganhos e perdas pelo status do chat
  const ganhos = closedChats.filter(c => statusSuccessMap[c.status] === true);
  const perdas = closedChats.filter(c => statusSuccessMap[c.status] === false);

  // Agrupar por status
  function groupByStatus(arr) {
    const map = {};
    arr.forEach(c => {
      const key = c.status || 'Indefinido';
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }

  // Nome amigável para o status
  function getStatusLabel(status) {
    const found = statusList.find(s => s.value === status);
    return found ? found.value : status;
  }

  const ganhosDataRaw = groupByStatus(ganhos);
  const perdasDataRaw = groupByStatus(perdas);

  const ganhosLabels = Object.keys(ganhosDataRaw).map(getStatusLabel);
  const ganhosValues = Object.values(ganhosDataRaw);
  const perdasLabels = Object.keys(perdasDataRaw).map(getStatusLabel);
  const perdasValues = Object.values(perdasDataRaw);

  // Dados para gráfico de barra
  const chartData = {
    labels: activeGraficoTab === 'ganhos' ? ganhosLabels : perdasLabels,
    datasets: [
      {
        label: 'Quantidade',
        data: activeGraficoTab === 'ganhos' ? ganhosValues : perdasValues,
        backgroundColor: activeGraficoTab === 'ganhos' ? '#28a745' : '#dc3545',
        barPercentage: 1,
        categoryPercentage: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: activeGraficoTab === 'ganhos' ? 'Motivos de Ganhos' : 'Motivos de Perdas',
      },
    },
    scales: {
      x: {
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
      },
    },
  };

  // Dados para gráfico donut
  const donutData = {
    labels: ['Ganhos', 'Perdas'],
    datasets: [
      {
        data: [ganhos.length, perdas.length],
        backgroundColor: ['#28a745', '#dc3545'],
        borderWidth: 1,
      },
    ],
  };

  const donutOptions = {
    responsive: true,
    plugins: {
      legend: { display: true, position: 'bottom' },
      title: {
        display: true,
        text: 'Ganhos x Perdas',
      },
    },
    cutout: '70%',
  };

  // Buscar campos personalizados com graph=true sempre que a aba de gráficos for aberta
  useEffect(() => {
    if (activeTab === 'graficos') {
      const fetchCustomFields = async () => {
        try {
          const res = await axios.get(`${url}/kanban/get-custom-fields/${schema}`, { withCredentials: true });
          const fields = (Array.isArray(res.data) ? res.data : [res.data]).filter(f => f.graph);
          setCustomFieldsGraph(fields);
        } catch {
          setCustomFieldsGraph([]);
        }
      };
      fetchCustomFields();
    }
  }, [activeTab, schema, url]);

  // Buscar valores dos campos personalizados só quando for custom
  useEffect(() => {
    if (activeTab === 'graficos' && chartType.startsWith('custom-')) {
      const fetchCustomFieldValues = async () => {
        try {
          const fieldId = chartType.replace('custom-', '');
          const contatosUnicos = Array.from(new Set(closedChats.map(c => c.contact_number || c.number || c.phone)));
          const valueArr = [];
          for (const contato of contatosUnicos) {
            try {
              const resp = await axios.get(`${url}/contact/get-custom-values/${contato}/${schema}`);
              const arr = resp.data.result && Array.isArray(resp.data.result) ? resp.data.result : [];
              const found = arr.find(f => String(f.field_id) === String(fieldId));
              if (found && found.value) {
                valueArr.push(found.value);
              }
            } catch {}
          }
          setCustomFieldsValues({ [fieldId]: valueArr });
        } catch {
          setCustomFieldsValues({});
        }
      };
      fetchCustomFieldValues();
    }
  }, [activeTab, chartType, closedChats, schema, url]);

  useEffect(() => {
    if (activeTab === 'relatorio') {
      const fetchReport = async () => {
        try {
          const response = await axios.get(`${url}/report/get-reports/${schema}`, {
            params: { user_id: userData?.id, user_role: userData?.role },
            withCredentials: true
          });
          let data = response.data.result;
          if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch {}
          }
          if (!Array.isArray(data)) data = [data];
          setReportData(data);

          // Buscar nomes de usuários, filas e conexões
          const userIds = Array.from(new Set(data.map(r => r.user_id).filter(Boolean)));
          const queueIds = Array.from(new Set(data.map(r => r.queue_id).filter(Boolean)));
          const chatIds = Array.from(new Set(data.map(r => r.chat_id).filter(Boolean)));

          // Usuários
          if (userIds.length > 0) {
            const res = await axios.get(`${url}/api/users/${schema}`, { withCredentials: true });
            const users = res.data.users || [];
            const map = {};
            userIds.forEach(id => {
              const u = users.find(x => x.id === id);
              map[id] = u ? (u.nome || u.username || u.name) : id;
            });
            setUserMap(map);
          } else {
            setUserMap({});
          }

          // Filas
          if (queueIds.length > 0) {
            const res = await axios.get(`${url}/queue/get-all-queues/${schema}`, { withCredentials: true });
            const queues = res.data.result || [];
            const map = {};
            queueIds.forEach(id => {
              const q = queues.find(x => x.id === id);
              map[id] = q ? q.name : id;
            });
            setQueueMap(map);
          } else {
            setQueueMap({});
          }

          // Conexões (via chats)
          if (chatIds.length > 0) {
            // Buscar todos os chats de uma vez
            const res = await axios.get(`${url}/connection/get-all-connections/${schema}`, { withCredentials: true });
            const connections = res.data || [];
            setConnectionMap({});
          } else {
            setConnectionMap({});
          }
        } catch (error) {
          setReportData([]);
          setUserMap({});
          setQueueMap({});
          setConnectionMap({});
        }
      };
      fetchReport();
    }
  }, [activeTab, url, schema]);

  // Função para abrir o modal e buscar as mensagens
  const handleOpenChatModal = (chatId) => {
    setModalChatId(chatId);
    setShowChatModal(true);
  };
  // Função para fechar o modal
  const handleCloseChatModal = () => {
    setShowChatModal(false);
    setModalChatId(null);
  };

  return (
    <div className="pt-3" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="container-fluid ps-2 pe-0" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h2 className={`mb-3 ms-3 header-text-${theme}`} style={{ fontWeight: 400 }}>Dashboard</h2>
        <ul 
          className="nav nav-tabs ps-3"
          style={{
            borderBottom: 'none',
          }}
        >
          <li className="nav-item">
            <button
              className={`nav-link${activeTab === 'dashboard' ? ' active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
              type="button"
              style={{
                transition: 'var(--TT) all',
                backgroundColor: 'transparent',
                border: `1px solid var(--border-color-${theme})`,
                borderTop: activeTab === 'dashboard' ? `1px solid var(--primary-color)` : `1px solid var(--border-color-${theme})`,
                position: 'relative',
                paddingTop: activeTab === 'dashboard' ? '0.5rem' : undefined,
                color: `var(--color-${theme})`,
                fontWeight: activeTab === 'dashboard' ? 600 : 400,
                outline: 'none'
              }}
              onFocus={e => e.currentTarget.style.transition = 'var(--TT) all'}
              onBlur={e => e.currentTarget.style.transition = 'var(--TT) all'}
            >
              {activeTab === 'dashboard' && (
                <span
                  style={{
                    transition: 'var(--TT) all',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '0',
                    borderTop: '5px solid var(--primary-color)',
                    borderRadius: '6px 6px 0 0',
                    pointerEvents: 'none',
                  }}
                ></span>
              )}
              Visão Geral
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link${activeTab === 'graficos' ? ' active' : ''}`}
              onClick={() => setActiveTab('graficos')}
              type="button"
              style={{
                transition: 'var(--TT) all',
                backgroundColor: 'transparent',
                border: `1px solid var(--border-color-${theme})`,
                borderTop: activeTab === 'graficos' ? `1px solid var(--primary-color)` : `1px solid var(--border-color-${theme})`,
                position: 'relative',
                paddingTop: activeTab === 'graficos' ? '0.5rem' : undefined,
                color: `var(--color-${theme})`,
                fontWeight: activeTab === 'graficos' ? 600 : 400,
                outline: 'none'
              }}
              onFocus={e => e.currentTarget.style.transition = 'var(--TT) all'}
              onBlur={e => e.currentTarget.style.transition = 'var(--TT) all'}
            >
              {activeTab === 'graficos' && (
                <span
                  style={{
                    transition: 'var(--TT) all',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '0',
                    borderTop: '5px solid var(--primary-color)',
                    borderRadius: '6px 6px 0 0',
                    pointerEvents: 'none',
                  }}
                ></span>
              )}
              Gráficos
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link${activeTab === 'relatorio' ? ' active' : ''}`}
              onClick={() => setActiveTab('relatorio')}
              type="button"
              style={{
                transition: 'var(--TT) all',
                backgroundColor: 'transparent',
                border: `1px solid var(--border-color-${theme})`,
                borderTop: activeTab === 'relatorio' ? `1px solid var(--primary-color)` : `1px solid var(--border-color-${theme})`,
                position: 'relative',
                paddingTop: activeTab === 'relatorio' ? '0.5rem' : undefined,
                color: `var(--color-${theme})`,
                fontWeight: activeTab === 'relatorio' ? 600 : 400,
                outline: 'none'
              }}
              onFocus={e => e.currentTarget.style.transition = 'var(--TT) all'}
              onBlur={e => e.currentTarget.style.transition = 'var(--TT) all'}
            >
              {activeTab === 'relatorio' && (
                <span
                  style={{
                    transition: 'var(--TT) all',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '0',
                    borderTop: '5px solid var(--primary-color)',
                    borderRadius: '6px 6px 0 0',
                    pointerEvents: 'none',
                  }}
                ></span>
              )}
              Relatório
            </button>
          </li>
        </ul>
        <div className="pt-3" style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', border: `1px solid var(--border-color-${theme})`, borderRadius: '6px' }}>
          {activeTab === 'dashboard' && (
            <div className="d-flex flex-row justify-content-evenly" style={{ flex: 1, width: '100%', height: '100%' }}>
              {/* Coluna 1 */}
              <div className="col-4 d-flex flex-column gap-3">
                <div className={`card card-${theme} p-2 d-flex flex-row align-items-center justify-content-evenly`}>
                  <i className="bi bi-hourglass card-icon" style={{ fontSize: '2.5rem' }}></i>
                  <div className="d-flex flex-column align-items-start justify-content-start">
                    <h6 className={`card-subtitle-${theme} m-0`}>Fila de Atendimento</h6>
                    <h2 id="contatos-aguardando" className={`header-text-${theme}`}>{ filas.length }</h2>
                  </div>
                  <div>
                    <i
                      className={`bi bi-question-circle question-${theme}`}
                      data-bs-toggle="tooltip"
                      data-bs-placement="bottom"
                      title="Quantidade de filas de atendimento."
                    ></i>
                  </div>
                </div>

                <div className={`card card-${theme} p-2 d-flex flex-row align-items-center justify-content-evenly`}>
                  <i className="bi bi-person-check card-icon" style={{ fontSize: '2.5rem' }}></i>
                  <div className="d-flex flex-column align-items-start justify-content-start">
                    <h6 className={`card-subtitle-${theme} m-0`}>Atendentes online</h6>
                    <h2 id="atendentes-online" className={`header-text-${theme}`}>
                    {user && Array.isArray(user)
                      ? user.filter(u => u.online && u.permission === 'user').length
                      : 0}
                  </h2>
                  </div>
                  <div>
                    <i
                      className={`bi bi-question-circle question-${theme}`}
                      data-bs-toggle="tooltip"
                      data-bs-placement="bottom"
                      title="Total de atendentes humanos atendendo no momento."
                    ></i>
                  </div>
                </div>

                <div className={`card p-3 card-${theme}`}>
                  <h6 className={`card-subtitle-${theme}`}>Atendentes</h6>
                  <ul id="lista-atendentes" className="list-unstyled mb-0 d-flex flex-column lista-tabela">
                    <li className={`d-flex justify-content-between table-header-${theme} px-2 py-1`}>
                      <span>Nome</span>
                      <span>Setor</span>
                      <span>Status</span>
                    </li>
                    {user && user
                    .filter(u => u.permission === 'user')
                    .map((u) => (
                      <li key={u.id} className={`d-flex justify-content-between px-2 py-1 header-text-${theme}`}>
                        <span>{u.nome || u.username || u.name}</span>
                        <span>{u.setor || u.sector || '-'}</span>
                        <span>
                          <span
                            style={{
                              display: 'inline-block',
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              background: u.online ? '#28a745' : '#dc3545'
                            }}
                          ></span>
                        </span>
                      </li>
                  ))}
                  </ul>
                </div>
              </div>

              {/* Coluna 2 */}
              <div className="col-4 d-flex flex-column gap-3">
                {/*
              <div className={`card card-${theme} p-2 d-flex flex-row align-items-center justify-content-evenly`}>
                <i className="bi bi-cpu card-icon" style={{ fontSize: '2.5rem' }}></i>
                <div className="d-flex flex-column align-items-start justify-content-start">
                  <h6 className={`card-subtitle-${theme} m-0`}>Contatos com IA</h6>
                  <h2 id="contatos-ia" className={`header-text-${theme}`}>0</h2>
                </div>
                <div>
                  <i
                    className={`bi bi-question-circle question-${theme}`}
                    data-bs-toggle="tooltip"
                    data-bs-placement="bottom"
                    title="Conversas em andamento mediadas exclusivamente pela IA."
                  ></i>
                </div>
              </div>
              */}

                <div className={`card card-${theme} p-2 d-flex flex-row align-items-center justify-content-evenly`}>
                  <i className="bi bi-check2-all card-icon" style={{ fontSize: '2.5rem' }}></i>
                  <div className="d-flex flex-column align-items-start justify-content-start">
                    <h6 className={`card-subtitle-${theme} m-0`}>Conversas finalizadas</h6>
                    <h2 id="esperando-atendente" className={`header-text-${theme}`}>{closedChats.length}</h2>
                  </div>
                  <div>
                    <i
                      className={`bi bi-question-circle question-${theme}`}
                      data-bs-toggle="tooltip"
                      data-bs-placement="bottom"
                      title="Conversas que terminaram e foram encerradas."
                    ></i>
                  </div>
                </div>

                <div className={`card p-3 card-${theme}`}>
                  <h6 className={`card-subtitle-${theme}`}>Ranking - Conversas Encerradas</h6>
                  <div className="btn-group px-5 py-2" role="group">
                    <input
                      type="radio"
                      className="btn-check"
                      name="ranking-conversas"
                      id="btnradio1"
                      autoComplete="off"
                      checked={rankingFiltro === 'diario'}
                      onChange={() => setRankingFiltro('diario')}
                    />
                    <label className={`btn btn-primary btn-label-${theme}`} htmlFor="btnradio1">
                      Diário
                    </label>
                    <input
                      type="radio"
                      className="btn-check"
                      name="ranking-conversas"
                      id="btnradio2"
                      autoComplete="off"
                      checked={rankingFiltro === 'semanal'}
                      onChange={() => setRankingFiltro('semanal')}
                    />
                    <label className={`btn btn-primary btn-label-${theme}`} htmlFor="btnradio2">
                      Semanal
                    </label>
                    <input
                      type="radio"
                      className="btn-check"
                      name="ranking-conversas"
                      id="btnradio3"
                      autoComplete="off"
                      checked={rankingFiltro === 'mensal'}
                      onChange={() => setRankingFiltro('mensal')}
                    />
                    <label className={`btn btn-primary btn-label-${theme}`} htmlFor="btnradio3">
                      Mensal
                    </label>
                  </div>
                  <ul id="ranking-conversas" className="mb-0 d-flex flex-column lista-tabela ps-0">
                    <li className={`d-flex justify-content-between table-header-${theme} px-2 py-1`}>
                      <span style={{ width: '20%' }}></span>
                      <span style={{ width: '50%' }}>Nome</span>
                      <span style={{ width: '30%', textAlign: 'right' }}>Total</span>
                    </li>
                    {ranking.map(([userId, total], idx) => (
                      <li key={userId} className={`d-flex justify-content-between px-2 py-1 header-text-${theme}`}>
                        <span style={{ width: '20%' }}>{idx + 1}º</span>
                        <span style={{ width: '50%' }}>{userNames[userId] || userId}</span>
                        <span style={{ width: '30%', textAlign: 'right' }}>{total}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Coluna 3 */}
              {/*
            <div className="col-4 d-flex flex-column gap-3">
              <div className={`card card-${theme} p-2 d-flex flex-row align-items-center justify-content-evenly`}>
                <i className="bi bi-stopwatch card-icon" style={{ fontSize: '2.5rem' }}></i>
                <div className="d-flex flex-column align-items-start justify-content-start">
                  <h6 className={`card-subtitle-${theme} m-0`}>Tempo médio de resposta</h6>
                  <h2 id="tempo-resposta" className={`header-text-${theme}`}>--</h2>
                </div>
                <div>
                  <i
                    className={`bi bi-question-circle question-${theme}`}
                    data-bs-toggle="tooltip"
                    data-bs-placement="bottom"
                    title="Tempo médio que o atendente leva para responder após o contato ir para a fila de atendimento."
                  ></i>
                </div>
              </div>
              <div className={`card card-${theme} p-2 d-flex flex-row align-items-center justify-content-evenly`}>
                <i className="bi bi-hourglass-split card-icon" style={{ fontSize: '2.5rem' }}></i>
                <div className="d-flex flex-column align-items-start justify-content-start">
                  <h6 className={`card-subtitle-${theme} m-0`}>Tempo médio de resolução</h6>
                  <h2 id="tempo-resolucao" className={`header-text-${theme}`}>--</h2>
                </div>
                <div>
                  <i
                    className={`bi bi-question-circle question-${theme}`}
                    data-bs-toggle="tooltip"
                    data-bs-placement="bottom"
                    title="Tempo médio desde o início da intervenção do atendente até o encerramento."
                  ></i>
                </div>
              </div>
              <div className={`card p-3 card-${theme}`}>
                <h6 className={`card-subtitle-${theme}`}>Ranking - Tempo de Resposta</h6>
                <div className="btn-group px-5 py-2" role="group">
                  <input
                    type="radio"
                    className="btn-check"
                    name="ranking-tempo"
                    id="btnradio4"
                    autoComplete="off"
                    defaultChecked
                  />
                  <label className={`btn btn-primary btn-label-${theme}`} htmlFor="btnradio4">
                    Diário
                  </label>
                  <input type="radio" className="btn-check" name="ranking-tempo" id="btnradio5" autoComplete="off" />
                  <label className={`btn btn-primary btn-label-${theme}`} htmlFor="btnradio5">
                    Semanal
                  </label>
                  <input type="radio" className="btn-check" name="ranking-tempo" id="btnradio6" autoComplete="off" />
                  <label className={`btn btn-primary btn-label-${theme}`} htmlFor="btnradio6">
                    Mensal
                  </label>
                </div>
                <ul id="ranking-tempo" className="mb-0 d-flex flex-column lista-tabela ps-0"></ul>
              </div>
            </div>
            */}
            </div>
          )}
          {activeTab === 'graficos' && (
            <div className="d-flex flex-row justify-content-evenly" style={{ flex: 1, width: '100%', height: '100%' }}>
              <div className="col-12" style={{ height: '100%' }}>
                <div className={`p-4 position-relative`} style={{ height: '100%' }}>
                  <h4 className={`header-text-${theme}`}>Gráficos</h4>
                  {/* Dropdown flutuante no topo direito */}
                  <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 2 }}>
                    <select
                      className="form-select form-select-sm"
                      value={chartType}
                      onChange={e => setChartType(e.target.value)}
                      style={{ minWidth: 120 }}
                    >
                      <option value="bar">Gráfico de Barra</option>
                      <option value="donut">Gráfico Donut</option>
                      {customFieldsGraph.map(field => (
                        <option key={field.id} value={`custom-${field.id}`}>{field.label || field.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Botões Ganhos/Perdas só aparecem no gráfico de barra */}
                  {chartType === 'bar' && (
                    <div className="btn-group mt-2 mb-3" role="group" style={{ maxWidth: 250 }}>
                      <button
                        type="button"
                        className={`btn btn-outline-success btn-sm${activeGraficoTab === 'ganhos' ? ' active' : ''}`}
                        onClick={() => setActiveGraficoTab('ganhos')}
                      >
                        Ganhos
                      </button>
                      <button
                        type="button"
                        className={`btn btn-outline-danger btn-sm${activeGraficoTab === 'perdas' ? ' active' : ''}`}
                        onClick={() => setActiveGraficoTab('perdas')}
                      >
                        Perdas
                      </button>
                    </div>
                  )}
                  {(chartType === 'bar' || chartType === 'donut') && (
                    <div style={{ minHeight: 500, maxWidth: 700, width: '100%', margin: '40px auto 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {chartType === 'bar' ? (
                        <Bar data={chartData} options={chartOptions} style={{ width: 700, height: 500 }} />
                      ) : (
                        <Doughnut data={donutData} options={donutOptions} />
                      )}
                    </div>
                  )}
                  {chartType.startsWith('custom-') && customFieldsGraph.length > 0 && (() => {
                    const fieldId = chartType.replace('custom-', '');
                    const field = customFieldsGraph.find(f => String(f.id) === String(fieldId));
                    if (!field) return null;
                    const valuesArr = Array.isArray(customFieldsValues[field.id]) ? customFieldsValues[field.id] : [];
                    const total = valuesArr.reduce((sum, v) => {
                      const num = parseFloat(v.toString().replace(/[^0-9.,-]+/g, '').replace(',', '.'));
                      return !isNaN(num) ? sum + num : sum;
                    }, 0);
                    const barData = {
                      labels: [field.label || field.name],
                      datasets: [
                        {
                          label: 'Total',
                          data: [total],
                          backgroundColor: '#007bff',
                          barPercentage: 1,
                          categoryPercentage: 0.1,
                        },
                      ],
                    };
                    const barOptions = {
                      responsive: true,
                      plugins: {
                        legend: { display: false },
                        title: { display: true, text: field.label || field.name },
                      },
                      scales: { x: { grid: { display: false } }, y: { beginAtZero: true } },
                    };
                    return (
                      <div key={field.id} style={{ width:'100%', maxWidth: 700, height: '500px', margin: '40px auto 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Bar data={barData} options={barOptions} style={{ width: 700, height: 500 }} />
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'relatorio' && (
            <div className="row h-100">
              <div className="col-12">
                <div className={`card card-${theme} p-4`}>
                  <h4 className={`header-text-${theme}`}>Relatório</h4>
                  <div className={`table-responsive custom-table-${theme}`}>  
                    <table className="table table-bordered table-hover m-0">
                      <thead>
                        <tr>
                          <th>Chat ID</th>
                          <th>Fila</th>
                          <th>Usuário</th>
                          <th>Categoria</th>
                          <th>Resumo</th>
                          <th>Assertividade</th>
                          <th>Status</th>
                          <th>Próxima Etapa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.length === 0 && (
                          <tr><td colSpan={8}>Nenhum dado encontrado</td></tr>
                        )}
                        {reportData.map((row, idx) => (
                          <tr key={idx}>
                            <td>
                              <button
                                className="btn btn-link p-0"
                                style={{textDecoration: 'underline', color: '#007bff', cursor: 'pointer', fontSize: '12px' }}
                                onClick={() => handleOpenChatModal(row.chat_id)}
                              >
                                {row.chat_id}
                              </button>
                            </td>
                            <td>{row.queue_id ? (queueMap[row.queue_id] || row.queue_id) : '-'}</td>
                            <td>{row.user_id ? (userMap[row.user_id] || row.user_id) : '-'}</td>
                            <td>{row.categoria}</td>
                            <td>{row.resumo}</td>
                            <td>{row.assertividade}</td>
                            <td>{row.status}</td>
                            <td>{row.proxima_etapa}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Modal de visualização do chat */}
      <ChatViewModal
        show={showChatModal}
        onClose={handleCloseChatModal}
        theme={theme}
        chatId={modalChatId}
        schema={schema}
        url={url}
      />
    </div>
  );
}

export default Dashboard;