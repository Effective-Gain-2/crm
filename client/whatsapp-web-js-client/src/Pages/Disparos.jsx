import React, { useState, useEffect } from 'react';
import * as bootstrap from 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import axios from 'axios';
import { Card, Button } from 'react-bootstrap';
import DisparoModal from './modalPages/Disparos_novoDisparo';
import DeleteDisparoModal from './modalPages/Disparos_delete';
import DetalhesDisparoModal from './modalPages/Disparos_detalhes';
import ListasModal from './modalPages/Disparos_listas';
import { useToast } from '../contexts/ToastContext';

const userData = JSON.parse(localStorage.getItem('user'));
const isAdmin = ['admin', 'tecnico', 'master', 'lider'].includes(userData?.role);

function formatDateHour(timestamp) {
  let ts = Number(timestamp);
  if (ts < 1000000000000) {
    ts = ts * 1000;
  }
  const date = new Date(ts);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short'
  });
}

// Só troca de unidade quando a conta fecha exata: arredondar para baixo fazia
// 90s virar "1min", escondendo meio minuto de intervalo entre um envio e outro.
function formatInterval(intervalInSeconds) {
  const seconds = Number(intervalInSeconds) || 0;
  if (seconds >= 3600 && seconds % 3600 === 0) {
    return `${seconds / 3600}h`;
  }
  if (seconds >= 60 && seconds % 60 === 0) {
    return `${seconds / 60}min`;
  }
  return `${seconds}s`;
}

// Intervalo dinâmico grava min/max e deixa timer nulo. Ler só o timer fazia o card
// anunciar "0s" para um disparo configurado, por exemplo, de 30s a 90s.
function descreverIntervalo(disparo) {
  const min = Number(disparo?.min) || 0;
  const max = Number(disparo?.max) || 0;
  if (min > 0 || max > 0) {
    return `${formatInterval(min)} a ${formatInterval(max)}`;
  }
  return formatInterval(disparo?.timer);
}
function DisparosPage({ theme }) {
  const { showError, showSuccess } = useToast();
  const [disparoSelecionado, setDisparoSelecionado] = useState(null);
  const [disparoDetalhado, setDisparoDetalhado] = useState(null);
  const [mostrarListas, setMostrarListas] = useState(false);
  const [listaParaDisparo, setListaParaDisparo] = useState('');
  const userData = JSON.parse(localStorage.getItem('user')); 
  const schema = userData?.schema
  const url = process.env.REACT_APP_URL;
  const [disparos, setDisparos] = useState([]);
  const [conexoes, setConexoes] = useState([]);

  const formatarDataHora = (dataHoraString) => {
    const data = new Date(dataHoraString);
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const recarregarDisparos = async () => {
    try {
      const response = await axios.get(`${url}/campaing/get-campaing/${schema}`, { withCredentials: true });
      setDisparos(response.data);
    } catch (error) {
      console.error('Erro ao buscar disparos:', error);
    }
  };

  // Cancelar só alcança o que ainda está na fila: mensagem enviada não volta.
  const handleCancelarDisparo = async (disparo) => {
    const confirmado = window.confirm(
      `Cancelar o disparo "${disparo.campaing_name}"?\n\n` +
      'As mensagens que ainda não saíram são retiradas da fila. ' +
      'As que já foram enviadas não podem ser desfeitas.'
    );
    if (!confirmado) return;

    try {
      const { data } = await axios.post(
        `${url}/campaing/cancel/${disparo.id}/${schema}`,
        {},
        { withCredentials: true }
      );

      if (data.total_pendentes === 0) {
        showSuccess('Não havia nenhuma mensagem pendente para cancelar.');
      } else if (data.em_execucao > 0) {
        showSuccess(`${data.cancelados} cancelada(s). ${data.em_execucao} já estava(m) saindo e não pôde(puderam) ser interrompida(s).`);
      } else {
        showSuccess(`${data.cancelados} mensagem(ns) cancelada(s).`);
      }
      recarregarDisparos();
    } catch (error) {
      console.error('Erro ao cancelar disparo:', error);
      showError('Erro ao cancelar disparo');
    }
  };

  const handleStartDisparo = async (id) => {
  try {
    await axios.post(`${url}/campaing/start`, { 
        campaing_id: id,
        schema: schema
    },
        {
      withCredentials: true
    });
    showSuccess('Campanha iniciada!');
  } catch (error) {
    console.error('Erro ao iniciar disparo:', error);
    showError('Erro ao iniciar disparo');
  }
};

  useEffect(() => {
    const fetchDisparos = async()=>{
      try{
        const response = await axios.get(`${url}/campaing/get-campaing/${schema}`,
        {
      withCredentials: true
    })
        setDisparos(response.data);
      }catch(error){
        console.error('Erro ao buscar disparos:', error);
      }
    }
    fetchDisparos();
  }, [url, schema])

  useEffect(() => {
    const fetchConexoes = async()=>{
      try{
        const response = await axios.get(`${url}/connection/get-all-connections/${schema}`,
        {
      withCredentials: true
    })
        setConexoes(Array.isArray(response.data) ? response.data : []);
      }catch(error){
        console.error('Erro ao buscar conexões:', error);
        setConexoes([]);
      }
    }
    fetchConexoes();
  }, [url, schema])
  
  // Inicialização dos tooltips
  useEffect(() => {
    let tooltipList = [];
    let deleteModal = null;
    
    try {
      const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
      if (tooltipTriggerList.length > 0) {
        tooltipList = [...tooltipTriggerList].map(el => new bootstrap.Tooltip(el));
      }
      
      // Inicializa o modal de exclusão
      const modalElement = document.getElementById('DeleteDisparoModal');
      if (modalElement) {
        deleteModal = new bootstrap.Modal(modalElement);
      }
    } catch (error) {
      console.error('Erro ao inicializar componentes:', error);
    }
    
    return () => {
      if (tooltipList.length > 0) {
        tooltipList.forEach(t => {
          if (t && t._element) {
            t.dispose();
          }
        });
      }
      if (deleteModal) {
        deleteModal.dispose();
      }
    };
  }, []);

  // Fechar o modal descarta a lista que veio pré-escolhida. Sem isso, reabrir pela
  // mesma lista não mudaria nenhuma prop e o formulário voltaria com o que foi
  // digitado e abandonado antes.
  useEffect(() => {
    const modalEl = document.getElementById('DisparoModal');
    if (!modalEl) return;
    const limpar = () => setListaParaDisparo('');
    modalEl.addEventListener('hidden.bs.modal', limpar);
    return () => modalEl.removeEventListener('hidden.bs.modal', limpar);
  }, []);

  const handleEdit = (id) => {
    const disparo = disparos.find(d => d.id === id);
    setDisparoSelecionado(disparo);
    setListaParaDisparo('');
    const modal = new bootstrap.Modal(document.getElementById('DisparoModal'));
    modal.show();
  };

  // Subir a lista e agendar o disparo dela são o mesmo trabalho: sai do modal de
  // Listas direto para a configuração de data, hora, canal e mensagem, com a lista
  // já escolhida — ninguém precisa reencontrá-la depois no meio das outras.
  const handleAgendarDisparoComLista = (listaId) => {
    setDisparoSelecionado(null);
    setListaParaDisparo(listaId);
    setMostrarListas(false);
    // Abrir o segundo modal antes do primeiro terminar de fechar deixa o fundo escuro
    // preso na tela: espera a transição de saída do modal de Listas.
    setTimeout(() => {
      const modal = new bootstrap.Modal(document.getElementById('DisparoModal'));
      modal.show();
    }, 350);
  };

  const handleDelete = (id) => {
    const disparo = disparos.find(d => d.id === id);
    setDisparoSelecionado(disparo);
    const modalElement = document.getElementById('DeleteDisparoModal');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
      modal.show();
    }
  };

  const handleNovoDisparo = () => {
    setDisparoSelecionado(null);
    setListaParaDisparo('');
    const modal = new bootstrap.Modal(document.getElementById('DisparoModal'));
    modal.show();
  };

  const handleDisparoDeleted = () => {
    // Recarregar lista após exclusão
    const fetchDisparos = async()=>{
      try{
        const response = await axios.get(`${url}/campaing/get-campaing/${schema}`,
        {
      withCredentials: true
    })
        setDisparos(response.data);
      }catch(error){
        console.error('Erro ao buscar disparos:', error);
      }
    }
    fetchDisparos();
    setDisparoSelecionado(null);
  };

  const handleDisparoSaved = () => {
    // Recarregar lista de disparos
    const fetchDisparos = async()=>{
      try{
        const response = await axios.get(`${url}/campaing/get-campaing/${schema}`,
        {
      withCredentials: true
    })
        setDisparos(response.data);
      }catch(error){
        console.error('Erro ao buscar disparos:', error);
      }
    }
    fetchDisparos();
  };

  return (
    <div className="h-100 w-100 ms-2 py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">

        <h2 className={`mb-0 ms-3 header-text-${theme}`} style={{ fontWeight: 400 }}>Disparos</h2>

        <div className="input-group" style={{ width: '40%' }}>
          <input
            type="header-text"
            className={`form-control input-${theme}`}
            placeholder="Pesquisar..."
          />
          <button
            className={`btn btn-2-${theme} d-flex gap-2`}
            onClick={() => setMostrarListas(true)}
            disabled={!isAdmin}
            title="Subir e gerenciar listas de contatos"
          >
            <i className="bi bi-list-ul"></i>
            Listas
          </button>
          <button 
            className={`btn btn-1-${theme} d-flex gap-2`}
            onClick={handleNovoDisparo}
            disabled={!isAdmin}

          >
            <i className="bi-plus-lg"></i>
            Novo Disparo
          </button>        
        </div>
      </div>

      <div className={`w-100 h-100 table-responsive custom-table-${theme}`}
        style={{
          maxHeight: '767px',
          overflowY: 'auto'
        }}
      >
        <div className="d-flex flex-column gap-3 p-3 w-100">
          {Array.isArray(disparos) && disparos.map((disparo) => (
  <div 
    key={disparo.id}
    className={`d-flex flex-row justify-content-between align-items-stretch p-3 card-${theme} border-${theme} rounded w-100`}
  >
    {/* Seção de Dados */}
              <div className="d-flex flex-column flex-grow-1">
                <div className={`header-text-${theme} h5 mb-2`}>{disparo.campaing_name}</div>
                <div className={`header-text-${theme} mb-1`}>
                  Início: {formatDateHour(disparo.start_date)}
                </div>
                <div className={`header-text-${theme} mb-1`}>
                  Intervalo: <span className={`fw-bold`}>
                    {descreverIntervalo(disparo)}
                  </span>
                </div>
                {/* Os canais vivem em campaing_connections; o card lia disparo.connection_id,
                    coluna que a tabela campaing nunca teve — por isso dizia sempre
                    "Nenhum canal", mesmo com o canal salvo. */}
                <div className={`header-text-${theme} mb-1`}>
                  Canais: <span className={`fw-bold`}>
                    {Array.isArray(disparo.canais) && disparo.canais.length > 0
                      ? disparo.canais.join(', ')
                      : 'Nenhum canal'}
                  </span>
                </div>
                <div className={`header-text-${theme} mb-1`}>
                  Alvo: <span className={`fw-bold`}>
                    {disparo.lista_nome ? `Lista ${disparo.lista_nome}` : `Funil ${disparo.sector || '—'}`}
                  </span>
                </div>
                <div className={`header-text-${theme} mb-1`}>
                  Números: <span className="fw-bold">{disparo.previstos ?? 0}</span> previsto(s)
                  {' · '}
                  <span className="fw-bold text-success">{disparo.enviados ?? 0}</span> enviado(s)
                  {' · '}
                  <span className={`fw-bold ${Number(disparo.falhas) > 0 ? 'text-danger' : ''}`}>
                    {disparo.falhas ?? 0}
                  </span> com erro
                </div>
                <div className={`header-text-${theme}`}>
                  Status: <span className={`fw-bold`}>
                    {disparo.status}
                  </span>
                </div>
              </div>

    {/* Divider Vertical */}
    <div className={`border-end border-${theme} mx-3`} style={{ minHeight: '100px' }}></div>

    {/* Seção de Ações */}
    <div className="d-flex flex-column gap-2 justify-content-center">
      <button
        className={`btn btn-2-${theme}`}
        style={{ maxWidth: '42px' }}
        data-bs-toggle="tooltip"
        data-bs-placement="left"
        data-bs-title="Ver detalhes e métricas"
        onClick={() => setDisparoDetalhado(disparo.id)}
      >
        <i className="bi bi-bar-chart-line-fill"></i>
      </button>
      {/* Só há o que cancelar enquanto restam mensagens na fila */}
      {['agendado', 'em andamento'].includes(disparo.status) && (
        <button
          className={`btn delete-btn`}
          style={{ maxWidth: '42px' }}
          data-bs-toggle="tooltip"
          data-bs-placement="left"
          data-bs-title="Cancelar envios pendentes"
          onClick={() => handleCancelarDisparo(disparo)}
          disabled={!isAdmin}
        >
          <i className="bi bi-stop-circle-fill"></i>
        </button>
      )}
      <button
        className={`btn btn-2-${theme}`}
        style={{ maxWidth: '42px' }}
        data-bs-toggle="tooltip"
        data-bs-placement="left"
        data-bs-title="Editar"
        onClick={() => handleEdit(disparo.id)}
        disabled={!isAdmin}

      >
        <i className="bi bi-pencil-fill"></i>
      </button>
      <button
        className={`btn delete-btn`}
        style={{ maxWidth: '42px' }}
        data-bs-toggle="tooltip"
        data-bs-placement="left"
        data-bs-title="Excluir"
        onClick={() => handleDelete(disparo.id)}
        disabled={!isAdmin}

      >
        <i className="bi bi-trash-fill"></i>
      </button>
      {/* <button
        className={`btn success-btn`}
        data-bs-toggle="tooltip"
        data-bs-placement="left"
        data-bs-title="Disparar"
        onClick={() =>{
          handleStartDisparo(disparo.id)
        }} 
        disabled={!isAdmin}

      >
        <i className="bi bi-play-fill"></i>
      </button> */}
    </div>
  </div>
))}
        </div>
      </div>

      {/* Modal de Novo/Editar Disparo */}
      <DisparoModal
        theme={theme}
        disparo={disparoSelecionado}
        onSave={handleDisparoSaved}
        listaInicial={listaParaDisparo}
        onListaCriada={recarregarDisparos}
      />

      {/* Modal de Exclusão */}
      <DeleteDisparoModal theme={theme} disparo={disparoSelecionado} onDelete={handleDisparoDeleted} />

      {/* Modal de Listas de contatos */}
      <ListasModal
        theme={theme}
        show={mostrarListas}
        onHide={() => setMostrarListas(false)}
        onListasMudaram={recarregarDisparos}
        onAgendarDisparo={handleAgendarDisparoComLista}
      />

      {/* Modal de Detalhes e Métricas */}
      <DetalhesDisparoModal
        theme={theme}
        show={!!disparoDetalhado}
        onHide={() => setDisparoDetalhado(null)}
        disparoId={disparoDetalhado}
      />
    </div>
  );
}

export default DisparosPage; 