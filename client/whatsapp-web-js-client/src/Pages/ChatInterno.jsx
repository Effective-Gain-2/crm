import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

const socket = io(process.env.REACT_APP_SOCKET_URL || window.location.origin, {
  transports: ['websocket', 'polling'],
  upgrade: true,
  rememberUpgrade: true,
  timeout: 20000,
  forceNew: true
});

function ChatInterno() {
  const userData = JSON.parse(localStorage.getItem('user'));
  const userId = userData?.id;
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const schema = userData?.schema;


useEffect(() => {
  if (userId && schema) {
    socket.emit('join', userId);
    axios.get(`/internal-chat/users/${userId}?schema=${schema}`, {
      withCredentials: true
    })
      .then(res => {
        setUsers(res.data);
      })
      .catch((err) => {
        console.error('Erro ao buscar usuários:', err);
        setUsers([]);
      });
  }
}, [userId, schema]);

// Listener do Socket.IO sempre ativo
useEffect(() => {
  const handleMessage = (data) => {
    if (
      (data.sender_id === userId && data.receiver_id === selectedUser?.id) ||
      (data.sender_id === selectedUser?.id && data.receiver_id === userId)
    ) {
      setMessages(prev => [...prev, data]);
    }
  };

  socket.on('internal_message', handleMessage);
  
  return () => {
    socket.off('internal_message', handleMessage);
  };
}, [userId, selectedUser]);

useEffect(() => {
  if (selectedUser) {
    axios.get(`/internal-chat/messages/${userId}/${selectedUser.id}?schema=${schema}`,
      {
      withCredentials: true
    }
    )
      .then(res => setMessages(res.data));
  }
}, [selectedUser, userId, schema]);

useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);

// Adicionar listeners para debug
socket.on('connect', () => {
  setIsConnected(true);
});

socket.on('connect_error', (error) => {
  console.error('Erro de conexão do socket:', error);
  setIsConnected(false);
});

socket.on('disconnect', (reason) => {
  setIsConnected(false);
});

  const sendMessage = () => {
    if (msg.trim() && selectedUser) {
      const data = { sender_id: userId, receiver_id: selectedUser.id, message: msg };
      socket.emit('internal_message', { sender_id: userId, receiver_id: selectedUser.id, message: msg, schema });
      setMsg('');
    }
  };

  return (
    <div style={{ display: 'flex', height: 400 }}>
      <div style={{ width: 200, borderRight: '1px solid #ccc' }}>
        <h4>Usuários</h4>
        <div style={{ 
          padding: 4, 
          marginBottom: 8, 
          fontSize: 12, 
          color: isConnected ? 'green' : 'red',
          fontWeight: 'bold'
        }}>
          {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
        </div>
        {users.map(u => (
          <div key={u.id} onClick={() => setSelectedUser(u)} style={{ cursor: 'pointer', padding: 8, background: selectedUser?.id === u.id ? '#eee' : '' }}>
            {u.name}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, padding: 16 }}>
        <h4>Chat com {selectedUser?.name}</h4>
        <div style={{ height: 300, overflowY: 'auto', border: '1px solid #eee', marginBottom: 8 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ textAlign: m.sender_id === userId ? 'right' : 'left' }}>
              <b>{m.sender_id === userId ? 'Você' : selectedUser?.name}:</b> {m.message}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <input
          value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage}>Enviar</button>
      </div>
    </div>
  );
}

export default ChatInterno;