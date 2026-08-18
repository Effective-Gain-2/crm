import React, { useState, useMemo } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  ArcElement,
  PointElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import ChatViewModal from './Componentes/ChatViewModal';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import useDashboardData from '../hooks/useDashboardData';
import useDashboardFilters from '../hooks/useDashboardFilters';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  ArcElement,
  PointElement,
  Title,
  ChartTooltip,
  Legend
);

function NewDashboard({ theme }) {
  const url = process.env.REACT_APP_URL;
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;

  // Estados de filtros
  const [selectedPeriod, setSelectedPeriod] = useState('diario');
  const [selectedSector, setSelectedSector] = useState('todos');
  const [selectedChannel, setSelectedChannel] = useState('todos');

  // Estados do modal
  const [showChatModal, setShowChatModal] = useState(false);
  const [modalChatId, setModalChatId] = useState(null);

  // Papeis que atendem (recebem lead). 'user' fica so por compatibilidade com base antiga.
  const ATENDE_DASH = ['user', 'operacional', 'lider'];

  // Usar hooks personalizados
  const { data, loading, error, lastUpdate, calculatedData } = useDashboardData(schema, url);
  const { kpis, liveOps, performance, dailyVolume } = useDashboardFilters(
    data, 
    selectedPeriod, 
    selectedSector, 
    selectedChannel
  );

  // Mapeamento de status para nomes legíveis
  const statusMapping = {
    'converted': 'Venda Fechada',
    'no_interest': 'Sem Interesse',
    'open': 'Em Andamento',
    'closed': 'Encerrada',
    'pending': 'Follow-up Pendente',
    'success': 'Sucesso',
    'failed': 'Perdido'
  };

  // Função para obter nome legível do status
  const getStatusLabel = (status) => {
    return statusMapping[status] || status;
  };

  // Função para obter cor do status
  const getStatusColor = (status) => {
    const colorMap = {
      'converted': 'success',
      'success': 'success',
      'no_interest': 'secondary',
      'open': 'primary',
      'pending': 'warning',
      'failed': 'danger',
      'closed': 'info'
    };
    return colorMap[status] || 'secondary';
  };

  // Função para obter ícone do status
  const getStatusIcon = (status) => {
    const iconMap = {
      'converted': 'bi-check-circle',
      'success': 'bi-check-circle',
      'no_interest': 'bi-slash-circle',
      'open': 'bi-chat-dots',
      'pending': 'bi-clock',
      'failed': 'bi-x-circle',
      'closed': 'bi-check-circle'
    };
    return iconMap[status] || 'bi-info-circle';
  };

  // Gerar labels das datas dos últimos 7 dias
  const generateLast7DaysLabels = () => {
    const labels = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      labels.push(`${day}/${month}`);
    }
    
    return labels;
  };

  // Dados para gráficos
  const performanceChartData = useMemo(() => ({
    labels: generateLast7DaysLabels(),
    datasets: [{
      label: 'Volume por Dia',
      data: dailyVolume,
      borderColor: theme === 'dark' ? 'rgb(75, 192, 192)' : 'rgb(75, 192, 192)',
      backgroundColor: theme === 'dark' ? 'rgba(75, 192, 192, 0.1)' : 'rgba(75, 192, 192, 0.2)',
      tension: 0.1
    }]
  }), [dailyVolume, theme]);

  const channelDistributionData = useMemo(() => ({
    labels: data.connections?.map(conn => conn.name) || [],
    datasets: [{
      data: data.connections?.map(conn => calculatedData.channelOpenTotals[conn.id] || 0) || [],
      backgroundColor: ['#25D366', '#007bff', '#E4405F'],
      borderColor: theme === 'dark' ? ['#1a1a1a', '#1a1a1a', '#1a1a1a'] : ['#ffffff', '#ffffff', '#ffffff'],
      borderWidth: 2
    }]
  }), [data.connections, calculatedData.channelOpenTotals, theme]);

  // Função utilitária para renderizar tooltip react-bootstrap
  const renderTooltip = (msg) => (
    <Tooltip id={Math.random().toString().replace('.', '')} style={{ fontSize: '0.95em', maxWidth: 260 }}>
      {msg}
    </Tooltip>
  );

  // Função para abrir modal do chat
  const handleOpenChatModal = (chatId) => {
    setModalChatId(chatId);
    setShowChatModal(true);
  };

  const handleCloseChatModal = () => {
    setShowChatModal(false);
    setModalChatId(null);
  };

  // Verificar se há erros
  const hasErrors = Object.values(error).some(err => err !== null);
  const isLoading = Object.values(loading).some(load => load);
  if(userData.role==='user'){
    return(
      <div className="container-fluid ps-2 pe-0" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div className="mb-4">
          <div className="d-flex align-items-center mb-3">
            <h5 className={`header-text-${theme} mb-0`}>Histórico de Conversas</h5>
            <div className="flex-grow-1 ms-3">
              <hr className={`border-${theme}`} />
            </div>
          </div>
          <div className="row">
            <div className="col-12">
              <div className={`card card-${theme} p-3`}>
                <div className={`table-responsive custom-table-${theme}`}>
                  <table className={`table table-bordered table-hover m-0 table-${theme}`}>
                    <thead className={`table-${theme}`}>
                      <tr>
                        <th><i className="bi bi-calendar me-1"></i>Data</th>
                        <th><i className="bi bi-phone me-1"></i>Canal</th>
                        <th><i className="bi bi-list-ul me-1"></i>Fila</th>
                        <th><i className="bi bi-person me-1"></i>Atendente</th>
                        <th><i className="bi bi-tag me-1"></i>Categoria</th>
                        <th><i className="bi bi-info-circle me-1"></i>Status</th>
                        <th><i className="bi bi-chat-text me-1"></i>Resumo</th>
                        <th><i className="bi bi-arrow-right me-1"></i>Próxima Etapa</th>
                        <th><i className="bi bi-gear me-1 d-flex justify-content-center"></i></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!data.reportData || data.reportData.length === 0) && (
                        <tr><td colSpan={9} className="text-center">Nenhum dado encontrado</td></tr>
                      )}
                      {data.reportData?.slice(0, 10).filter(['tecnico','admin','master','lider'].includes(userData.role)?r=>r.id!==null:r=>r.user_id===userData.id).map((row, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? `table-light-${theme}` : ''}>
                          <td>{new Date().toLocaleDateString('pt-BR')}</td>
                          <td>WhatsApp</td>
                          <td>{row.queue_id ? (data.queueMap[row.queue_id] || `Fila ${row.queue_id}`) : '-'}</td>
                          <td>{row.user_id ? (data.userNames[row.user_id] || `Usuário ${row.user_id}`) : '-'}</td>
                          <td>{row.categoria || '-'}</td>
                          <td>
                            <span className={`badge bg-${getStatusColor(row.status)}`}>
                              <i className={`${getStatusIcon(row.status)} me-1`}></i>
                              {getStatusLabel(row.status)}
                            </span>
                          </td>
                          <td>
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip id={`tooltip-resumo-${idx}`}>{row.resumo || 'Sem resumo disponível'}</Tooltip>}
                            >
                              <span className="text-truncate d-inline-block" style={{ maxWidth: '150px' }}>
                                {row.resumo ? (row.resumo.length > 30 ? row.resumo.substring(0, 30) + '...' : row.resumo) : '-'}
                              </span>
                            </OverlayTrigger>
                          </td>
                          <td className={`table-light-${theme}`}>
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip id={`tooltip-proxima-etapa-${idx}`}>{row.proxima_etapa || 'Não definida'}</Tooltip>}
                            >
                              <span className="text-truncate d-inline-block" style={{ maxWidth: '150px' }}>
                                {row.proxima_etapa ? (row.proxima_etapa.length > 30 ? row.proxima_etapa.substring(0, 30) + '...' : row.proxima_etapa) : 'Não definida'}
                              </span>
                            </OverlayTrigger>
                          </td>
                          <td className="d-flex justify-content-center border-0">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleOpenChatModal(row.chat_id)}
                              data-bs-toggle="tooltip"
                              data-bs-placement="top"
                              title="Visualizar conversa"
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ChatViewModal
        show={showChatModal}
        onClose={handleCloseChatModal}
        theme={theme}
        chatId={modalChatId}
        schema={schema}
        url={url}
      />
    </div>
    )
  }
  return (
    // height:100% travava a altura e escondia o conteúdo que passava da tela
    <div className="pt-3" style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* CSS personalizado para filtros */}
      <style>
        {`
          .custom-select-${theme} {
            appearance: none;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='${theme === 'dark' ? '%23ffffff' : '%23000000'}' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m1 6 7 7 7-7'/%3e%3c/svg%3e");
            background-repeat: no-repeat;
            background-position: right 8px center;
            background-size: 16px 12px;
            padding-right: 32px !important;
          }
          
          .custom-select-${theme}:hover {
            border-color: var(--primary-color) !important;
          }
          
          .custom-select-${theme}:focus {
            border-color: var(--primary-color) !important;
            box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
            outline: none;
          }
          
          .kpi-tooltip {
            cursor: help;
            transition: all 0.2s ease;
          }
          
          .kpi-tooltip:hover {
            color: var(--primary-color) !important;
          }
          
          .kpi-tooltip-light {
            color: var(--color-light) !important;
            opacity: 0.75;
          }
          
          .kpi-tooltip-dark {
            color: var(--color-dark) !important;
            opacity: 0.5;
          }

          .tooltip {
            z-index: 9999 !important;
          }
          
          .tooltip-inner {
            max-width: 300px !important;
            background-color: ${theme === 'dark' ? '#333' : '#fff'} !important;
            color: ${theme === 'dark' ? '#fff' : '#000'} !important;
            border: 1px solid ${theme === 'dark' ? '#666' : '#ccc'} !important;
          }
          
          .tooltip.bs-tooltip-top .tooltip-arrow::before {
            border-top-color: ${theme === 'dark' ? '#333' : '#fff'} !important;
          }
          
          .chart-container canvas {
            filter: ${theme === 'dark' ? 'brightness(0.9)' : 'brightness(1)'};
          }
          
          .chartjs-legend {
            color: ${theme === 'dark' ? '#ffffff' : '#000000'} !important;
          }
          
          .chartjs-tooltip {
            background-color: ${theme === 'dark' ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.95)'} !important;
            color: ${theme === 'dark' ? '#ffffff' : '#000000'} !important;
            border: 1px solid ${theme === 'dark' ? '#666' : '#ddd'} !important;
          }
          
          .chartjs-axis-label {
            color: ${theme === 'dark' ? '#ffffff' : '#000000'} !important;
          }
          
          .chartjs-grid-line {
            stroke: ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} !important;
          }
          
          .chartjs-doughnut-border {
            stroke: ${theme === 'dark' ? '#1a1a1a' : '#ffffff'} !important;
            stroke-width: 2px !important;
          }
          
          .text-muted-${theme} {
            color: ${theme === 'dark' ? '#a0a0a0' : '#6c757d'} !important;
          }
          
          .last-update-text {
            white-space: nowrap;
            flex-shrink: 0;
            min-width: fit-content;
          }
          
          .filters-container {
            align-items: center;
            flex-wrap: nowrap;
            min-height: 38px;
          }

          .loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }
        `}
      </style>
      
      <div className="container-fluid ps-2 pe-0" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* Loading overlay */}
        {isLoading && (
          <div className="loading-overlay">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
          </div>
        )}

        {/* Error alert */}
        {hasErrors && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            <strong>Erro ao carregar dados:</strong> Alguns dados podem não estar disponíveis.
            <button type="button" className="btn-close" data-bs-dismiss="alert"></button>
          </div>
        )}
        
        {/* Header com filtros e última atualização */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className={`header-text-${theme}`} style={{ fontWeight: 400 }}>Dashboard</h2>
          </div>
          <div className="d-flex align-items-center gap-3 filters-container">
            {/* Informação de última atualização */}
            <small className={`text-muted text-muted-${theme} last-update-text`}>
              <i className="bi bi-clock me-1"></i>
              Atualizado às {lastUpdate.toLocaleTimeString('pt-BR')}
            </small>
            
            {/* Filtros seguindo padrão do login */}
            <div className="input-group" style={{ minWidth: '140px' }}>
              <span className={`input-group-text igt-${theme}`}>
                <i className="bi bi-calendar3"></i>
              </span>
              <select 
                className={`form-control input-${theme} custom-select-${theme}`}
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                style={{
                  fontSize: '0.875rem',
                  padding: '8px 12px',
                  cursor: 'pointer'
                }}
              >
                <option value="diario">Diário</option>
                <option value="semanal">Semanal</option>
                <option value="mensal">Mensal</option>
              </select>
            </div>
            
            <div className="input-group d-none" style={{ minWidth: '200px' }}>
              <span className={`input-group-text igt-${theme} d-none`}>
                <i className="bi bi-building"></i>
              </span>
              <select 
                className={`form-control input-${theme} custom-select-${theme}`}
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                style={{
                  fontSize: '0.875rem',
                  padding: '8px 12px',
                  cursor: 'pointer',
                }}
              >
                <option value="todos">Todos os Setores</option>
                <option value="vendas">Vendas</option>
                <option value="suporte">Suporte</option>
              </select>
            </div>
            
            <div className="input-group d-none" style={{ minWidth: '220px' }}>
              <span className={`input-group-text igt-${theme}`}>
                <i className="bi bi-phone"></i>
              </span>
              <select 
                className={`form-control input-${theme} custom-select-${theme} d-none`}
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                style={{
                  fontSize: '0.875rem',
                  padding: '8px 12px',
                  cursor: 'pointer'
                }}
              >
                <option value="todos">Todos os Canais</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="webchat">Webchat</option>
              </select>
            </div>
          </div>
        </div>

        {/* Seção 1 - KPIs Estratégicos */}
        <div className="mb-4">
          <div className="d-flex align-items-center mb-3">
            <h5 className={`header-text-${theme} mb-0`}>KPIs Estratégicos</h5>
            <div className="flex-grow-1 ms-3">
              <hr className={`border-${theme}`} />
            </div>
          </div>
          <div className="row">
            <div className="col-4">
              <div className={`card card-${theme} p-3 text-center`} style={{ height: '120px', overflow: 'hidden' }}>
                <div className="d-flex align-items-center mb-2">
                  <span className="d-flex align-items-center">
                    <i className="bi bi-graph-up-arrow me-2 text-success"></i>
                    <h6 className={`card-subtitle-${theme} mb-0`}>
                      Taxa de Conversão
                    </h6>
                  </span>
                  <OverlayTrigger placement="top" overlay={renderTooltip('Conversas marcadas como "ganho" sobre o total de conversas encerradas no período selecionado.')}>
                    <i className={`bi bi-question-circle ms-1 kpi-tooltip kpi-tooltip-${theme}`}></i>
                  </OverlayTrigger>
                </div>
                <h3 className={`header-text-${theme} mb-1`}>{kpis.conversionRate}%</h3>
                {/* <small className="text-success">
                  <i className="bi bi-arrow-up me-1"></i>
                  +5.2%
                </small> */}
              </div>
            </div>
          
            <div className="col-4">
              <div className={`card card-${theme} p-3 text-center`} style={{ height: '120px', overflow: 'hidden' }}>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="d-flex align-items-center">
                    <i className="bi bi-clock-history me-2 text-info"></i>
                    <h6 className={`card-subtitle-${theme} mb-0`}>
                      Tempo Médio Resolução
                    </h6>
                  </span>
                  <OverlayTrigger placement="top" overlay={renderTooltip('Tempo médio entre o início e o encerramento das conversas, mostrando a eficiência do atendimento no período selecionado.')}>
                    <i className={`bi bi-question-circle ms-1 kpi-tooltip kpi-tooltip-${theme}`}></i>
                  </OverlayTrigger>
                </div>
                <h3 className={`header-text-${theme} mb-1`}>{kpis.avgResolutionTime}min</h3>
                {/* <small className="text-success">
                  <i className="bi bi-arrow-down me-1"></i>
                  -2.1min
                </small> */}
              </div>
            </div>
            <div className="col-4">
              <div className={`card card-${theme} p-3 text-center`} style={{ height: '120px', overflow: 'hidden' }}>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="d-flex align-items-center">
                    <i className="bi bi-telephone me-2 text-info"></i>
                    <h6 className={`card-subtitle-${theme} mb-0`}>
                      Volume Total
                    </h6>
                  </span>
                  <OverlayTrigger placement="top" overlay={renderTooltip('Número total de conversas atendidas e finalizadas no período selecionado, independente do resultado.')}>
                    <i className={`bi bi-question-circle ms-1 kpi-tooltip kpi-tooltip-${theme}`}></i>
                  </OverlayTrigger>
                </div>
                <h3 className={`header-text-${theme} mb-1`}>{kpis.totalVolume}</h3>
                {/* <small className="text-success">
                  <i className="bi bi-arrow-up me-1"></i>
                  +12%
                </small> */}
              </div>
            </div>
          </div>
        </div>

        {/* Seção 2 - Live Ops */}
        <div className="mb-4">
          <div className="d-flex align-items-center mb-3">
            <h5 className={`header-text-${theme} mb-0`}>Monitoramento ao Vivo</h5>
            <div className="flex-grow-1 ms-3">
              <hr className={`border-${theme}`} />
            </div>
          </div>
          <div className="row">
            <div className="col-4">
              <div className={`card card-${theme} p-3`} style={{ height: '120px', overflow: 'hidden' }}>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="d-flex align-items-center">
                    <i className="bi bi-people me-2 text-success"></i>
                    <h6 className={`card-subtitle-${theme} mb-0`}>
                      Atendentes Online
                    </h6>
                  </span>
                  <OverlayTrigger placement="top" overlay={renderTooltip('Número atual de atendentes humanos disponíveis e ativos para receber novas conversas no momento.')}>
                    <i className={`bi bi-question-circle ms-1 kpi-tooltip kpi-tooltip-${theme}`}></i>
                  </OverlayTrigger>
                </div>
                <div className="d-flex align-items-center">
                  <h3 className={`header-text-${theme} mb-0 me-2`}>{liveOps.onlineUsers}</h3>
                  <small className={`header-text-${theme}`}>/ {data.users?.filter(u => ATENDE_DASH.includes(String(u.permission || '').toLowerCase())).length || 0}</small>
                </div>
                <div className="mt-2">
                  {data.users?.filter(u => u.online && ATENDE_DASH.includes(String(u.permission || '').toLowerCase())).slice(0, 3).map(user => (
                    <span key={user.id} className="badge bg-success me-1">
                      {user.nome || user.username}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="col-4">
              <div className={`card card-${theme} p-3`} style={{ height: '120px', overflow: 'hidden' }}>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="d-flex align-items-center">
                    <i className="bi bi-list-ul me-2 text-primary"></i>
                    <h6 className={`card-subtitle-${theme} mb-0`}>
                      Filas Ativas
                    </h6>
                  </span>
                  <OverlayTrigger placement="top" overlay={renderTooltip('Filas com pelo menos uma conversa em andamento.')}>
                    <i className={`bi bi-question-circle ms-1 kpi-tooltip kpi-tooltip-${theme}`}></i>
                  </OverlayTrigger>
                </div>
                <h3 className={`header-text-${theme} mb-1`}>{liveOps.activeQueues}</h3>
                <small className={`header-text-${theme}`}>filas com conversas</small>
              </div>
            </div>
            <div className="col-4">
              <div className={`card card-${theme} p-3`} style={{ height: '120px', overflow: 'hidden' }}>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="d-flex align-items-center">
                    <i className="bi bi-chat-dots me-2 text-info"></i>
                    <h6 className={`card-subtitle-${theme} mb-0`}>Em Andamento</h6>
                  </span>
                  <OverlayTrigger placement="top" overlay={renderTooltip('Número de conversas que estão sendo atendidas atualmente, com tempo médio de resposta dos atendentes.')}>
                    <i className={`bi bi-question-circle ms-1 kpi-tooltip kpi-tooltip-${theme}`}></i>
                  </OverlayTrigger>
                </div>
                <h3 className={`header-text-${theme} mb-1`}>{liveOps.activeChats}</h3>
                <small className={`header-text-${theme} d-none`}>Tempo médio: {liveOps.avgResponseTime}min</small>
              </div>
            </div>
          </div>
        </div>

        {/* Seção 3 - Performance */}
        <div className="mb-4">
          <div className="d-flex align-items-center mb-3">
            <h5 className={`header-text-${theme} mb-0`}>Performance e Produtividade</h5>
            <div className="flex-grow-1 ms-3">
              <hr className={`border-${theme}`} />
            </div>
            <small className={`text-muted text-muted-${theme}`}>
              <i className="bi bi-calendar-week me-1"></i>
              Últimos 7 dias
            </small>
          </div>
          <div className="row mb-4">
            <div className="col-8">
              <div className={`card card-${theme} p-3`} style={{ height: '300px', overflow: 'hidden' }}>
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <span className="d-flex align-items-center">
                    <i className="bi bi-graph-up me-2 text-primary"></i>
                    <h6 className={`card-subtitle-${theme} mb-0`}>Volume por dia</h6>
                  </span>
                  <OverlayTrigger placement="top" overlay={renderTooltip('Distribuição do volume de conversas ao longo da última semana, mostrando os dias de maior e menor movimento, servindo principalmente para mensurar campanhas de publicidade.')}>
                    <i className={`bi bi-question-circle ms-1 kpi-tooltip kpi-tooltip-${theme}`}></i>
                  </OverlayTrigger>
                </div>
                <div className="chart-container" style={{ height: '220px', overflow: 'hidden' }}>
                  <Line data={performanceChartData} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
                        titleColor: theme === 'dark' ? '#fff' : '#000',
                        bodyColor: theme === 'dark' ? '#fff' : '#000'
                      }
                    },
                    scales: { 
                      y: { 
                        beginAtZero: true,
                        grid: {
                          color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                        },
                        ticks: {
                          color: theme === 'dark' ? '#ffffff' : '#000000'
                        }
                      },
                      x: {
                        grid: {
                          color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                        },
                        ticks: {
                          color: theme === 'dark' ? '#ffffff' : '#000000'
                        }
                      }
                    }
                  }} />
                </div>
              </div>
            </div>
            <div className="col-4">
              <div className={`card card-${theme} p-3`} style={{ height: '300px', overflow: 'hidden' }}>
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <span className="d-flex align-items-center">
                    <i className="bi bi-trophy me-2 text-warning"></i>
                    <h6 className={`card-subtitle-${theme} mb-0`}>Ranking Atendentes</h6>
                  </span>
                  <OverlayTrigger placement="top" overlay={renderTooltip('Lista dos atendentes com maior número de conversas finalizadas no período selecionado, ordenados por produtividade.')}>
                    <i className={`bi bi-question-circle ms-1 kpi-tooltip kpi-tooltip-${theme}`}></i>
                  </OverlayTrigger>
                </div>
                <div style={{ height: '220px', overflow: 'auto' }}>
                  {performance.userRanking?.map((user, index) => (
                    <div key={user.userId} className="d-flex justify-content-between align-items-center mb-2">
                      <span className={`header-text-${theme}`}>
                        {index === 0 && <i className="bi bi-award-fill text-warning me-1"></i>}
                        {index === 1 && <i className="bi bi-award-fill text-secondary me-1"></i>}
                        {index === 2 && <i className="bi bi-award-fill text-danger me-1"></i>}
                        {index > 2 && <i className="bi bi-circle me-1"></i>}
                        {user.name}
                      </span>
                      <span className={`badge bg-${index < 3 ? 'primary' : 'secondary'}`}>{user.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-6">
              <div className={`card card-${theme} p-3`} style={{ height: '250px', overflow: 'hidden' }}>
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <span className="d-flex align-items-center">
                    <i className="bi bi-bar-chart me-2 text-success"></i>
                    <h6 className={`card-subtitle-${theme} mb-0`}>
                      Conversão por Canal
                    </h6>
                  </span>
                  <OverlayTrigger placement="top" overlay={renderTooltip('Taxa de sucesso (conversão) separada por canal de entrada, mostrando qual canal gera mais resultados positivos.')}>
                    <i className={`bi bi-question-circle ms-1 kpi-tooltip kpi-tooltip-${theme}`}></i>
                  </OverlayTrigger>
                </div>
                <div className="chart-container" style={{ height: '180px', overflow: 'hidden' }}>
                  <Bar data={{
                    labels: data.connections?.map(conn => conn.name) || [],
                    datasets: [{
                      label: 'Taxa de Conversão',
                      data: calculatedData.conversionByChannel || [],
                      backgroundColor: ['#25D366', '#007bff', '#E4405F']
                    }]
                  }} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
                        titleColor: theme === 'dark' ? '#fff' : '#000',
                        bodyColor: theme === 'dark' ? '#fff' : '#000'
                      }
                    },
                    scales: { 
                      y: { 
                        beginAtZero: true, 
                        max: 100,
                        grid: {
                          color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                        },
                        ticks: {
                          color: theme === 'dark' ? '#ffffff' : '#000000'
                        }
                      },
                      x: {
                        grid: {
                          color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                        },
                        ticks: {
                          color: theme === 'dark' ? '#ffffff' : '#000000'
                        }
                      }
                    }
                  }} />
                </div>
              </div>
            </div>
            <div className="col-6">
              <div className={`card card-${theme} p-3`} style={{ height: '250px', overflow: 'hidden' }}>
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <span className="d-flex align-items-center">
                    <i className="bi bi-pie-chart me-2 text-info"></i>
                    <h6 className={`card-subtitle-${theme} mb-0`}>
                      Distribuição por Canal
                    </h6>
                  </span>
                  <OverlayTrigger placement="top" overlay={renderTooltip('Percentual de conversas por canal de origem, mostrando como o volume se distribui entre WhatsApp, Webchat e outros canais.')}>
                    <i className={`bi bi-question-circle ms-1 kpi-tooltip kpi-tooltip-${theme}`}></i>
                  </OverlayTrigger>
                </div>
                <div className="chart-container" style={{ height: '180px', overflow: 'hidden' }}>
                  <Doughnut data={channelDistributionData} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                      legend: { 
                        position: 'bottom',
                        labels: {
                          color: theme === 'dark' ? '#ffffff' : '#000000'
                        }
                      },
                      tooltip: {
                        backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
                        titleColor: theme === 'dark' ? '#fff' : '#000',
                        bodyColor: theme === 'dark' ? '#fff' : '#000'
                      }
                    }
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Seção 4.5 - Motivos de Ganho e Perda */}
        <div className="mb-4">
          <div className="d-flex align-items-center mb-3">
            <h5 className={`header-text-${theme} mb-0`}>Motivos de Ganho e Perda</h5>
            <div className="flex-grow-1 ms-3">
              <hr className={`border-${theme}`} />
            </div>
          </div>
          <div className="row">
            <div className="col-6">
              <div className={`card card-${theme} p-3`} style={{ height: '300px', overflow: 'hidden' }}>
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <span className="d-flex align-items-center">
                    <i className="bi bi-check-circle me-2 text-success"></i>
                    <h6 className={`card-subtitle-${theme} mb-0`}>Motivos de Ganho</h6>
                  </span>
                  <OverlayTrigger placement="top" overlay={renderTooltip('Principais motivos que levaram ao fechamento positivo das conversas, mostrando os fatores de sucesso.')}>
                    <i className={`bi bi-question-circle ms-1 kpi-tooltip kpi-tooltip-${theme}`}></i>
                  </OverlayTrigger>
                </div>
                <div className="chart-container" style={{ height: '220px', overflow: 'hidden' }}>
                  <Bar data={{
                    labels: calculatedData.successStatusList?.map(s => s.value) || [],
                    datasets: [{
                      label: 'Ganhos',
                      data: calculatedData.ganhoDatas || [],
                      backgroundColor: '#28a745'
                    }]
                  }} options={{
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
                        titleColor: theme === 'dark' ? '#fff' : '#000',
                        bodyColor: theme === 'dark' ? '#fff' : '#000'
                      }
                    },
                    scales: { 
                      x: { 
                        beginAtZero: true,
                        max: 100,
                        grid: {
                          color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                        },
                        ticks: {
                          color: theme === 'dark' ? '#ffffff' : '#000000'
                        }
                      },
                      y: {
                        grid: {
                          color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                        },
                        ticks: {
                          color: theme === 'dark' ? '#ffffff' : '#000000'
                        }
                      }
                    }
                  }} />
                </div>
              </div>
            </div>
            <div className="col-6">
              <div className={`card card-${theme} p-3`} style={{ height: '300px', overflow: 'hidden' }}>
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <span className="d-flex align-items-center">
                    <i className="bi bi-x-circle me-2 text-danger"></i>
                    <h6 className={`card-subtitle-${theme} mb-0`}>Motivos de Perda</h6>
                  </span>
                  <OverlayTrigger placement="top" overlay={renderTooltip('Principais motivos que levaram ao fechamento negativo das conversas, mostrando os pontos de melhoria.')}>
                    <i className={`bi bi-question-circle ms-1 kpi-tooltip kpi-tooltip-${theme}`}></i>
                  </OverlayTrigger>
                </div>
                <div className="chart-container" style={{ height: '220px', overflow: 'hidden' }}>
                  <Bar data={{
                    labels: calculatedData.loseStatusList?.map(s => s.value) || [],
                    datasets: [{
                      label: 'Perdas',
                      data: calculatedData.perdaDatas || [],
                      backgroundColor: '#dc3545'
                    }]
                  }} options={{
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
                        titleColor: theme === 'dark' ? '#fff' : '#000',
                        bodyColor: theme === 'dark' ? '#fff' : '#000'
                      }
                    },
                    scales: { 
                      x: { 
                        beginAtZero: true,
                        max: 100,
                        grid: {
                          color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                        },
                        ticks: {
                          color: theme === 'dark' ? '#ffffff' : '#000000'
                        }
                      },
                      y: {
                        grid: {
                          color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                        },
                        ticks: {
                          color: theme === 'dark' ? '#ffffff' : '#000000'
                        }
                      }
                    }
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Seção 5 - Histórico e Drilldown */}
        <div className="mb-4">
          <div className="d-flex align-items-center mb-3">
            <h5 className={`header-text-${theme} mb-0`}>Histórico de Conversas</h5>
            <div className="flex-grow-1 ms-3">
              <hr className={`border-${theme}`} />
            </div>
          </div>
          <div className="row">
            <div className="col-12">
              <div className={`card card-${theme} p-3`}>
                <div className={`table-responsive custom-table-${theme}`}>
                  <table className={`table table-bordered table-hover m-0 table-${theme}`}>
                    <thead className={`table-${theme}`}>
                      <tr>
                        <th><i className="bi bi-calendar me-1"></i>Data</th>
                        <th><i className="bi bi-phone me-1"></i>Canal</th>
                        <th><i className="bi bi-list-ul me-1"></i>Fila</th>
                        <th><i className="bi bi-person me-1"></i>Atendente</th>
                        <th><i className="bi bi-tag me-1"></i>Categoria</th>
                        <th><i className="bi bi-info-circle me-1"></i>Status</th>
                        <th><i className="bi bi-chat-text me-1"></i>Resumo</th>
                        <th><i className="bi bi-arrow-right me-1"></i>Próxima Etapa</th>
                        <th><i className="bi bi-gear me-1 d-flex justify-content-center"></i></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!data.reportData || data.reportData.length === 0) && (
                        <tr><td colSpan={9} className="text-center">Nenhum dado encontrado</td></tr>
                      )}
                      {data.reportData?.slice(0, 10).filter(['tecnico','admin','master','lider'].includes(userData.role)?r=>r.id!==null:r=>r.user_id===userData.id).map((row, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? `table-light-${theme}` : ''}>
                          <td>{new Date().toLocaleDateString('pt-BR')}</td>
                          <td>WhatsApp</td>
                          <td>{row.queue_id ? (data.queueMap[row.queue_id] || `Fila ${row.queue_id}`) : '-'}</td>
                          <td>{row.user_id ? (data.userNames[row.user_id] || `Usuário ${row.user_id}`) : '-'}</td>
                          <td>{row.categoria || '-'}</td>
                          <td>
                            <span className={`badge bg-${getStatusColor(row.status)}`}>
                              <i className={`${getStatusIcon(row.status)} me-1`}></i>
                              {getStatusLabel(row.status)}
                            </span>
                          </td>
                          <td>
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip id={`tooltip-resumo-${idx}`}>{row.resumo || 'Sem resumo disponível'}</Tooltip>}
                            >
                              <span className="text-truncate d-inline-block" style={{ maxWidth: '150px' }}>
                                {row.resumo ? (row.resumo.length > 30 ? row.resumo.substring(0, 30) + '...' : row.resumo) : '-'}
                              </span>
                            </OverlayTrigger>
                          </td>
                          <td className={`table-light-${theme}`}>
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip id={`tooltip-proxima-etapa-${idx}`}>{row.proxima_etapa || 'Não definida'}</Tooltip>}
                            >
                              <span className="text-truncate d-inline-block" style={{ maxWidth: '150px' }}>
                                {row.proxima_etapa ? (row.proxima_etapa.length > 30 ? row.proxima_etapa.substring(0, 30) + '...' : row.proxima_etapa) : 'Não definida'}
                              </span>
                            </OverlayTrigger>
                          </td>
                          <td className="d-flex justify-content-center border-0">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleOpenChatModal(row.chat_id)}
                              data-bs-toggle="tooltip"
                              data-bs-placement="top"
                              title="Visualizar conversa"
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
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

export default NewDashboard;