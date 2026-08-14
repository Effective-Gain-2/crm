import React, { useEffect, useState } from 'react';
import axios from 'axios';
import LembreteRapido from './LembreteRapido';
import favicon from '../assets/favicon_25.png';

const ChatsMenuLateral = ({ theme, onClose, style = {}, selectedChat }) => {
  const [showLembrete, setShowLembrete] = React.useState(false);
  const [queueData, setQueueData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [connectionData, setConnectionData] = useState(null);
  const [loading, setLoading] = useState(false);

  const userDataStorage = JSON.parse(localStorage.getItem('user'));
  const schema = userDataStorage?.schema;
  const url = process.env.REACT_APP_URL;

  // Função para formatar data
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(Number(timestamp));
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Função para formatar número de telefone
  const formatPhone = (phone) => {
    if (!phone) return 'N/A';
    // Remove caracteres especiais e formata
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `+55 ${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  // Fetch dos dados quando selectedChat mudar ou modal for aberto
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedChat || !schema) return;
      
      setLoading(true);
      // Limpar dados anteriores
      setQueueData(null);
      setUserData(null);
      setConnectionData(null);
      
      try {
        // Fetch da fila
        if (selectedChat.queue_id) {
          try {
            const queueRes = await axios.get(`${url}/queue/get-conn-queues/${selectedChat.queue_id}/${schema}`,
        {
      withCredentials: true
    });
            if (queueRes.data.result && queueRes.data.result.length > 0) {
              setQueueData(queueRes.data.result[0]);
            }
          } catch (error) {
            console.error('Erro ao buscar fila:', error);
          }
        }

        // Fetch do usuário
        if (selectedChat.assigned_user) {
          try {
            const userRes = await axios.get(`${url}/api/search-user/${schema}/${selectedChat.assigned_user}`, {
  withCredentials: true
});
            if (userRes.data.success && userRes.data.user) {
              setUserData(userRes.data.user);
            }
          } catch (error) {
            console.error('Erro ao buscar usuário:', error);
          }
        }

        // Fetch da conexão
        if (selectedChat.connection_id) {
          try {
            const connectionRes = await axios.get(`${url}/connection/search-conn-by-id/${selectedChat.connection_id}/${schema}`,
        {
      withCredentials: true
    });
            if (connectionRes.data.data) {
              const connection = connectionRes.data.data;
              if (connection) {
                setConnectionData(connection);
              }
            }
          } catch (error) {
            console.error('Erro ao buscar conexão:', error);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedChat, schema, url, style.display]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 'min(350px, 90vw)',
        height: '100%',
        background: 'var(--bg-color-' + theme + ')',
        boxShadow: '-2px 0 8px rgba(0,0,0,0.15)',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        transition: 'opacity 0.3s, transform 0.3s',
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 24, margin: '16px 24px 0' }}>
        <img src={favicon} alt="Logo" style={{ height: '100%', width: 'auto' }} />
        <button
          className={`btn btn-2-${theme}`}
          onClick={onClose}
          style={{
            padding: 0,
            width: 28,
            height: 28,
            minWidth: 28,
            minHeight: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            border: 'none'
          }}
        >
          <i className="bi bi-x-lg"></i>
        </button>
      </div>
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
            <h5 style={{ marginBottom: 16 }}>Informações do Contato</h5>
            {loading && (
              <div style={{ textAlign: 'center', marginBottom: 16, color: 'var(--text-color)' }}>
                Carregando...
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
            <strong>Nome do Cliente:</strong>
            <div>{selectedChat?.contact_name || 'Sem Nome'}</div>
            </div>
            <div style={{ marginBottom: 16 }}>
            <strong>Número:</strong>
            <div>{formatPhone(selectedChat?.contact_phone)}</div>
            </div>
            <div style={{ marginBottom: 16 }}>
            <strong>Última atualização:</strong>
            <div>{formatDate(selectedChat?.updated_time)}</div>
            </div>
            <div style={{ marginBottom: 16 }}>
            <strong>Status:</strong>
            <div style={{ 
              color: selectedChat?.status === 'open' ? 'green' : 
                     selectedChat?.status === 'closed' ? 'red' : 
                     selectedChat?.status === 'waiting' ? 'orange' : 'gray'
            }}>
              {selectedChat?.status === 'open' ? 'Aberto' : 
               selectedChat?.status === 'closed' ? 'Fechado' : 
               selectedChat?.status === 'waiting' ? 'Aguardando' : selectedChat?.status || 'N/A'}
            </div>
            </div>
            <div style={{ marginBottom: 16 }}>
            <strong>Fila:</strong>
            <div>{queueData?.name.charAt(0).toUpperCase() + queueData?.name.slice(1) || selectedChat?.queue_id || 'Sem fila'}</div>
            </div>
            <div style={{ marginBottom: 16 }}>
            <strong>Usuário Responsável:</strong>
            <div>{userData?.name || selectedChat?.assigned_user || 'Não atribuído'}</div>
            </div>
            <div style={{ marginBottom: 16 }}>
            <strong>Conexão:</strong>
            <div>{connectionData?.name || selectedChat?.connection_id || 'N/A'}</div>
            </div>
            <div style={{ marginBottom: 16 }}>
            <strong>ID do Chat:</strong>
            <div style={{ fontSize: '12px', wordBreak: 'break-all' }}>
              {selectedChat?.id || 'N/A'}
            </div>
            </div>
        </div>
        <div className='d-flex justify-content-center flex-column align-items-center w-100'>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%'}}>
            <button className={`btn btn-1-${theme}`} onClick={() => setShowLembrete(true)}>
              <i className="bi bi-bell me-2"></i>Criar lembrete de retorno
            </button>
            <button className={`btn btn-2-${theme} d-none`}>Agendar Templates</button>
            <button className={`btn btn-2-${theme} d-none`}>Trocar Tags</button>
            <button className={`btn btn-2-${theme} d-none`}>Trocar Kanban</button>
            <button className={`btn btn-2-${theme} d-none`}>Informações Adicionais</button>
            </div>
        </div>
      </div>
      {showLembrete && (
        <LembreteRapido
          theme={theme}
          show={showLembrete}
          onHide={() => setShowLembrete(false)}
          contactNumber={selectedChat?.contact_phone}
          contactName={selectedChat?.contact_name}
          chatId={selectedChat?.id}
        />
      )}
    </div>
  );
};

export default ChatsMenuLateral;
