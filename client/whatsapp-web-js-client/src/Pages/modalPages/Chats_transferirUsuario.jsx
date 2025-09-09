import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import axios from 'axios';
import { socket } from '../../socket';
import './assets/style.css';

function TransferirUsuarioModal({ show, onHide, theme, selectedChat, schema, url }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    if (show && selectedChat && schema && url) {
      fetchUsersInQueue();
    }
  }, [show, selectedChat, schema, url]);

  useEffect(() => {
    if (show) {
      setSelectedUser(null);
    }
  }, [show]);

  useEffect(() => {
    if (users.length > 0 && selectedChat) {
      // Filtra usuários, removendo o usuário atual do chat
      const filtered = users.filter(user => user.id !== selectedChat.assigned_user);
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [users, selectedChat]);

  const fetchUsersInQueue = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${url}/queue/get-users-in-queue/${selectedChat.queue_id}/${schema}`,
        {
      withCredentials: true
    });
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Erro ao buscar usuários da fila:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedUser) {
      console.error('Nenhum usuário selecionado');
      return;
    }
    
    if (!selectedChat) {
      console.error('Nenhum chat selecionado');
      return;
    }
    
    if (!schema) {
      console.error('Schema não definido');
      return;
    }
    
    try {
      setLoading(true);
      
      const requestData = {
        chat_id: selectedChat.id,
        user_id: selectedUser.id,
        schema: schema
      };
      
      console.log('Enviando dados para transferência:', requestData);
      
      const response = await axios.post(`${url}/chat/setUser`, requestData,
        {
      withCredentials: true
    });
      
              if (response.data.success) {
          onHide();
          // Verificar se o socket está disponível antes de usar
          if (socket && typeof socket.emit === 'function') {
            socket.emit('chatTransferred', {
              chatId: selectedChat.id,
              newUserId: selectedUser.id,
              oldUserId: selectedChat.assigned_user,
              schema: schema
            });
          } else {
            console.warn('Socket não disponível, recarregando página...');
            window.location.reload();
          }
        } else {
        }
    } catch (error) {
      console.error('Erro ao transferir chat:', error);
      console.error('Detalhes do erro:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        chatId: selectedChat.id,
        newUserId: selectedUser.id,
        schema: schema
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      className={`modal-${theme}`}
    >
      <Modal.Header 
        closeButton 
        className={`modal-header-${theme} bg-form-${theme}`}
      >
        <Modal.Title className={`header-text-${theme}`}>
          Transferir para Usuário
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className={`bg-form-${theme}`}>
        <div className="mb-3">
          <label className={`form-label header-text-${theme}`}>
            Selecione o usuário para transferir o chat:
          </label>
          
          {loading ? (
            <div className="text-center py-3">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Carregando...</span>
              </div>
            </div>
          ) : (
            <div className="list-group">
              {filteredUsers.length === 0 ? (
                <div className={`text-center py-3 header-text-${theme}`}>
                  {users.length > 0 ? 'Você já tem este chat' : 'Nenhum usuário encontrado nesta fila'}
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className={`list-group-item list-group-item-action ${
                      selectedUser?.id === user.id ? 'active' : ''
                    } ${theme === 'dark' ? 'list-group-item-dark' : ''}`}
                    onClick={() => setSelectedUser(user)}
                    style={{
                      backgroundColor: selectedUser?.id === user.id 
                        ? 'var(--primary-color)' 
                        : 'transparent',
                      color: selectedUser?.id === user.id
                        ? 'white' 
                        : `var(--text-color-${theme})`,
                      border: `1px solid var(--border-color-${theme})`,
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.375rem',
                      marginBottom: '0.25rem',
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <span>{user.name}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer className={`bg-form-${theme}`}>
        <Button 
          variant="secondary" 
          onClick={onHide}
          className={`btn-2-${theme}`}
        >
          Cancelar
        </Button>
        <Button 
          variant="primary" 
          onClick={handleTransfer}
          disabled={!selectedUser || loading || filteredUsers.length === 0}
          className={`btn-1-${theme}`}
        >
          {loading ? 'Transferindo...' : 'Transferir'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default TransferirUsuarioModal; 