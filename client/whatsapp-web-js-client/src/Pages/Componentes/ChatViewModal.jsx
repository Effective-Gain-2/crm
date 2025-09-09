import React, { useEffect, useState } from 'react';
import axios from 'axios';

function ChatViewModal({ show, onClose, theme, chatId, schema, url }) {
  const [chatInfo, setChatInfo] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);

  useEffect(() => {
    if (show && chatId && schema && url) {
      setChatInfo(null);
      setChatMessages([]);
      // Buscar mensagens e info do chat
      const fetchData = async () => {
        try {
          const res = await axios.post(`${url}/chat/getMessages`, {
            chat_id:chatId,
            schema
          }, { withCredentials: true });
          setChatMessages(res.data.messages || []);
          const infoRes = await axios.get(`${url}/chat/getChatById/${chatId}/${schema}`, { withCredentials: true });
          setChatInfo(infoRes.data.chat || null);
        } catch (e) {
          setChatMessages([]);
          setChatInfo(null);
        }
      };
      fetchData();
    } else if (!show) {
      setChatInfo(null);
      setChatMessages([]);
    }
  }, [show, chatId, schema, url]);

  if (!show) return null;
  return (
    <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.4)' }} tabIndex="-1" role="dialog">
      <div className="modal-dialog modal-lg" role="document">
        <div className={`modal-content bg-${theme}`} style={{ maxHeight: '90vh', overflow: 'auto' }}>
          <div className="modal-header">
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: 18 }}>
                {chatInfo?.contact_name || chatInfo?.contact_phone || '-'}
              </span>
              <span style={{ fontSize: 13, color: '#888' }}>
                {chatInfo?.contact_phone || '-'}
              </span>
            </div>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            
            <div style={{ maxHeight: 400, overflowY: 'auto', background: theme === 'dark' ? '#222' : '#f8f9fa', padding: 10, borderRadius: 8 }}>
              {(!chatMessages || chatMessages.length === 0) && <div>Nenhuma mensagem encontrada.</div>}
              {chatMessages && chatMessages.map((msg, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  flexDirection: msg.from_me ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  marginBottom: 8
                }}>
                  <div style={{
                    background: msg.from_me ? 'var(--hover)' : '#f1f0f0',
                    backgroundColor: msg.from_me ? 'var(--hover)' : '#f1f0f0',
                    color: '#222',
                    borderRadius: 12,
                    padding: '6px 12px',
                    maxWidth: 350,
                    wordBreak: 'break-word',
                    fontSize: 14
                  }}>
                    {msg.body}
                  </div>
                  <div style={{ fontSize: 10, color: '#888', margin: msg.from_me ? '0 8px 0 0' : '0 0 0 8px', alignSelf: 'flex-end' }}>
                    {msg.timestamp ? new Date(msg.timestamp * 1000).toLocaleString() : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Fechar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatViewModal; 