import React, { useState, useEffect } from 'react';
import * as bootstrap from 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import axios from 'axios';
import { Card, Button } from 'react-bootstrap';
import DisparoModal from './modalPages/Disparos_novoDisparo';
import DeleteDisparoModal from './modalPages/Disparos_delete';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';



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

function formatInterval(intervalInSeconds) {
  if(intervalInSeconds === null || intervalInSeconds === undefined) return null;
  const seconds = Number(intervalInSeconds);
  if (seconds >= 3600) {
    return `${Math.floor(seconds / 3600)}h`;
  } else if (seconds >= 60) {
    return `${Math.floor(seconds / 60)}min`;
  } else {
    return `${seconds}s`;
  }
}
function DisparosPage({ theme }) {
  const { showError, showSuccess } = useToast();
  const [disparoSelecionado, setDisparoSelecionado] = useState(null);
  const url = process.env.REACT_APP_URL;
  const [disparos, setDisparos] = useState([]);
  const [conexoes, setConexoes] = useState([]);
  const userData = useAuth().userData
  const isAdmin = userData?.role === 'admin' || userData?.role === 'tecnico';
  const schema = userData?.schema;
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

  const handleEdit = (id) => {
    const disparo = disparos.find(d => d.id === id);
    setDisparoSelecionado(disparo);
    const modal = new bootstrap.Modal(document.getElementById('DisparoModal'));
    modal.show();
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
            className={`btn btn-1-${theme} d-flex gap-2`}
            onClick={handleNovoDisparo}

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
                    {formatInterval(disparo.timer) || formatInterval(disparo.min)+'-'+formatInterval(disparo.max) || 'Não definido'}
                  </span>
                </div>
                
                {/* <div className={`header-text-${theme}`}>
                  Status: <span className={`fw-bold`}>
                    {disparo.status}
                  </span>
                </div> */}
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
      <DisparoModal theme={theme} disparo={disparoSelecionado} onSave={handleDisparoSaved} />

      {/* Modal de Exclusão */}
      <DeleteDisparoModal theme={theme} disparo={disparoSelecionado} onDelete={handleDisparoDeleted} />
    </div>
  );
}

export default DisparosPage; 