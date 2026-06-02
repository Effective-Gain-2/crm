import React, { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../../utils/axiosConfig';

// Chave única por conversa: DM -> user:<id>, fila -> queue:<id>.
const userKey = (id) => `user:${id}`;
const queueKey = (id) => `queue:${id}`;

// Dado uma mensagem recebida via socket, descobre a qual conversa ela pertence
// na perspectiva do usuário logado.
const conversationKeyForMessage = (msg, myId) => {
  if (msg.recipient_type === 'queue') return queueKey(msg.recipient_id);
  const other = msg.sender_id === myId ? msg.recipient_id : msg.sender_id;
  return userKey(other);
};

const isImage = (mimetype) => typeof mimetype === 'string' && mimetype.startsWith('image/');

function ChatInternoWidget({ socketInstance, userData, theme = 'light' }) {
  const myId = userData?.id;
  const dark = theme === 'dark';

  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState({ users: [], queues: [] });
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(null); // { type:'user'|'queue', id, name, color? }
  const [messagesByConv, setMessagesByConv] = useState({});
  const [unread, setUnread] = useState({}); // { convKey: count }
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const activeRef = useRef(active);
  const openRef = useRef(open);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { openRef.current = open; }, [open]);

  const activeKey = active ? (active.type === 'queue' ? queueKey(active.id) : userKey(active.id)) : null;
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  // Cores básicas sensíveis ao tema (o app é bootstrap, mas o widget é
  // self-contained com estilo inline pra não depender de classes externas).
  const c = dark
    ? { panel: '#1f2937', header: '#111827', border: '#374151', text: '#e5e7eb', sub: '#9ca3af', mine: '#2563eb', theirs: '#374151', input: '#111827' }
    : { panel: '#ffffff', header: '#f8f9fa', border: '#e5e7eb', text: '#1f2937', sub: '#6b7280', mine: '#2563eb', theirs: '#f1f3f5', input: '#ffffff' };

  const fetchContacts = useCallback(() => {
    api.get('/internal-chat/contacts')
      .then((res) => setContacts(res.data || { users: [], queues: [] }))
      .catch((err) => console.error('Erro ao buscar contatos do chat interno:', err));
  }, []);

  useEffect(() => {
    if (open && myId) fetchContacts();
  }, [open, myId, fetchContacts]);

  // Listener global de mensagens — fica sempre ativo enquanto o widget existe,
  // pra contabilizar não-lidas mesmo com o balão fechado.
  useEffect(() => {
    if (!socketInstance) return undefined;
    const handle = (msg) => {
      if (!msg || !msg.id) return;
      const convKey = conversationKeyForMessage(msg, myId);

      setMessagesByConv((prev) => {
        const list = prev[convKey] || [];
        if (list.some((m) => m.id === msg.id)) return prev; // dedup
        return { ...prev, [convKey]: [...list, msg] };
      });

      const isActiveOpen = openRef.current && activeRef.current
        && (activeRef.current.type === 'queue' ? queueKey(activeRef.current.id) : userKey(activeRef.current.id)) === convKey;
      const fromMe = msg.sender_id === myId;
      if (!isActiveOpen && !fromMe) {
        setUnread((prev) => ({ ...prev, [convKey]: (prev[convKey] || 0) + 1 }));
      }
    };
    socketInstance.on('internal_message', handle);
    return () => socketInstance.off('internal_message', handle);
  }, [socketInstance, myId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesByConv, activeKey, open]);

  const openConversation = (conv) => {
    setActive(conv);
    const key = conv.type === 'queue' ? queueKey(conv.id) : userKey(conv.id);
    setUnread((prev) => ({ ...prev, [key]: 0 }));
    const url = conv.type === 'queue'
      ? `/internal-chat/messages/queue/${conv.id}`
      : `/internal-chat/messages/user/${conv.id}`;
    api.get(url)
      .then((res) => setMessagesByConv((prev) => ({ ...prev, [key]: res.data || [] })))
      .catch((err) => console.error('Erro ao carregar histórico:', err));
  };

  const sendMessage = async ({ body, file } = {}) => {
    if (!active) return;
    const payload = {
      recipient_type: active.type,
      recipient_id: active.id,
      body: body ?? text.trim(),
      ...(file || {}),
    };
    if (!payload.body && !payload.file_url) return;
    setSending(true);
    try {
      const res = await api.post('/internal-chat/send', payload);
      const msg = res.data;
      setMessagesByConv((prev) => {
        const list = prev[activeKey] || [];
        if (list.some((m) => m.id === msg.id)) return prev;
        return { ...prev, [activeKey]: [...list, msg] };
      });
      setText('');
    } catch (err) {
      console.error('Erro ao enviar mensagem interna:', err);
    } finally {
      setSending(false);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !active) return;
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await api.post('/internal-chat/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await sendMessage({ body: '', file: res.data });
    } catch (err) {
      console.error('Erro ao enviar anexo:', err);
    }
  };

  const filteredUsers = contacts.users.filter((u) =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()));
  const filteredQueues = contacts.queues.filter((q) =>
    (q.name || '').toLowerCase().includes(search.toLowerCase()));

  const activeMessages = activeKey ? (messagesByConv[activeKey] || []) : [];

  const fileBase = process.env.NODE_ENV === 'development'
    ? (process.env.REACT_APP_URL || 'http://localhost:3002')
    : '';
  const fileSrc = (url) => `${fileBase}${url}`;

  return (
    <>
      {/* Balão flutuante */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Chat interno"
        style={{
          position: 'fixed', right: 24, bottom: 24, zIndex: 1080,
          width: 56, height: 56, borderRadius: '50%', border: 'none',
          background: c.mine, color: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          cursor: 'pointer', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <i className={`bi ${open ? 'bi-x-lg' : 'bi-chat-dots-fill'}`}></i>
        {!open && totalUnread > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2, background: '#ef4444', color: '#fff',
            borderRadius: 10, fontSize: 11, minWidth: 18, height: 18, padding: '0 5px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600,
          }}>{totalUnread > 99 ? '99+' : totalUnread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'fixed', right: 24, bottom: 92, zIndex: 1080,
          width: 360, height: 520, background: c.panel, color: c.text,
          border: `1px solid ${c.border}`, borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            background: c.header, borderBottom: `1px solid ${c.border}`, padding: '10px 12px',
            display: 'flex', alignItems: 'center', gap: 8, minHeight: 48,
          }}>
            {active && (
              <button onClick={() => setActive(null)} title="Voltar"
                style={{ background: 'none', border: 'none', color: c.text, cursor: 'pointer', fontSize: 16 }}>
                <i className="bi bi-arrow-left"></i>
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              {active?.type === 'queue' && (
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: active.color || c.mine, flexShrink: 0 }} />
              )}
              <strong style={{ fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {active ? active.name : 'Chat interno'}
              </strong>
            </div>
            {!active && <i className="bi bi-chat-dots" style={{ color: c.sub }}></i>}
          </div>

          {/* Lista de conversas */}
          {!active && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ padding: 10 }}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar usuário ou fila..."
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 8,
                    border: `1px solid ${c.border}`, background: c.input, color: c.text, outline: 'none', fontSize: 13,
                  }}
                />
              </div>

              {filteredQueues.length > 0 && (
                <div style={{ padding: '4px 12px', fontSize: 11, color: c.sub, textTransform: 'uppercase', fontWeight: 600 }}>Filas</div>
              )}
              {filteredQueues.map((q) => {
                const key = queueKey(q.id);
                return (
                  <div key={key} onClick={() => openConversation({ type: 'queue', id: q.id, name: q.name, color: q.color })}
                    style={rowStyle(c)}>
                    <span style={{ width: 32, height: 32, borderRadius: 8, background: q.color || c.mine, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="bi bi-people-fill"></i>
                    </span>
                    <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.name}</span>
                    {unread[key] > 0 && <Badge n={unread[key]} />}
                  </div>
                );
              })}

              {filteredUsers.length > 0 && (
                <div style={{ padding: '4px 12px', fontSize: 11, color: c.sub, textTransform: 'uppercase', fontWeight: 600 }}>Usuários</div>
              )}
              {filteredUsers.map((u) => {
                const key = userKey(u.id);
                return (
                  <div key={key} onClick={() => openConversation({ type: 'user', id: u.id, name: u.name })}
                    style={rowStyle(c)}>
                    <span style={{ width: 32, height: 32, borderRadius: '50%', background: c.theirs, color: c.text,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
                      <i className="bi bi-person-fill"></i>
                      {u.online && <span style={{ position: 'absolute', right: -1, bottom: -1, width: 9, height: 9, borderRadius: '50%', background: '#22c55e', border: `2px solid ${c.panel}` }} />}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</span>
                    {unread[key] > 0 && <Badge n={unread[key]} />}
                  </div>
                );
              })}

              {filteredUsers.length === 0 && filteredQueues.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: c.sub, fontSize: 13 }}>Nenhuma conversa encontrada.</div>
              )}
            </div>
          )}

          {/* Conversa aberta */}
          {active && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activeMessages.map((m) => {
                  const mine = m.sender_id === myId;
                  return (
                    <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                      {active.type === 'queue' && !mine && (
                        <div style={{ fontSize: 11, color: c.sub, marginBottom: 2, marginLeft: 4 }}>{m.sender_name}</div>
                      )}
                      <div style={{
                        background: mine ? c.mine : c.theirs, color: mine ? '#fff' : c.text,
                        padding: '8px 10px', borderRadius: 12, fontSize: 13, wordBreak: 'break-word',
                      }}>
                        {m.file_url && (
                          isImage(m.mimetype)
                            ? <a href={fileSrc(m.file_url)} target="_blank" rel="noreferrer">
                                <img src={fileSrc(m.file_url)} alt={m.file_name} style={{ maxWidth: '100%', borderRadius: 8, display: 'block', marginBottom: m.body ? 6 : 0 }} />
                              </a>
                            : <a href={fileSrc(m.file_url)} target="_blank" rel="noreferrer" download={m.file_name}
                                style={{ color: mine ? '#fff' : c.mine, display: 'flex', alignItems: 'center', gap: 6, marginBottom: m.body ? 6 : 0, textDecoration: 'none' }}>
                                <i className="bi bi-paperclip"></i>
                                <span style={{ textDecoration: 'underline' }}>{m.file_name || 'arquivo'}</span>
                              </a>
                        )}
                        {m.body && <span>{m.body}</span>}
                      </div>
                      <div style={{ fontSize: 10, color: c.sub, marginTop: 2, textAlign: mine ? 'right' : 'left' }}>
                        {new Date(Number(m.created_at)).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
                {activeMessages.length === 0 && (
                  <div style={{ margin: 'auto', color: c.sub, fontSize: 13 }}>Nenhuma mensagem ainda.</div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div style={{ borderTop: `1px solid ${c.border}`, padding: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <input ref={fileInputRef} type="file" onChange={handleFile} style={{ display: 'none' }} />
                <button onClick={() => fileInputRef.current?.click()} title="Anexar arquivo"
                  style={{ background: 'none', border: 'none', color: c.sub, cursor: 'pointer', fontSize: 18 }}>
                  <i className="bi bi-paperclip"></i>
                </button>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Mensagem..."
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 20, border: `1px solid ${c.border}`,
                    background: c.input, color: c.text, outline: 'none', fontSize: 13 }}
                />
                <button onClick={() => sendMessage()} disabled={sending || !text.trim()} title="Enviar"
                  style={{ background: c.mine, border: 'none', color: '#fff', cursor: 'pointer',
                    width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: sending || !text.trim() ? 0.5 : 1 }}>
                  <i className="bi bi-send-fill"></i>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

const rowStyle = (c) => ({
  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', fontSize: 14,
  borderBottom: `1px solid ${c.border}`,
});

function Badge({ n }) {
  return (
    <span style={{ background: '#ef4444', color: '#fff', borderRadius: 10, fontSize: 11,
      minWidth: 18, height: 18, padding: '0 5px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
      {n > 99 ? '99+' : n}
    </span>
  );
}

export default ChatInternoWidget;
