import { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import EmojiPicker from 'emoji-picker-react';
import NewContactModal from './modalPages/Chats_novoContato';
import ChangeQueueModal from './modalPages/Chats_alterarFila';
import AgendarMensagemModal from './modalPages/Chats_agendarMensagem';
import ListaAgendamentosModal from './modalPages/Chats_agendamentosLista';
import TransferirUsuarioModal from './modalPages/Chats_transferirUsuario';
import {socket} from '../socket'
import {Dropdown} from 'react-bootstrap';
import './assets/style.css';
import NewQueueModal from './modalPages/Filas_novaFila';
import WaveSurfer from 'wavesurfer.js';
import ChatsMenuLateral from './modalPages/Chats_menuLateral';
import useUserPreferences from '../hooks/useUserPreferences';
import useNotificationSound from '../hooks/useNotificationSound';
import { useNavigate } from 'react-router-dom';
import { Modal, Button, Form } from 'react-bootstrap';
import QuickMsgManageModal from './modalPages/Chats_mensagensRapidas';
import CustomValuesModal from './modalPages/CustomValuesModal';
import FinalizarAtendimentoModal from './modalPages/Chats_finalizarAtendimento';
import { useToast } from '../contexts/ToastContext';

function formatHour(timestamp) {
  const date = new Date(Number(timestamp));
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(timestamp) {
  const date = new Date(Number(timestamp));
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Verifica se é hoje
  if (date.toDateString() === today.toDateString()) {
    return 'Hoje';
  }
  // Verifica se é ontem
  else if (date.toDateString() === yesterday.toDateString()) {
    return 'Ontem';
  }
  // Outros dias
  else {
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  }
}

function groupMessagesByDate(messages) {
  const grouped = [];
  let currentDate = null;
  let currentGroup = [];

  messages.forEach((message, index) => {
    const messageDate = formatDate(message.timestamp);
    
    if (messageDate !== currentDate) {
      // Salva o grupo anterior se existir
      if (currentGroup.length > 0) {
        grouped.push({
          type: 'date',
          date: currentDate,
          messages: currentGroup
        });
      }
      
      // Inicia novo grupo
      currentDate = messageDate;
      currentGroup = [message];
    } else {
      // Adiciona à mensagem ao grupo atual
      currentGroup.push(message);
    }
    
    // Se for a última mensagem, salva o grupo
    if (index === messages.length - 1) {
      grouped.push({
        type: 'date',
        date: currentDate,
        messages: currentGroup
      });
    }
  });

  return grouped;
}

function DropdownComponent({ theme, selectedChat, handleChatClick, setChats, setSelectedChat, setSelectedMessages, onEditName }) {
  const { showError, showSuccess } = useToast();
  const url = process.env.REACT_APP_URL;
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData.schema;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showChangeQueueModal, setShowChangeQueueModal] = useState(false);
  const [showListaAgendamentosModal, setShowListaAgendamentosModal] = useState(false);
  const [showAgendarMensagemModal, setShowAgendarMensagemModal] = useState(false);
  const [showTransferirUsuarioModal, setShowTransferirUsuarioModal] = useState(false);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [queues, setQueues] = useState([]);
  const [transferLoading, setTransferLoading] = useState(false);
  const navigate = useNavigate(); 
  
  useEffect(() => {
    if (!schema || !userData?.id) {
      navigate('/');
    }
  }, [schema, userData?.id, navigate]);

  const handleCloseChat = async () => {
    try {
      const res = await axios.post(`${url}/chat/close`, {
        chat_id: selectedChat.id,
        schema: userData.schema
      },{
        withCredentials:true
      });
      setChats(prevChats => prevChats.filter(c => c.id !== selectedChat.id));
      setSelectedChat(null)
      setSelectedMessages([])
    } catch (error) {
      console.error(error)
    }
  };
  const handleEditContactName = async (newName) => {
      try {
        await axios.put(`${url}/contact/update-name`, {
          number:selectedChat.contact_phone,
          name: newName,
          schema:schema
        },
        {
      withCredentials: true
    });
      } catch (error) {
        console.error(error)
      }
  };
  useEffect(() => {
    async function fetchQueues() {
      try {
        const res = await axios.get(`${url}/queue/get-all-queues/${schema}`,
        {
      withCredentials: true
    });
        setQueues(res.data.result || []);
      } catch (err) {
        setQueues([]);
      }
    }
    if (isDropdownOpen) fetchQueues();
  }, [isDropdownOpen, url, schema]);



  const handleTransferQueue = async (queueId) => {
    if (!selectedChat) return;
    setTransferLoading(true);
    try {
      await axios.post(`${url}/queue/transfer-queue`, {
        chatId: selectedChat.id,
        newQueueId: queueId,
        schema
      },
        {
      withCredentials: true
    });
  
      setChats(prev => prev.filter(chat => chat.id !== selectedChat.id));
      
      setSelectedChat(null);
      setSelectedMessages([]);
      showSuccess('Chat transferido para nova fila com sucesso!');
      
    } catch (err) {
      showError('Erro ao transferir fila. Tente novamente.');
    }
    setTransferLoading(false);
  };
  return (
    <>
      <Dropdown drop="start" onToggle={setIsDropdownOpen}>
        <Dropdown.Toggle
          variant={theme === 'light' ? 'light' : 'dark'}
          id="dropdown-basic"
          className={`btn-2-${theme} no-caret dropdown-toggle`}
        >
          <i className="bi bi-gear"></i>
        </Dropdown.Toggle>

        <Dropdown.Menu
          variant={theme === 'light' ? 'light' : 'dark'}
          className={`chat-dropdown-menu ${theme === 'dark' ? 'dark' : ''}`}
          style={{
            zIndex: 9999,
            position: 'absolute',
            right: '0',
            left: 'auto'
          }}
        >
          <Dropdown.Item href="#" onClick={() => {
            setShowChangeQueueModal(true);
            setIsDropdownOpen(false);
          }}>
            Alterar Fila
          </Dropdown.Item>
          <Dropdown.Item href="#" onClick={() => {
            setShowTransferirUsuarioModal(true);
            setIsDropdownOpen(false);
          }}>
            Transferir para Usuário
          </Dropdown.Item>
          <Dropdown.Item href="#" onClick={() => {
            onEditName();
            setIsDropdownOpen(false);
          }}>
            Editar Nome
          </Dropdown.Item>
          <Dropdown.Item href="#" onClick={() => {
            setShowListaAgendamentosModal(true);
            setIsDropdownOpen(false);
          }}>
            Agendar mensagem
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>

      <ChangeQueueModal
        show={showChangeQueueModal}
        onHide={() => setShowChangeQueueModal(false)}
        theme={theme}
        selectedChat={selectedChat}
        schema={schema}
        url={url}
        onTransfer={handleTransferQueue}
      />

      <ListaAgendamentosModal
        show={showListaAgendamentosModal}
        onHide={() => setShowListaAgendamentosModal(false)}
        theme={theme}
        selectedChat={selectedChat}
        onAgendarNovaMensagem={() => {
          setShowListaAgendamentosModal(false);
          setTimeout(() => setShowAgendarMensagemModal(true), 200);
        }}
      />

      <AgendarMensagemModal
        show={showAgendarMensagemModal}
        onHide={() => setShowAgendarMensagemModal(false)}
        theme={theme}
        selectedChat={selectedChat}
      />

      <TransferirUsuarioModal
        show={showTransferirUsuarioModal}
        onHide={() => setShowTransferirUsuarioModal(false)}
        theme={theme}
        selectedChat={selectedChat}
        schema={schema}
        url={url}
      />
      <FinalizarAtendimentoModal
        show={showFinalizarModal}
        onHide={() => setShowFinalizarModal(false)}
        theme={theme}
        selectedChat={selectedChat}
        onFinish={() => {
          setChats(prevChats => prevChats.filter(c => c.id !== selectedChat.id));
          setSelectedChat(null);
          setSelectedMessages([]);
        }}
      />
    </>
  );
}

function ChatPage({ theme, chat_id} ) {
  const [chatList, setChats] = useState([]);
  const [chat] = useState([])
  const [selectedMessages, setSelectedMessages] = useState([]);
  const previousMessagesRef = useRef(selectedMessages);
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [replyMessage, setReplyMessage] = useState(null);
  const selectedChatRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const messagesEndRef = useRef(null);
  const userData = JSON.parse(localStorage.getItem('user'));
  // Perfil de visualização vê os leads/conversas mas não atende (não envia mensagem) —
  // backend já bloqueia nas rotas de envio; aqui só evita o usuário tentar em vão.
  const souVisualizador = userData?.role === 'visualizador';
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const schema = userData.schema;
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingIntervalRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeAudioId, setActiveAudioId] = useState(null);
  const [audioProgress, setAudioProgress] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [messages, setMessages] = useState([])
  const [audioUrl, setAudioUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('')
  const selectedChatIdRef = useRef(null);
  const { preferences, updateChatsTab, updateNotificationMuted } = useUserPreferences();
  // Chips estilo WhatsApp: 'tudo' | 'nao-lidas' | 'aguardando' | 'grupos'
  // ('conversas' era o valor antigo persistido — normaliza para 'tudo')
  const [selectedTab, setSelectedTab] = useState(
    ['tudo', 'nao-lidas', 'aguardando', 'grupos'].includes(preferences.chatsTab) ? preferences.chatsTab : 'tudo'
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [connections, setConnections] = useState([]);
  // Filtro por número do WhatsApp (conexão). 'todas' = comportamento anterior.
  const [conexaoFiltro, setConexaoFiltro] = useState('todas');
  // Listas = as etiquetas do WhatsApp Business (tabela `tag`, já existente no backend)
  const [listas, setListas] = useState([]);
  const [listaFiltro, setListaFiltro] = useState('todas');
  // Etiquetar a conversa aberta (marcar algo especial dela)
  const [showEtiquetas, setShowEtiquetas] = useState(false);
  const [novaEtiqueta, setNovaEtiqueta] = useState('');
  const [corEtiqueta, setCorEtiqueta] = useState('#0082ca');
  const [salvandoEtiqueta, setSalvandoEtiqueta] = useState(false);
  const [queues, setQueues] = useState([]);
  const nomeContatoRef = useRef(null);
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [isBotActive, setIsBotActive] = useState(false);
  const [socketInstance] = useState(socket)  
  const url = process.env.REACT_APP_URL;
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [sideMenuActive, setSideMenuActive] = useState(false);
  const [showFiltros, setShowFiltros] = useState(false);
  const [filtrosAtivos, setFiltrosAtivos] = useState(preferences.chatFilters || {});
  const { playNotificationSound, audioRef, isMuted, toggleMute } = useNotificationSound({
    mutedPreference: preferences.notificationSoundMuted,
    onMutedChange: updateNotificationMuted
  });
  const navigate = useNavigate();
  const [userQueues, setUserQueues] = useState([])
  const [showQuickMsgPopover, setShowQuickMsgPopover] = useState(false);
  const quickMsgBtnRef = useRef();
  const inputRef = useRef(null);
  const [quickMsgIndex, setQuickMsgIndex] = useState(-1);
  const [showCustomValuesModal, setShowCustomValuesModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [redistributing, setRedistributing] = useState(false);
  const { showError, showSuccess } = useToast();
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);

  useEffect(() => {
    if (!showQuickMsgPopover) setQuickMsgIndex(-1);
  }, [showQuickMsgPopover, newMessage]);

  const handleQuickMsgKeyDown = (e) => {
    if (!showQuickMsgPopover || quickMsgFiltered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setQuickMsgIndex(i => (i + 1) % quickMsgFiltered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setQuickMsgIndex(i => (i - 1 + quickMsgFiltered.length) % quickMsgFiltered.length);
    } else if (e.key === 'Enter' && quickMsgIndex >= 0) {
      e.preventDefault();
      handleQuickMsgClick(quickMsgFiltered[quickMsgIndex].mensagem, quickMsgFiltered[quickMsgIndex].comando);
      setQuickMsgIndex(-1);
    }
  };

  // Fecha popover ao clicar fora dele
  useEffect(() => {
    function handleClick(e) {
      if (showQuickMsgPopover) {
        const popover = document.getElementById('quickMsgPopover');
        if (popover && !popover.contains(e.target) && quickMsgBtnRef.current && !quickMsgBtnRef.current.contains(e.target)) {
          setShowQuickMsgPopover(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showQuickMsgPopover]);

  useEffect(() => {
    if (!schema || !userData?.id) {
      navigate('/');
    }
  }, [schema, userData?.id, navigate]);
  
  // Função para ordenar chats por timestamp mais recente
  const sortChatsByTimestamp = (chats) => {
    // Chats com status 'importado' e 'disparo' vão para o final
    const notImportado = chats.filter(c => c.status !== 'importado' && c.status !== 'disparo');
    const importado = chats.filter(c => c.status === 'importado');
    const disparo = chats.filter(c => c.status === 'disparo');
    
    // Ordena os não importados por timestamp
    notImportado.sort((a, b) => {
      const timestampA = a.updated_time || a.timestamp || a.updated_at || a.created_at || a.last_message_time || a.last_message_at || 0;
      const timestampB = b.updated_time || b.timestamp || b.updated_at || b.created_at || b.last_message_time || b.last_message_at || 0;
      const timeA = typeof timestampA === 'string' ? parseInt(timestampA) : timestampA;
      const timeB = typeof timestampB === 'string' ? parseInt(timestampB) : timestampB;
      return timeB - timeA;
    });
    
    // Ordena os importados por timestamp
    importado.sort((a, b) => {
      const timestampA = a.updated_time || a.timestamp || a.updated_at || a.created_at || a.last_message_time || a.last_message_at || 0;
      const timestampB = b.updated_time || b.timestamp || b.updated_at || b.created_at || b.last_message_time || b.last_message_at || 0;
      const timeA = typeof timestampA === 'string' ? parseInt(timestampA) : timestampA;
      const timeB = typeof timestampB === 'string' ? parseInt(timestampB) : timestampB;
      return timeB - timeA;
    });
    
    // Ordena os disparos por timestamp
    disparo.sort((a, b) => {
      const timestampA = a.updated_time || a.timestamp || a.updated_at || a.created_at || a.last_message_time || a.last_message_at || 0;
      const timestampB = b.updated_time || b.timestamp || b.updated_at || b.created_at || b.last_message_time || b.last_message_at || 0;
      const timeA = typeof timestampA === 'string' ? parseInt(timestampA) : timestampA;
      const timeB = typeof timestampB === 'string' ? parseInt(timestampB) : timestampB;
      return timeB - timeA;
    });
    
    return [...notImportado, ...importado, ...disparo];
  };

  useEffect(()=>{
    const fetchUserQueues = async () => {
      const response = await axios.get(`${url}/queue/get-user-queue/${userData.id}/${schema}`)
      setUserQueues(Array.isArray(response.data.result)?response.data.result:[response.data.result])
    } 
    fetchUserQueues()
  }, schema)

  useEffect(() => {
    if (preferences.chatsTab && preferences.chatsTab !== selectedTab
        && ['tudo', 'nao-lidas', 'aguardando', 'grupos'].includes(preferences.chatsTab)) {
      setSelectedTab(preferences.chatsTab);
    }
  }, [preferences.chatsTab, selectedTab]);

  // Atualizar filtros quando as preferências mudarem
  useEffect(() => {
    if (preferences.chatFilters) {
      setFiltrosAtivos(preferences.chatFilters);
    }
  }, [preferences.chatFilters]);

  // Função para atualizar aba e salvar preferências
  const handleTabChange = (tab) => {
    setSelectedTab(tab);
    updateChatsTab(tab);
  };

  // Função para aplicar filtros
  const handleApplyFilters = (filtros) => {
    setFiltrosAtivos(filtros);
  };

  // Função para filtrar chats — CHIPS estilo WhatsApp (filtram, não escondem):
  // Tudo = lista única (grupos e sala de espera juntos, como no WhatsApp)
  const getFilteredChats = () => {
    let filtered = chatList.filter(chat => {
      const ehGrupo = !!(chat.isgroup || chat.isGroup);
      if (selectedTab === 'grupos' && !ehGrupo) return false;
      if (selectedTab === 'aguardando' && chat.status !== 'waiting') return false;
      if (selectedTab === 'nao-lidas' && !chat.unreadmessages) return false;
      if (selectedTab === 'favoritas' && !chat.is_favorite) return false;

      // Filtro por LISTA (etiqueta) — tag_ids vem agregado do backend
      if (listaFiltro !== 'todas' && !(chat.tag_ids || []).includes(listaFiltro)) return false;

      // Filtro por CONEXÃO (número do WhatsApp) — só existe com 2+ conexões
      if (conexaoFiltro !== 'todas' && chat.connection_id !== conexaoFiltro) return false;

      // Filtro por status
      if (filtrosAtivos.status && filtrosAtivos.status !== 'todos') {
        if (filtrosAtivos.status === 'aberto' && chat.status !== 'open') return false;
        if (filtrosAtivos.status === 'fechado' && chat.status !== 'closed') return false;
        if (filtrosAtivos.status === 'aguardando' && chat.status !== 'waiting') return false;
      }

      // Filtro por fila
      if (filtrosAtivos.fila && filtrosAtivos.fila !== 'todas') {
        const queueName = getQueueName(chat.queue_id).toLowerCase();
        if (!queueName.includes(filtrosAtivos.fila.toLowerCase())) return false;
      }

      // Filtro por não lidas
      if (filtrosAtivos.apenasNaoLidas && !chat.unreadmessages) return false;

      return true;
    });

        // Ordenação apenas se há filtros de ordenação específicos
    if (filtrosAtivos.ordenacao) {
      filtered.sort((a, b) => {
        switch (filtrosAtivos.ordenacao) {
          case 'recente':
            const timestampA = a.updated_time || a.timestamp || a.updated_at || a.created_at || 0;
            const timestampB = b.updated_time || b.timestamp || b.updated_at || b.created_at || 0;
            const timeA = typeof timestampA === 'string' ? parseInt(timestampA) : timestampA;
            const timeB = typeof timestampB === 'string' ? parseInt(timestampB) : timestampB;
            return timeB - timeA;
          case 'antigo':
            const timestampA2 = a.updated_time || a.timestamp || a.updated_at || a.created_at || 0;
            const timestampB2 = b.updated_time || b.timestamp || b.updated_at || b.created_at || 0;
            const timeA2 = typeof timestampA2 === 'string' ? parseInt(timestampA2) : timestampA2;
            const timeB2 = typeof timestampB2 === 'string' ? parseInt(timestampB2) : timestampB2;
            return timeA2 - timeB2;
          case 'alfabetico':
            return (a.contact_name || '').localeCompare(b.contact_name || '');
          case 'naoLidas':
            if (a.unreadmessages && !b.unreadmessages) return -1;
            if (!a.unreadmessages && b.unreadmessages) return 1;
            const timestampA3 = a.updated_time || a.timestamp || a.updated_at || a.created_at || 0;
            const timestampB3 = b.updated_time || b.timestamp || b.updated_at || b.created_at || 0;
            const timeA3 = typeof timestampA3 === 'string' ? parseInt(timestampA3) : timestampA3;
            const timeB3 = typeof timestampB3 === 'string' ? parseInt(timestampB3) : timestampB3;
            return timeB3 - timeA3;
          default:
            return 0;
        }
      });
    }

    return filtered;
  };

  const setAsRead = async()=>{
    if (!selectedChat) return;
    try{
      const res = await axios.post(`${url}/chat/setAsRead`,{
        chat_id: selectedChat.id,
        schema:schema
      },
        {
      withCredentials: true
    })
    }catch(error){
      console.error(error)
    }
  }

  const handleEditNameStart = () => {
  setIsEditingName(true);
  setEditedName(selectedChat?.contact_name || '');
  setTimeout(() => {
    if (nomeContatoRef.current) nomeContatoRef.current.focus();
  }, 0);
};

useEffect(() => {
  if (chat_id && chatList.length > 0) {
    if (!selectedChat || selectedChat.id !== chat_id) {
      const chat = chatList.find(c => c.id === chat_id);
      handleChatClick(chat)
      if (chat) setSelectedChat(chat);
    }
  }
}, [chat_id, chatList, selectedChat]);

const handleEditNameFinish = async () => {
  if (
    editedName.trim() !== '' &&
    editedName !== selectedChat.contact_name
  ) {
    await handleEditContactName(selectedChat.id, editedName);
  }
  setIsEditingName(false);
};

useEffect(() => {
  const fetchConnections = async () => {
    try {
      const res = await axios.get(`${url}/connection/get-all-connections/${schema}`,
        {
      withCredentials: true
    });
      setConnections(res.data || []);
    } catch (err) {
      setConnections([]);
    }
  };
  
  const fetchQueues = async () => {
    try {
      const res = await axios.get(`${url}/queue/get-all-queues/${schema}`,
        {
      withCredentials: true
    });
      setQueues(res.data.result || []);
    } catch (err) {
      setQueues([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${url}/api/users/${schema}`, {
        withCredentials: true
      });
      setUsers(res.data.users || []);
    } catch (err) {
      setUsers([]);
    }
  };
  
  const fetchListas = async () => {
    try {
      const res = await axios.get(`${url}/tag/${schema}`, { withCredentials: true });
      setListas(Array.isArray(res.data) ? res.data : (res.data?.result || []));
    } catch (err) {
      setListas([]);
    }
  };

  fetchConnections();
  fetchQueues();
  fetchUsers();
  fetchListas();
}, [url, schema]);

// Rótulo curto da conexão: o nome da instância vem como "<schema>__Nome_Da_Conexao".
// Com 2+ números na mesma empresa, é isto que responde "por qual número eu estou falando".
const recarregarListas = async () => {
  try {
    const res = await axios.get(`${url}/tag/${schema}`, { withCredentials: true });
    setListas(Array.isArray(res.data) ? res.data : (res.data?.result || []));
  } catch (err) { /* toast global cuida do erro */ }
};

// Marca/desmarca etiqueta na conversa aberta. Atualiza a lista local na hora para o
// chip de filtro e a marcacao no item responderem sem esperar recarga.
const alternarEtiquetaDoChat = async (tagId) => {
  if (!selectedChat) return;
  const marcada = (selectedChat.tag_ids || []).includes(tagId);
  setSalvandoEtiqueta(true);
  try {
    const rota = marcada ? 'remove-from-chat' : 'add-to-chat';
    await axios.post(`${url}/tag/${rota}`, { chatId: selectedChat.id, tagId, schema }, { withCredentials: true });
    const novas = marcada
      ? (selectedChat.tag_ids || []).filter(t => t !== tagId)
      : (selectedChat.tag_ids || []).concat([tagId]);
    setSelectedChat({ ...selectedChat, tag_ids: novas });
    setChats(prev => prev.map(c => c.id === selectedChat.id ? { ...c, tag_ids: novas } : c));
  } catch (err) { /* toast global */ } finally { setSalvandoEtiqueta(false); }
};

const criarEtiqueta = async () => {
  const nome = novaEtiqueta.trim();
  if (!nome) return;
  setSalvandoEtiqueta(true);
  try {
    const res = await axios.post(`${url}/tag/create`, { name: nome, color: corEtiqueta, schema }, { withCredentials: true });
    setNovaEtiqueta('');
    await recarregarListas();
    // Já aplica na conversa aberta — quem cria a etiqueta aqui quer usá-la agora
    const criada = res.data && (res.data.id || (res.data.result && res.data.result.id));
    if (criada) await alternarEtiquetaDoChat(criada);
  } catch (err) { /* toast global */ } finally { setSalvandoEtiqueta(false); }
};

const alternarFavorito = async (chat, e) => {
  e.stopPropagation();               // clicar na estrela não pode abrir a conversa
  const novo = !chat.is_favorite;
  setChats(prev => prev.map(c => c.id === chat.id ? { ...c, is_favorite: novo } : c));
  try {
    await axios.post(`${url}/chat/toggle-favorito`, { chat_id: chat.id, schema }, { withCredentials: true });
  } catch (err) {
    // desfaz se o servidor recusou — nada de estrela fantasma
    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, is_favorite: !novo } : c));
  }
};

const getConnectionLabel = (connectionId) => {
  const conn = connections.find(c => c.id === connectionId);
  if (!conn) return '';
  const bruto = String(conn.name || '');
  const curto = (bruto.includes('__') ? bruto.split('__').slice(1).join('__') : bruto).replace(/_/g, ' ').trim();
  return curto || conn.number || '';
};

const getConnectionNumber = (connectionId) => {
  const conn = connections.find(c => c.id === connectionId);
  return conn?.number || '';
};

// Só faz sentido mostrar/filtrar por número quando existe mais de uma conexão
const multiConexao = connections.length > 1;

const getQueueName = (queueId) => {
  const queue = queues.find(q => q.id === queueId);
  return queue?.name || queueId;
};

const handleEditContactName = async (contactId, newName) => {
  try {
    await axios.put(`${url}/contact/update-name`, {
      number: selectedChat.contact_phone,
      name: newName,
      user_id:userData.id,
      schema: userData.schema
    },
        {
      withCredentials: true
    });
    // Atualize o nome no chat selecionado (opcional)
    setSelectedChat(prev => ({ ...prev, contact_name: newName }));
    // Atualize na lista de chats (opcional)
    setChats(prev =>
      sortChatsByTimestamp(prev.map(chat =>
        chat.id === contactId ? { ...chat, contact_name: newName } : chat
      ))
    );
    showSuccess('Nome do contato atualizado com sucesso!');
  } catch (error) {
    console.error(error);
    showError('Erro ao atualizar nome do contato. Tente novamente.');
  }
};

const handleAcceptChat = async () => {
    try{
      const res = await axios.post(`${url}/chat/setUser`,{
        user_id: userData.id,
        chat_id: selectedChat.id,
        schema: userData.schema
      },
        {
      withCredentials: true
    })
        setChats(prevChats =>
    sortChatsByTimestamp(prevChats.map(c =>
      c.id === selectedChat.id
        ? { ...c, status: 'open', assigned_user: userData.id }
        : c
    ))
  );
      showSuccess('Chat aceito com sucesso!');

    }catch(error){
      console.error(error)
      showError('Erro ao aceitar chat. Tente novamente.');
    }
  }

const disableBot = async () => {
  if (!selectedChat) return;
  
  try {
    await axios.post(`${url}/chat/disable-bot`, {
      chat_id: selectedChat.id,
      schema: schema
    },
        {
      withCredentials: true
    });
    setIsBotActive(false);
    showSuccess('Bot desativado com sucesso!');
  } catch (error) {
    console.error('Erro ao desativar bot:', error);
    showError('Erro ao desativar bot. Tente novamente.');
  }
};

const handleRedistributeWaitingChats = async () => {
  if (selectedTab !== 'aguardando') return;
  
  setRedistributing(true);
  try {
    // Obter todos os chats em espera ordenados por timestamp
    const waitingChats = getFilteredChats().filter(chat => chat.status === 'waiting');
    
    if (waitingChats.length === 0) {
      showError('Não há chats aguardando para redistribuir.');
      return;
    }

    // Enviar para o backend para redistribuição
    await axios.post(`${url}/chat/redistribute-waiting`, {
      chats: waitingChats,
      schema: schema,
      user_id: userData.id
    }, {
      withCredentials: true
    });

    // Recarregar a lista de chats após redistribuição
    await loadChats();
    
    showSuccess(`Redistribuição concluída! ${waitingChats.length} chats foram redistribuídos.`);
    
  } catch (error) {
    console.error('Erro ao redistribuir chats:', error);
    showError('Erro ao redistribuir chats. Tente novamente.');
  } finally {
    setRedistributing(false);
  }
};

  const handleChatClick = (chat) => {
  setSelectedChat(chat);
  setSelectedChatId(chat.id);
  setSelectedMessages([]);
  previousMessagesRef.current = [];
  selectedChatIdRef.current = chat.id; 
  loadMessages(chat);
  setAsRead()
  setChats(prevChats =>
    sortChatsByTimestamp(prevChats.map(c =>
      c.id === chat.id ? { ...c, unreadmessages: false } : c
    ))
  );  
  scrollToBottom()
  
  // Carregar status do bot do banco de dados
  if (chat.isboton) {
    setIsBotActive(true);
  } else {
    setIsBotActive(false);
  }
};

  useEffect(() => {
  if (socketInstance && selectedChatId) {
    socketInstance.emit('join', selectedChatId);

    const handleMessage = (msg) => {
    if (msg.chatId === selectedChatId) {
      const formatted = formatMessage(msg);
      setSelectedMessages(prev => {
        const newMessages = [...prev, formatted];
        return newMessages;
      });
      // Toca o som se a mensagem não for minha
      if (!msg.fromMe && !msg.from_me) {
        playNotificationSound();
      }
    }
  };
    socketInstance.on('message', handleMessage);

    return () => {
      socketInstance.emit('leave', selectedChatId);
      socketInstance.off('message', handleMessage);
    };
  }
}, [socketInstance, selectedChatId]);

   useEffect(() => {
  if (socketInstance) {
    socketInstance.on('connect', () => {
      socketInstance.emit('join', `schema_${schema}`);
      socketInstance.emit('join', `user_${userData.id}`);
    });
    socketInstance.on('chats_updated', (updatedChats) => {
      let chats = [];
      if (Array.isArray(updatedChats)) {
        playNotificationSound()
        chats = updatedChats;
  } else if (updatedChats && typeof updatedChats === 'object') {
        playNotificationSound()
    chats = [updatedChats];
  }
  
  if (chats.length > 0) {
    setChats(prevChats => {
      const updatedMap = new Map(chats.map(chat => [chat.id, chat]));
      const merged = prevChats.map(chat => updatedMap.get(chat.id) || chat);
      
      // Adiciona novos chats que não existiam antes
      chats.forEach(chat => {
        if (!prevChats.some(c => c.id === chat.id)) {
          merged.push(chat);
        }
      });
      
      // Aplica ordenação por timestamp mais recente
      return sortChatsByTimestamp(merged);
    });
  }
});
  // Li a conversa no CELULAR → o backend avisa e a bolinha azul sai daqui.
  // Evento próprio (e não 'chats_updated') justamente para NÃO tocar som de notificação.
  socketInstance.on('chatRead', (data) => {
    if (!data?.chatId) return;
    setChats(prevChats => prevChats.map(chat =>
      chat.id === data.chatId ? { ...chat, unreadmessages: false } : chat
    ));
  });

  socketInstance.on('removeChat', (data)=>{
    setChats(prevChats => sortChatsByTimestamp(prevChats.filter(chat => chat.id !== data.id)));
    setSelectedChat(null);
    setSelectedChatId(null);
    setSelectedMessages([]);
  })

    // Escutar evento de transferência de chat
    socketInstance.on('chatTransferred', (data) => {
      const currentUserId = userData.id;
      
      setChats(prevChats => {
        // Se o usuário atual perdeu o chat, remove da lista
        if (data.oldUserId === currentUserId) {
          return sortChatsByTimestamp(prevChats.filter(chat => chat.id !== data.chatId));
        }
        
        // Se o usuário atual ganhou o chat, atualiza a lista
        if (data.newUserId === currentUserId) {
          const existingChatIndex = prevChats.findIndex(chat => chat.id === data.chatId);
          if (existingChatIndex !== -1) {
            const updatedChats = [...prevChats];
            updatedChats[existingChatIndex] = {
              ...updatedChats[existingChatIndex],
              assigned_user: data.newUserId
            };
            return sortChatsByTimestamp(updatedChats);
          }
        }
        
        return prevChats;
      });
      
      // Se o chat selecionado foi transferido, limpa a seleção
      if (selectedChatId === data.chatId) {
        setSelectedChat(null);
        setSelectedChatId(null);
        setSelectedMessages([]);
      }
    });
  }
  return () => {
    if (socketInstance) {
      socketInstance.off('connect');
      socketInstance.off('chats_updated');
      socketInstance.off('chatRead');
      socketInstance.off('chatTransferred');
      socketInstance.emit('leave', `schema_${schema}`);
    }
  };
}, [socketInstance, userData.id, schema]);
const handleSubmit = (data) => {
  if (!selectedChat) {
    console.warn('Nenhum chat selecionado!');
    return;
  }
  const newMessage = {
    instanceId: selectedChat.connection_id,
    number: selectedChat.contact_phone,
    text: data,
    chatId: selectedChat.id,
    from_me: true,
    timestamp: Date.now(),
    schema: schema
  };

  if (socketInstance) {
    socketInstance.emit('message', newMessage);
    const formattedMessage = formatMessage(newMessage);
    setSelectedMessages((prev) => [...prev, formattedMessage]);
  } else {
  }
};

useEffect(() => {
  selectedChatRef.current = selectedChat;
}, [selectedChat]);

const loadChats = async () => {
    try {
      const res = await axios.get(`${url}/chat/getChat/${userData.id}/${schema}/${userData.role}`,
        {withCredentials:true});
      const chats = Array.isArray(res.data.messages) ? res.data.messages : [];
      setChats(sortChatsByTimestamp(chats));
    } catch (err) {
      console.error('Erro ao carregar chats:', err);
    }
  };

useEffect(() => {
    loadChats();
  }, [schema, userData.id, url]);

const formatMessage = (msg) => ({
  id: msg.id,
  name: msg.contact_name || msg.senderName,
  text: msg.text || msg.body,
  from_me: msg.from_me|| msg.fromMe,
  timestamp: msg.timestamp || msg.created_at,
  message_type: msg.message_type,
  base64: msg.midiaBase64 || msg.base64,
  user_id: msg.user_id,
  // autor real (quem falou num grupo) — gravado pelo webhook
  participant_name: msg.participant_name || msg.from || null,
}
);


const loadMessages = async (chatId) => {
  try {
    const res = await axios.post(`${url}/chat/getMessages`, {
      chat_id: chatId.id,
      schema,
    },
  {
      withCredentials: true
    });


    const formattedMessages = res.data.messages.map(formatMessage);


    const newMessages = formattedMessages.filter(
      (msg) => !previousMessagesRef.current.some((prevMsg) => prevMsg.id === msg.id)
    );

    if (newMessages.length > 0) {
      setSelectedMessages((prevMessages) => {
        const updatedMessages = [...prevMessages, ...newMessages];
        previousMessagesRef.current = updatedMessages;
        return updatedMessages;
      });
    }
  } catch (error) {
    console.error('Erro ao carregar mensagens:', error);
  }
};

useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  // Componente Avatar
  const Avatar = ({ avatar, size = 32, style = {} }) => {
    const avatarStyle = {
      width: size,
      height: size,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.4,
      fontWeight: 'bold',
      color: 'white',
      backgroundColor: avatar.backgroundColor,
      cursor: 'pointer',
      ...style
    };

    return (
      <div 
        style={avatarStyle}
        title={avatar.tooltip}
      >
        {avatar.type === 'default' ? avatar.content : avatar.content}
      </div>
    );
  };

  const AudioPlayer = ({ audioSrc, audioId, theme, isActive, onPlayClick }) => {
    const containerRef = useRef(null);
    const wavesurferRef = useRef(null);
    const isSeekingRef = useRef(false);

    const [isReady, setIsReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const formatTime = (time) => {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60).toString().padStart(2, '0');
      return `${minutes}:${seconds}`;
    };

    const handleSeek = useCallback((e) => {
      if (!wavesurferRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      wavesurferRef.current.seekTo(progress);
    }, []);

    const handleMouseDown = useCallback((e) => {
      if (!isReady) return;
      isSeekingRef.current = true;
      handleSeek(e);
    }, [isReady, handleSeek]);

    const handleMouseMove = useCallback((e) => {
      if (isSeekingRef.current) {
        handleSeek(e);
      }
    }, [handleSeek]);

    const handleMouseUp = useCallback(() => {
      isSeekingRef.current = false;
    }, []);
    
    useEffect(() => {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }, [handleMouseMove, handleMouseUp]);

    useLayoutEffect(() => {
      if (!containerRef.current) return;

      const source = audioSrc.startsWith('blob:') ? audioSrc : `data:audio/ogg;base64,${audioSrc}`;

      const ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: theme === 'light' ? '#E0E0E0' : '#555555',
        progressColor: '#34B7F1',
        barWidth: 2,
        barGap: 1.5,
        barRadius: 2,
        height: 'auto',
        cursorWidth: 0,
        url: source,
        dragToSeek: true,
        fillParent: true,
      });
      wavesurferRef.current = ws;

      ws.on('ready', () => {
        setDuration(ws.getDuration());
        setIsReady(true);
        window.dispatchEvent(new Event('resize'));
      });

      ws.on('audioprocess', (time) => setCurrentTime(time));
      ws.on('seek', (progress) => setCurrentTime(progress * ws.getDuration()));
      
      ws.on('play', () => setIsPlaying(true));
      ws.on('pause', () => setIsPlaying(false));
      
      ws.on('finish', () => {
        onPlayClick(null);
      });

      return () => {
        if (wavesurferRef.current) {
          wavesurferRef.current.destroy();
          wavesurferRef.current = null;
        }
      };
    }, [audioSrc, theme, onPlayClick]);

    useEffect(() => {
      if (!isReady) return;
      if (isActive) {
        wavesurferRef.current?.play();
      } else {
        wavesurferRef.current?.pause();
      }
    }, [isActive, isReady]);

    const handlePlayButtonClick = () => {
      if (isReady) {
        onPlayClick(isActive ? null : audioId);
      }
    };
    
    const cursorPosition = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
      <div className="audio-player-container" style={{ width: '100%' }}>
        <div className="audio-player d-flex align-items-center gap-3 flex-grow-1" style={{width: '100%'}}>
          <button
            className={`btn btn-sm`}
            onClick={handlePlayButtonClick}
            disabled={!isReady}
            style={{
              width: '35px', height: '35px', borderRadius: '50%',
              backgroundColor: 'var(--primary-color)', color: 'white',
              flexShrink: 0, opacity: isReady ? 1 : 0.5,
              cursor: isReady ? 'pointer' : 'not-allowed',
            }}
          >
            <i className={`bi ${isPlaying ? 'bi-pause-fill' : 'bi-play-fill'}`} style={{ fontSize: '1.1rem' }}></i>
          </button>

          <div
            id={`waveform-container-${audioId}`}
            ref={containerRef}
            style={{ 
              flexGrow: 1, 
              height: '35px',
              maxHeight: '35px', 
              position: 'relative', 
              cursor: isReady ? 'pointer' : 'default', 
              width: '100%',
              display: 'block',
            }}
            onMouseDown={handleMouseDown}
            className="waveform"
          >
          </div>

          <small className="text-muted" style={{ minWidth: '80px', textAlign: 'center' }}>
            {isReady ? `${formatTime(currentTime)} / ${formatTime(duration)}` : '0:00 / 0:00'}
          </small>
        </div>
      </div>
    );
  };

  const handleEmojiClick = (emojiObject) => {
    setNewMessage((prevMessage) => prevMessage + emojiObject.emoji);
  };  

  const handleAudioClick = () => {
    if (isRecording) {
      setIsRecording(false);
      setRecordingTime(0);
  
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    } else {
      setIsRecording(true);
      setRecordingTime(0);
  
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
    }
  };
  
  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      showError('Digite uma mensagem para enviar.');
      return;
    }

    try {
      await axios.post(`${url}/evo/sendText`, {
        instanceId: selectedChat.connection_id,
        number: selectedChat.contact_phone,
        text: newMessage,
        chatId: selectedChat.id,
        schema: schema,
        user_id: userData.id,
        replyTo: replyMessage?.id || null
      },
    {
      withCredentials: true
    });

      setNewMessage('');
      setReplyMessage(null);
    } catch (error) {
      console.error('Erro ao enviar a mensagem:', error);
      showError('Erro ao enviar mensagem. Tente novamente.');
    }
  };
  const handleReply = (message) => {
    setReplyMessage(message);
  };

  const stopMediaStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };


const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    
    if (!file) {
      return;
    }    
    const formData = new FormData();
    formData.append('image', file); 
    formData.append('chatId', selectedChat.id);
    formData.append('connectionId', selectedChat.connection_id);
    formData.append('schema', schema);
    
    try {
      const newImageUrl = URL.createObjectURL(file); 
        setImageUrl(newImageUrl);

      await axios.post(`${url}/chat/sendImage`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    {
      withCredentials: true
    });
      

      const message = {
          id: newImageUrl,
          text: null,
          from_me: true,
          timestamp:  new Date().toISOString(),
          message_type: 'image',
          base64:newImageUrl
          }
      if (socketInstance) {
        socketInstance.emit('message', message);

        setSelectedMessages((prev) => [...prev, message]);
      } else {
      }

    } catch (error) {
      console.error('Erro ao enviar a imagem:', error);
      showError('Erro ao enviar imagem. Tente novamente.');
    }
  };


  const handleAudioRecording = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaStreamRef.current = stream;
        setMediaRecorder(recorder);

        const chunks = [];
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        recorder.onstop = async () => {
        stopMediaStream();
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        if (audioBlob.size === 0) {
            return;
        }

        const newAudioUrl = URL.createObjectURL(audioBlob); 
        setAudioUrl(newAudioUrl); 

          if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
          }

          const formData = new FormData();
          formData.append('audio', audioBlob);
          formData.append('chatId', selectedChat.id);
          formData.append('connectionId', selectedChat.connection_id);
          formData.append('schema', schema);
          
          try {
            await axios.post(`${url}/chat/sendAudio`, formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            },
          {
      withCredentials: true
    });
            const message = {
              id: audioBlob,
              text: null,
              from_me: true,
              timestamp:  new Date().toISOString(),
              message_type: 'audio',
              base64:newAudioUrl
            }
            if (socketInstance) {
            socketInstance.emit('message', message);
            const formattedMessage = formatMessage(message);
            setSelectedMessages((prev) => [...prev, formattedMessage]);
          } else {
          }
          }catch (error) {
            console.error('Erro ao enviar áudio:', error);
          }
        };

        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
        
        recorder.start();
        setIsRecording(true);
        setRecordingTime(0);

        recordingIntervalRef.current = setInterval(() => {
          setRecordingTime((prevTime) => prevTime + 1);
        }, 1000);

      } catch (error) {
        console.error('Erro ao acessar o microfone:', error);
      }
    } else {
      if (mediaRecorder) {
        mediaRecorder.stop();
        setIsRecording(false);
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
  scrollToBottom();
}, [selectedMessages]);

  const handleImageClick = (imageBase64) => {
    setSelectedImage(imageBase64);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  // Função para substituir placeholders nas mensagens rápidas
  const replacePlaceholders = (message, chat) => {
    if (!chat) return message;
    
    return message
      .replace(/\{\{nome\}\}/g, chat.contact_name || 'Cliente')
      .replace(/\{\{telefone\}\}/g, chat.contact_phone || '');
  };

  const handleQuickMsgClick = useCallback((msg, comando) => {
    const messageWithPlaceholders = replacePlaceholders(msg, selectedChat);
    setNewMessage(prev => {
      if (prev.startsWith('/')) {
        // Substitui o comando digitado (da barra até espaço ou fim) pela mensagem
        return prev.replace(/^\/[^\s]*/, messageWithPlaceholders);
      }
      return messageWithPlaceholders;
    });
    setShowQuickMsgPopover(false);
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 0);
  }, [selectedChat]);

  // Carregar mensagens rápidas do backend
  useEffect(() => {
    async function fetchQuickMessages() {
      try {
        const res = await axios.get(`${url}/qmessage/get-q-messages-by-user/${userData.id}/${schema}`, { withCredentials: true });
        const msgs = (res.data.result || []).map(msg => ({
          comando: msg.shortcut || `/msg${msg.id.slice(0, 4)}`,
          mensagem: msg.value,
          tipo: msg.tag,
          setor: msg.queue_id ? (queues.find(q => q.id === msg.queue_id)?.name || queues.find(q => q.id === msg.queue_id)?.nome || '') : '',
          id: msg.id
        }));
        setQuickMsgList(msgs);
      } catch (err) {
        console.error('Erro ao buscar mensagens rápidas:', err);
        setQuickMsgList([]);
      }
    }
    fetchQuickMessages();
  }, [schema, url, queues]);


  // Estado das mensagens rápidas para gerenciamento
  const [quickMsgList, setQuickMsgList] = useState([]);
  const [showQuickMsgManage, setShowQuickMsgManage] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [searchInputRef, setSearchInputRef] = useState(null);
  const [originalStyles, setOriginalStyles] = useState({});

  const quickMsgFilter = newMessage.startsWith('/') ? newMessage.slice(1).toLowerCase() : '';
  const quickMsgFiltered = quickMsgFilter
    ? quickMsgList.filter(opt => opt.comando.slice(1).toLowerCase().includes(quickMsgFilter))
    : quickMsgList;

  // Agrupamento por tipo e setor
  const quickMsgByTipo = quickMsgFiltered.reduce((acc, msg) => {
    if (msg.tipo === 'setor') {
      if (!acc['setor']) acc['setor'] = {};
      if (!acc['setor'][msg.setor]) acc['setor'][msg.setor] = [];
      acc['setor'][msg.setor].push(msg);
    } else {
      if (!acc['pessoal']) acc['pessoal'] = [];
      acc['pessoal'].push(msg);
    }
    return acc;
  }, {});
  const tiposOrdem = ['pessoal', 'setor'];

  // Função para realizar a pesquisa
  const performSearch = useCallback(() => {
    if (!searchText.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    const results = [];
    selectedMessages.forEach((message, messageIndex) => {
      if (message.text) {
        const text = caseSensitive ? message.text : message.text.toLowerCase();
        const search = caseSensitive ? searchText : searchText.toLowerCase();
        
        let startIndex = 0;
        while (true) {
          const index = text.indexOf(search, startIndex);
          if (index === -1) break;
          
          results.push({
            messageIndex,
            messageId: message.id,
            startIndex: index,
            endIndex: index + search.length,
            text: message.text
          });
          
          startIndex = index + 1;
        }
      }
    });

    setSearchResults(results);
    setCurrentSearchIndex(results.length > 0 ? 0 : -1);
  }, [searchText, caseSensitive, selectedMessages]);

  // Efeito para realizar pesquisa quando os parâmetros mudam
  useEffect(() => {
    performSearch();
  }, [performSearch]);

  // Função para navegar entre os resultados
  const navigateSearch = (direction) => {
    if (searchResults.length === 0) return;
    
    if (direction === 'next') {
      setCurrentSearchIndex((prev) => (prev + 1) % searchResults.length);
    } else {
      setCurrentSearchIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    }
  };

  // Função para limpar destaque anterior
  const clearPreviousHighlight = () => {
    if (searchResults.length > 0 && currentSearchIndex >= 0 && currentSearchIndex < searchResults.length) {
      const previousResult = searchResults[currentSearchIndex];
      const previousElement = document.querySelector(`[data-message-id="${previousResult.messageId}"]`);
      
      if (previousElement) {
        const original = originalStyles[previousResult.messageId];
        if (original) {
          previousElement.style.backgroundColor = original.backgroundColor;
          previousElement.style.color = original.color;
          previousElement.style.border = original.border || '';
        } else {
          previousElement.style.backgroundColor = '';
          previousElement.style.color = '';
          previousElement.style.border = '';
        }
      }
    }
  };

  // Função para destacar o resultado atual
  const highlightCurrentResult = () => {
    if (searchResults.length === 0 || currentSearchIndex === -1) return;
    
    // Limpar destaque anterior
    clearPreviousHighlight();
    
    // Aplicar destaque azul em todas as mensagens encontradas (sem borda)
    searchResults.forEach((result, index) => {
      const element = document.querySelector(`[data-message-id="${result.messageId}"]`);
      if (element) {
        // Salvar estilos originais se ainda não foram salvos
        if (!originalStyles[result.messageId]) {
          const computedStyle = window.getComputedStyle(element);
          setOriginalStyles(prev => ({
            ...prev,
            [result.messageId]: {
              backgroundColor: computedStyle.backgroundColor,
              color: computedStyle.color,
              border: computedStyle.border
            }
          }));
        }
        
        // Aplicar fundo azul em todas as mensagens encontradas
        element.style.backgroundColor = 'var(--primary-color)';
        element.style.color = 'white';
        element.style.border = ''; // Sem borda para mensagens não focadas
      }
    });
    
    // Aplicar borda verde apenas na mensagem atualmente focada
    const currentResult = searchResults[currentSearchIndex];
    const currentElement = document.querySelector(`[data-message-id="${currentResult.messageId}"]`);
    
    if (currentElement) {
      currentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      currentElement.style.border = '1px solid var(--success-color)'; // Borda verde apenas na mensagem focada
    }
  };

  // Efeito para destacar o resultado atual quando o índice muda
  useEffect(() => {
    highlightCurrentResult();
  }, [currentSearchIndex]);

  // Efeito para focar no input de pesquisa quando abrir
  useEffect(() => {
    if (showSearch && searchInputRef) {
      setTimeout(() => {
        searchInputRef.focus();
      }, 100);
    }
  }, [showSearch, searchInputRef]);

  // Função para fechar a pesquisa
  const closeSearch = () => {
    // Limpar todos os destaques antes de fechar
    searchResults.forEach(result => {
      const element = document.querySelector(`[data-message-id="${result.messageId}"]`);
      if (element) {
        const original = originalStyles[result.messageId];
        if (original) {
          element.style.backgroundColor = original.backgroundColor;
          element.style.color = original.color;
          element.style.border = original.border || '';
        } else {
          element.style.backgroundColor = '';
          element.style.color = '';
          element.style.border = '';
        }
      }
    });
    
    // Garantir que a mensagem atualmente focada também seja limpa
    if (searchResults.length > 0 && currentSearchIndex >= 0 && currentSearchIndex < searchResults.length) {
      const currentResult = searchResults[currentSearchIndex];
      const currentElement = document.querySelector(`[data-message-id="${currentResult.messageId}"]`);
      if (currentElement) {
        const original = originalStyles[currentResult.messageId];
        if (original) {
          currentElement.style.backgroundColor = original.backgroundColor;
          currentElement.style.color = original.color;
          currentElement.style.border = original.border || '';
        } else {
          currentElement.style.backgroundColor = '';
          currentElement.style.color = '';
          currentElement.style.border = '';
        }
      }
    }
    
    setShowSearch(false);
    setSearchText('');
    setSearchResults([]);
    setCurrentSearchIndex(0);
    setOriginalStyles({});
  };

  // Função para obter as iniciais do nome
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Função para obter o nome do usuário pelo ID
  const getUserName = (userId) => {
    if (!userId) return null;
    // Try to find user by id with both string and number comparison
    const user = users.find(u => u.id === userId || u.id === String(userId) || u.id === Number(userId));
    return user ? (user.nome || user.username || user.name) : null;
  };

  // Função para obter o avatar da mensagem
  const getMessageAvatar = (message) => {
    if (!message.from_me) {
      // Mensagem do cliente - usar iniciais do nome do contato
      const contactName = selectedChat?.contact_name || 'Cliente';
      return {
        type: 'initials',
        content: getInitials(contactName),
        backgroundColor: '#2E7599',
        tooltip: contactName
      };
    } else {
      // Mensagem do atendente
      if (message.user_id) {
        // Tem user_id - usar iniciais do atendente
        const userName = getUserName(message.user_id);
        return {
          type: 'initials',
          content: getInitials(userName || 'Atendente'),
          backgroundColor: '#DB8200',
          tooltip: userName || 'Atendente'
        };
      } else {
        // user_id é null - usar avatar padrão
        return {
          type: 'default',
          content: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-icon lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
          backgroundColor: '#314859',
          tooltip: 'Atendente'
        };
      }
    }
  };

  return (
    <div className={`d-flex flex-column w-100 h-100 ms-2`} style={{ overflow: 'hidden' }}>
      <audio ref={audioRef} src="/notification.mp3" preload="auto" muted={isMuted} />
      {/* altura fixa em conteúdo, não em % da tela (em monitor menor o % esmagava o cabeçalho) */}
      <div className="pt-3 mb-3 d-flex flex-row align-items-center gap-5" style={{ flex: '0 0 auto' }}>
        <h2 className={`mb-0 ms-4 header-text-${theme}`} style={{ fontWeight: 400 }}>Chats</h2>

        <button
          className={`btn btn-sm btn-1-${theme} d-flex align-items-center gap-2`}
          onClick={() => setShowNewContactModal(true)}
        >
          <i className="bi-plus-lg"></i>
          Novo Contato
        </button>

        <button
          type="button"
          className={`btn btn-sm btn-2-${theme} d-flex align-items-center gap-2`}
          onClick={toggleMute}
          aria-pressed={isMuted}
          title={isMuted
            ? 'Som de novas mensagens desativado. Clique para ativar.'
            : 'Som de novas mensagens ativado. Clique para silenciar.'}
        >
          <i className={isMuted ? 'bi-volume-mute' : 'bi-volume-up'}></i>
          {isMuted ? 'Som desativado' : 'Som ativado'}
        </button>
      </div>
      <div
        className={`chat chat-${theme} w-100 d-flex flex-row`}
        style={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}
      >
        {/* LISTA DE CONTATOS — classe p/ media query reduzir em telas menores */}
        <div className={`chat-lista-conversas chat-list-${theme} bg-color-${theme} d-flex flex-column`}
          style={{
            height: '100%',
            backgroundColor: `var(--bg-color-${theme})`,
            overflow: 'hidden',
            position: 'relative'
          }}>

          <div style={{
            flex: '0 0 auto',
            position: 'sticky',
            top: 0,
            zIndex: 1,
            backgroundColor: `var(--bg-color-${theme})`
          }}>
            {/* Chips de filtro (estilo WhatsApp): filtram a lista única, não escondem conversas */}
            <div className="d-flex gap-1 px-2 flex-wrap" style={{ paddingTop: '8px' }}>
              {[
                { id: 'tudo', rotulo: 'Tudo', total: null },
                { id: 'nao-lidas', rotulo: 'Não lidas', total: chatList.filter(c => c.unreadmessages).length },
                { id: 'favoritas', rotulo: 'Favoritas', total: chatList.filter(c => c.is_favorite).length },
                { id: 'aguardando', rotulo: 'Espera', total: chatList.filter(c => c.status === 'waiting').length },
                { id: 'grupos', rotulo: 'Grupos', total: chatList.filter(c => c.isgroup || c.isGroup).length },
              ].map((chip) => (
                <button
                  key={chip.id}
                  className={`btn btn-sm rounded-pill px-3 ${selectedTab === chip.id ? `btn-1-${theme}` : `btn-2-${theme}`}`}
                  style={{ fontSize: '0.8rem' }}
                  onClick={() => handleTabChange(chip.id)}
                >
                  {chip.rotulo}{chip.total ? ` ${chip.total}` : ''}
                </button>
              ))}
            </div>

            {/* Listas (etiquetas do WhatsApp Business). Só aparecem se existir alguma. */}
            {listas.length > 0 && (
              <div className="d-flex gap-1 px-2 flex-wrap align-items-center" style={{ paddingTop: '6px' }}>
                <i className="bi bi-bookmarks" style={{ fontSize: '0.8rem', opacity: 0.6 }} title="Filtrar por lista"></i>
                <button
                  className={`btn btn-sm rounded-pill px-3 ${listaFiltro === 'todas' ? `btn-1-${theme}` : `btn-2-${theme}`}`}
                  style={{ fontSize: '0.75rem' }}
                  onClick={() => setListaFiltro('todas')}
                >
                  Todas as listas
                </button>
                {listas.map((lista) => (
                  <button
                    key={lista.id}
                    className={`btn btn-sm rounded-pill px-3 ${listaFiltro === lista.id ? `btn-1-${theme}` : `btn-2-${theme}`}`}
                    style={{ fontSize: '0.75rem', borderLeft: `4px solid ${lista.color || '#0082ca'}` }}
                    onClick={() => setListaFiltro(lista.id)}
                  >
                    {lista.name}{' '}
                    {chatList.filter(c => (c.tag_ids || []).includes(lista.id)).length > 0 && (
                      <span className="badge bg-secondary rounded-pill" style={{ fontSize: '0.6rem' }}>
                        {chatList.filter(c => (c.tag_ids || []).includes(lista.id)).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Chips por NÚMERO (conexão) — aparecem só quando há 2+ números escaneados */}
            {multiConexao && (
              <div className="d-flex gap-1 px-2 flex-wrap align-items-center" style={{ paddingTop: '6px' }}>
                <i className="bi bi-whatsapp" style={{ fontSize: '0.8rem', opacity: 0.6 }} title="Filtrar pelo número"></i>
                <button
                  className={`btn btn-sm rounded-pill px-3 ${conexaoFiltro === 'todas' ? `btn-1-${theme}` : `btn-2-${theme}`}`}
                  style={{ fontSize: '0.75rem' }}
                  onClick={() => setConexaoFiltro('todas')}
                >
                  Todos os números
                </button>
                {connections.map((conn) => (
                  <button
                    key={conn.id}
                    className={`btn btn-sm rounded-pill px-3 ${conexaoFiltro === conn.id ? `btn-1-${theme}` : `btn-2-${theme}`}`}
                    style={{ fontSize: '0.75rem' }}
                    title={conn.number ? `${getConnectionLabel(conn.id)} · ${conn.number}` : getConnectionLabel(conn.id)}
                    onClick={() => setConexaoFiltro(conn.id)}
                  >
                    {getConnectionLabel(conn.id)}
                    {' '}
                    {chatList.filter(c => c.connection_id === conn.id && c.unreadmessages).length > 0 && (
                      <span className="badge bg-primary rounded-pill" style={{ fontSize: '0.6rem' }}>
                        {chatList.filter(c => c.connection_id === conn.id && c.unreadmessages).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Lista filtrada */}
            <div className='p-3'>
              <div className='d-flex justify-content-between align-items-center'>
                <h6
                  className={`header-text-${theme} m-0`}
                >
                  {selectedTab === 'tudo' ? 'Conversas' : selectedTab === 'grupos' ? 'Grupos' : selectedTab === 'nao-lidas' ? 'Não lidas' : 'Sala de Espera'}
                </h6>
                {selectedTab === 'aguardando' && (
                  <button
                    className={`btn btn-sm btn-1-${theme} d-flex align-items-center gap-1`}
                    onClick={handleRedistributeWaitingChats}
                    disabled={redistributing}
                    title="Redistribuir leads aguardando"
                    style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                  >
                    <i className="bi bi-arrow-left-right"></i>
                    {redistributing ? 'Redistribuindo...' : 'Redistribuir'}
                  </button>
                )}
              </div>
            </div>

          </div>

          <div 
            className={``}
            style={{ 
              height: 'auto', 
              overflowY: 'auto'
            }}
          >
            {getFilteredChats().map((chat) => (
                <div className='msg d-flex flex-row' key={chat.id}>
                  <div
                    className={`selectedBar ${selectedChatId === chat.id ? '' : 'd-none'}`}
                    style={{ width: '2.5%', maxWidth: '5px', backgroundColor: 'var(--primary-color)' }}></div>
                  <div
                    className={`h-100 w-100 input-${theme}`}
                    onClick={() => handleChatClick(chat)}
                    style={{ cursor: 'pointer', padding: '10px', borderBottom: `1px solid var(--border-color-${theme})` }}
                  >
                    <div
  style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 2,
  }}
>
  <strong>
    {chat.isgroup && <i className="bi bi-people-fill me-1" title="Grupo" style={{ fontSize: '0.85em', opacity: 0.7 }}></i>}
    {chat.contact_name || chat.contact_phone || 'Sem Nome'}
    {chat.status === 'waiting' && (
      <span className="badge bg-warning-subtle text-warning-emphasis ms-1" style={{ fontSize: '0.62em', verticalAlign: 'middle' }}>
        Espera
      </span>
    )}
  </strong>
  <span
  title={getQueueName(chat.queue_id)}
  style={{
    background: '#e0e0e0',
    color: '#333',
    borderRadius: '6px',
    padding: '0 6px',
    fontSize: '0.65rem',
    marginLeft: '6px',
    whiteSpace: 'nowrap',
    fontWeight: 500,
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'inline-block',
    lineHeight: '18px',
    height: '18px',
    verticalAlign: 'middle'
  }}
>
  {getQueueName(chat.queue_id)}
</span>
{/* Por qual NÚMERO essa conversa entrou (só com 2+ conexões) */}
{multiConexao && chat.connection_id && (
  <span
    title={`Conversa pelo número ${getConnectionNumber(chat.connection_id) || getConnectionLabel(chat.connection_id)}`}
    style={{
      background: '#d9f2e6',
      color: '#0f6b45',
      borderRadius: '6px',
      padding: '0 6px',
      fontSize: '0.65rem',
      marginLeft: '4px',
      whiteSpace: 'nowrap',
      fontWeight: 500,
      maxWidth: '110px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: 'inline-block',
      lineHeight: '18px',
      height: '18px',
      verticalAlign: 'middle'
    }}
  >
    <i className="bi bi-whatsapp me-1" style={{ fontSize: '0.6rem' }}></i>
    {getConnectionLabel(chat.connection_id)}
  </span>
)}
</div>

                    <div className='d-flex flex-column align-items-center justify-content-center gap-1'>
                      <i
                        className={`bi ${chat.is_favorite ? 'bi-star-fill' : 'bi-star'}`}
                        title={chat.is_favorite ? 'Remover dos favoritos' : 'Favoritar (só você vê)'}
                        onClick={(e) => alternarFavorito(chat, e)}
                        style={{
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: chat.is_favorite ? '#f0b429' : 'var(--placeholder-color)',
                          opacity: chat.is_favorite ? 1 : 0.45,
                        }}
                      ></i>
                      {chat.unreadmessages && selectedChatId !== chat.id && (
                        <span style={{
                          position: 'sticky',
                          width: 12,
                          height: 12,
                          left:'100%',
                          background: '#0082ca',
                          borderRadius: '50%',
                          display: 'inline-block'
                        }} />
                      )}
                    </div>
                    <div
                      style={{
                        color: '#666',
                        fontSize: '0.9rem',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                      }}
                    >
                      {Array.isArray(chat.messages) && chat.messages.length > 0
                        ? (typeof chat.messages[chat.messages.length - 1] === 'string'
                            ? chat.messages[chat.messages.length - 1].slice(0, 40) +
                              (chat.messages[chat.messages.length - 1].length > 50 ? '...' : '')
                            : 'Mensagem de mídia')
                        : 'Sem mensagens'}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
{/* MENSAGENS DO CONTATO SELECIONADO */}
<div
  className={`w-100 chat-messages-${theme} d-flex flex-column`}
  style={{ borderTopRightRadius: '10px', position: 'relative' }}
>
  {/* Cabeçalho da conversa - sempre visível */}
  <div
    className="d-flex justify-content-between align-items-center flex-row px-3 py-2"
    style={{
      borderTopRightRadius: '5px',
      backgroundColor: `var(--bg-color-${theme})`,
      color: `var(--color-${theme})`,
      borderBottom: `1px solid var(--border-color-${theme})`,
      width:'100%',
    }}
  >
    <div>
     {isEditingName ? (
  <input
    ref={nomeContatoRef}
    id="nomeContato"
    type="text"
    value={editedName}
    onChange={e => setEditedName(e.target.value)}
    onBlur={handleEditNameFinish}
    onKeyDown={e => {
      if (e.key === 'Enter') handleEditNameFinish();
    }}
    style={{
      fontWeight: 700,
      fontSize: '1.1rem',
      border: '1px solid var(--border-color)',
      borderRadius: 4,
      padding: '2px 8px',
      minWidth: 120,
      background: 'transparent',
      color: `var(--color-${theme})`,
    }}
  />
) : (
  <strong
    id="nomeContato"
    style={{ fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer' }}
    onClick={handleEditNameStart}
  >
    {selectedChat?.isgroup && <i className="bi bi-people-fill me-2" title="Grupo" style={{ opacity: 0.7 }}></i>}
    {selectedChat?.contact_name || selectedChat?.contact_phone || 'Sem Nome'}
  </strong>
)}
      <div style={{ fontSize: '0.95rem', opacity: 0.8 }}>
        {selectedChat?.isgroup ? 'Grupo' : (selectedChat?.contact_phone || '')}
        {/* Por qual número MEU essa conversa está acontecendo — evita responder pelo número errado */}
        {selectedChat?.connection_id && getConnectionLabel(selectedChat.connection_id) && (
          <span style={{ opacity: 0.85 }}>
            {' · '}
            <i className="bi bi-whatsapp me-1" style={{ fontSize: '0.85em' }}></i>
            via {getConnectionLabel(selectedChat.connection_id)}
            {getConnectionNumber(selectedChat.connection_id) ? ` (${getConnectionNumber(selectedChat.connection_id)})` : ''}
          </span>
        )}
      </div>
    </div>

    <div className='d-flex flex-row gap-2'>

      <button
        className={`btn btn-2-${theme} d-flex gap-2 position-relative`}
        onClick={() => setShowEtiquetas(true)}
        title="Etiquetar esta conversa"
        disabled={!selectedChat}
      >
        <i className="bi bi-tag"></i>
        {(selectedChat?.tag_ids || []).length > 0 && (
          <span className="badge bg-primary rounded-pill position-absolute" style={{ top: -6, right: -6, fontSize: '0.6rem' }}>
            {(selectedChat.tag_ids || []).length}
          </span>
        )}
      </button>

      <button
        className={`btn btn-2-${theme} d-flex gap-2`}
        onClick={() => setShowSearch(!showSearch)}
        title="Pesquisar na conversa"
        disabled={!selectedChat}
      >
        <i className="bi bi-search"></i>
      </button>

      <button
        className={`btn btn-2-${theme} d-flex gap-2`}
        onClick={isBotActive ? disableBot : undefined}
        disabled={!isBotActive || !selectedChat}
        title={isBotActive ? "Desativar Bot" : "Bot Desativado"}
      >
        <i className={`bi ${isBotActive ? 'bi-pause':'bi-play-fill'}`}></i>
      </button>

      {selectedChat && selectedChat.status === 'waiting' && (
  <div>
    <button
      className={`btn btn-2-${theme} d-flex gap-2`}
      onClick={handleAcceptChat}
    >
      <i className="bi bi-check2"></i>
      Aceitar
    </button>
  </div>
)}

      {/* Botão Finalizar Atendimento */}
      {selectedChat && (
        <button
          className={`btn btn-2-${theme} d-flex align-items-center`}
          onClick={() => setShowFinalizarModal(true)}
          title="Finalizar Atendimento"
        >
          <i className="bi bi-check-circle"></i>
        </button>
      )}

      <div>
       <DropdownComponent
        theme={theme}
        selectedChat={selectedChat}
        handleChatClick={handleChatClick}
        setChats={setChats}
        setSelectedChat={setSelectedChat}
        setSelectedMessages={setSelectedMessages}
        onEditName={handleEditNameStart}
        editedName={editedName}
      />
      </div>

                                                            {/* Divider */}
                 <div style={{ borderLeft: `1px solid var(--border-color-${theme})`, paddingLeft: '8px', marginLeft: '8px', opacity: 0.8 }}></div>

      {/* Botão person-gear */}
      <button
        className={`btn btn-2-${theme} d-flex align-items-center`}
        onClick={async () => {
          // Carregar dados atualizados do banco quando abrir o menu
          if (selectedChat) {
            try {
              const res = await axios.get(`${url}/chat/getChatById/${selectedChat.id}/${schema}`,{
      withCredentials: true
    });
              const updatedChat = res.data.chat || selectedChat;
              
              // Atualizar o chat selecionado com dados mais recentes
              setSelectedChat(updatedChat);
              
              // Atualize o chat na lista com os dados mais recentes
              setChats(prevChats =>
                prevChats.map(c =>
                  c.id === updatedChat.id ? { ...c, ...updatedChat } : c
                )
              );
            } catch (error) {
              console.error('Erro ao buscar dados atualizados do chat:', error);
            }
          }
          
          setShowSideMenu(true);
          setTimeout(() => setSideMenuActive(true), 10);
        }}
        disabled={!selectedChat}
      >
        <i className="bi bi-person-gear"></i>
      </button>

      {/* MENU LATERAL SOBREPOSTO */}
      {showSideMenu && (
        <ChatsMenuLateral
          theme={theme}
          selectedChat={selectedChat}
          onClose={() => {
            setSideMenuActive(false);
            setTimeout(() => setShowSideMenu(false), 300);
          }}
          style={{
            opacity: sideMenuActive ? 1 : 0,
            transform: sideMenuActive ? 'translateX(0)' : 'translateX(100%)',
          }}
        />
      )}

    </div>

  </div>

  {/* Área de conteúdo da conversa — flex real no lugar do 707.61px medido de uma tela */}
  <div
    style={{
      flex: '1 1 auto',
      minHeight: 0,
      overflow: 'hidden auto',
      border: '1px solid var(--border-color)',
      position: 'relative',
    }}
  >
    
    {/* Campo de pesquisa flutuante */}
    {showSearch && (
      <div 
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 1000,
          backgroundColor: `var(--bg-color-${theme})`,
          border: `1px solid var(--border-color-${theme})`,
          borderRadius: 8,
          padding: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          minWidth: 320,
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <div className="position-relative flex-grow-1">
            <input
              ref={setSearchInputRef}
              type="text"
              placeholder="Pesquisar na conversa..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className={`form-control form-control-sm input-${theme}`}
              style={{ 
                width: '100%', 
                fontSize: 14,
                color: `var(--color-${theme})`,
                backgroundColor: `var(--bg-color-${theme})`,
                borderColor: `var(--border-color-${theme})`
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (e.shiftKey) {
                    navigateSearch('prev');
                  } else {
                    navigateSearch('next');
                  }
                } else if (e.key === 'Escape') {
                  closeSearch();
                }
              }}
            />
            {searchResults.length > 0 && (
              <div style={{ 
                position: 'absolute', 
                right: 8, 
                top: '50%', 
                transform: 'translateY(-50%)',
                fontSize: 12,
                color: `var(--color-${theme})`,
                opacity: 0.7
              }}>
                {currentSearchIndex + 1}/{searchResults.length}
              </div>
            )}
          </div>
          
          <button
            className={`btn btn-sm btn-2-${theme}`}
            onClick={() => navigateSearch('prev')}
            disabled={searchResults.length === 0}
            title="Anterior (Shift+Enter)"
          >
            <i className="bi bi-chevron-up"></i>
          </button>
          
          <button
            className={`btn btn-sm btn-2-${theme}`}
            onClick={() => navigateSearch('next')}
            disabled={searchResults.length === 0}
            title="Próximo (Enter)"
          >
            <i className="bi bi-chevron-down"></i>
          </button>
          
          <button
            className={`btn btn-sm ${caseSensitive ? `btn-1-${theme}` : `btn-2-${theme}`}`}
            onClick={() => setCaseSensitive(!caseSensitive)}
            title="Case Sensitive"
          >
            <i className="bi bi-type-bold"></i>
          </button>
          
          <button
            className={`btn btn-sm btn-2-${theme}`}
            onClick={closeSearch}
            title="Fechar (Esc)"
          >
            <i className="bi bi-x"></i>
          </button>
        </div>
      </div>
    )}
  
  <div
    id="corpoTexto"
    className="px-3 d-flex flex-column flex-grow-1"
    style={{
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      paddingTop: '5px',
      paddingBottom: '5px',
    }}
  >

  {groupMessagesByDate(selectedMessages).map((group, groupIndex) => (
    <div key={groupIndex}>
      {/* Cabeçalho da data */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          margin: '12px 0 12px 0',
        }}
      >
        <div
          style={{
            backgroundColor: '#f0f0f0',
            color: '#666',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: '500',
            textAlign: 'center',
          }}
        >
          {group.date}
        </div>
      </div>

      {/* Mensagens do grupo */}
      {group.messages.map((msg, index) => {
        const avatar = getMessageAvatar(msg);
        return (
          <div
            key={msg.id || index}
            style={{
              display: 'flex',
              justifyContent: msg.from_me ? 'flex-end' : 'flex-start',
              margin: '5px 0',
              alignItems: 'flex-end',
              gap: '8px',
            }}
          >
            {/* Avatar para mensagens do cliente */}
            {!msg.from_me && (
              <Avatar avatar={avatar} size={32} />
            )}
            
            <div
              data-message-id={msg.id}
              style={{
                backgroundColor: msg.from_me ? 'var(--hover)' : '#f1f0f0',
                textAlign: 'left',
                padding: '10px 10px 5px 10px',
                borderRadius: '10px',
                maxWidth: 'min(60%, 640px)',
                width: (msg.message_type === 'audio' || msg.message_type === 'audioMessage') ? '50%' : 'fit-content',
              }}
            >
              {/* Em grupo: quem falou (autor real, vindo do webhook) */}
              {selectedChat?.isgroup && !msg.from_me && msg.participant_name && (
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#2E7599', marginBottom: 3 }}>
                  {msg.participant_name}
                </div>
              )}
              {(msg.message_type === 'audio' || msg.message_type === 'audioMessage') ? (
                <AudioPlayer 
                  audioSrc={msg.base64} 
                  audioId={msg.id} 
                  theme={theme} 
                  isActive={activeAudioId === msg.id}
                  onPlayClick={setActiveAudioId}
                />
              ) : (msg.message_type === 'imageMessage' || msg.message_type === 'image') ? (
                <>
                  {msg.text && (
                    <div style={{ marginBottom: '5px' }}>
                      {msg.text}
                    </div>
                  )}
                  <img
                    src={
                      typeof msg.base64 === 'string'
                        ? msg.base64.startsWith('blob:')
                          ? msg.base64
                          : `data:image/jpeg;base64,${msg.base64}`
                        : msg.base64
                    }
                    alt="imagem"
                    style={{
                      maxWidth: 'min(300px, 100%)',
                      width: '100%',
                      height: 'auto',
                      borderRadius: '8px',
                      display: 'block',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleImageClick(msg.base64)}
                  />
                </>
              ) : (
                msg.text && (
                  <div>
                    {msg.text}
                  </div>
                )
              )}
              {/* Horário formatado */}
              <div style={{ fontSize: '0.75rem', color: '#888'}}>
                {formatHour(msg.timestamp)}
              </div>
            </div>

            {/* Avatar para mensagens do atendente */}
            {msg.from_me && (
              <Avatar avatar={avatar} size={32} />
            )}
          </div>
        );
      })}
    </div>
  ))}

{/* Renderize o modal de imagem ampliada fora do map */}
{selectedImage && (
  <div
    className="image-modal"
    onClick={closeImageModal}
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.25)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}
  >
    <img
      src={`data:image/jpeg;base64,${selectedImage}`}
      alt="imagem ampliada"
      style={{
        maxWidth: '90%',
        maxHeight: '90%',
      }}
    />
  </div>
)}
      <div ref={messagesEndRef} />
    </div>
  </div>

  {/* INPUT DE MENSAGEM */}
  <div
    className="p-3 w-100 d-flex justify-content-center message-input gap-2"
    style={{
      borderBottomRightRadius: '5px',
      backgroundColor: `var(--bg-color-${theme})`,
      borderTop: '1px solid var(--border-color)',
      flex: '0 0 auto',
      minHeight: '64px',
    }}
  >
<div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
  <button
    id="imagem"
    className={`btn btn-2-${theme}`}
    onClick={() => document.getElementById('imageInput').click()}
    disabled={!selectedChat || souVisualizador}
  >
    <i className="bi bi-image"></i>
  </button>
  <input
    id="imageInput"
    type="file"
    accept="image/*"
    style={{ display: 'none' }} 
    onChange={handleImageUpload}
  />
  <button
    ref={quickMsgBtnRef}
    className={`btn btn-2-${theme}`}
    style={{}}
    title="Mensagens rápidas"
    onClick={() => setShowQuickMsgPopover(v => !v)}
    disabled={!selectedChat}
  >
    <i className="bi bi-lightning-charge"></i>
  </button>
  {showQuickMsgPopover && (
    <div
      id="quickMsgPopover"
      style={{
        position: 'absolute',
        left: 0,
        bottom: '100%',
        marginBottom: 8,
        minWidth: 340,
        background: `var(--bg-color-${theme})`,
        color: `var(--color-${theme})`,
        border: `1px solid var(--border-color-${theme})`,
        borderRadius: 8,
        boxShadow: '0 2px 8px var(--shadow-color, rgba(0,0,0,0.12))',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 38, fontSize: 15, fontWeight: 600, padding: '0 8px 0 12px' }}>
        <span>Mensagens Rápidas</span>
        <button
          type="button"
          className={`btn btn-2-${theme} d-flex align-items-center justify-content-center`}
          style={{
            width: 21,
            height: 21,
            padding: 0,
            margin: 0,
            border: `none`,
            background: `var(--bg-color-${theme})`,
            color: `var(--primary-color)`,
            boxShadow: 'none',
            transition: 'background 0.2s, color 0.2s'
          }}
          title="Gerenciar"
          onClick={() => setShowQuickMsgManage(true)}
        >
          <i className="bi bi-gear" style={{ fontSize: 14 }}></i>
        </button>
      </div>
      <div style={{ fontSize: 13, color: `var(--color-${theme})`, borderTop: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 400, overflowY: 'auto' }}>
          {quickMsgFiltered.length === 0 && (
            <div style={{ padding: '18px 0', textAlign: 'center', color: '#888', fontSize: 15 }}>Nenhuma mensagem encontrada</div>
          )}
          {tiposOrdem.map(tipo => (
            tipo === 'pessoal' && quickMsgByTipo.pessoal && quickMsgByTipo.pessoal.length > 0 && (
              <div key="pessoal">
                <div style={{ fontWeight: 700, fontSize: 12, color: '#888', padding: '4px 12px 2px 12px', textTransform: 'uppercase', letterSpacing: 0.5, borderTop: `1px solid var(--placeholder-color)` }}>PESSOAL</div>
                {quickMsgByTipo.pessoal.map((item, idx) => (
                  <div
                    key={item.comando}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0,
                      position: 'relative',
                      cursor: 'pointer',
                      background: 'none',
                      transition: 'background 0.15s',
                      padding: '4px 0',
                      borderBottom: idx === quickMsgByTipo.pessoal.length-1 ? 'none' : `1px solid var(--border-color-${theme})`,
                      minHeight: 38,
                      userSelect: 'none',
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = `var(--bg-color-dark)` }}
                    onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = `var(--color-${theme})` }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        color: 'var(--primary-color)',
                        minWidth: 100,
                        fontSize: 11,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                        cursor: 'pointer',
                      }}
                                              onClick={() => {
                          setIsRecording(false);
                          handleQuickMsgClick(item.mensagem, item.comando);
                        }}
                    >{item.comando}</span>
                    <span
                      style={{
                        color: 'var(--secondary-color)',
                        fontSize: 13,
                        opacity: 0.95,
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 12px',
                        height: '100%',
                        cursor: 'pointer',
                      }}
                      onClick={e => {
                        setIsRecording(false);
                        handleQuickMsgClick(item.mensagem, item.comando);
                      }}
                    >
                      {item.mensagem.length > 30 ? item.mensagem.slice(0, 30) + '...' : item.mensagem}
                    </span>
                  </div>
                ))}
              </div>
            )
            ||
            tipo === 'setor' && quickMsgByTipo.setor && Object.keys(quickMsgByTipo.setor).length > 0 && (
              Object.entries(quickMsgByTipo.setor).map(([setor, msgs]) => (
                <div key={setor}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: '#888', padding: '4px 12px 2px 12px', textTransform: 'uppercase', letterSpacing: 0.5, borderTop: `1px solid var(--placeholder-color)` }}>SETOR • {setor}</div>
                  {msgs.map((item, idx) => (
                    <div
                      key={item.comando}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0,
                        position: 'relative',
                        cursor: 'pointer',
                        background: 'none',
                        transition: 'background 0.15s',
                        padding: '4px 0',
                        borderBottom: idx === msgs.length-1 ? 'none' : `1px solid var(--border-color-${theme})`,
                        minHeight: 38,
                        userSelect: 'none',
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = `var(--bg-color-dark)` }}
                      onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = `var(--color-${theme})` }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          color: 'var(--primary-color)',
                          minWidth: 100,
                          fontSize: 11,
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          height: '100%',
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          setIsRecording(false);
                          handleQuickMsgClick(item.mensagem, item.comando);
                        }}
                      >{item.comando}</span>
                      <span
                        style={{
                          color: 'var(--secondary-color)',
                          fontSize: 13,
                          opacity: 0.95,
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0 12px',
                          height: '100%',
                          cursor: 'pointer',
                        }}
                        onClick={e => {
                          setIsRecording(false);
                          handleQuickMsgClick(item.mensagem, item.comando);
                        }}
                      >
                        {item.mensagem.length > 30 ? item.mensagem.slice(0, 30) + '...' : item.mensagem}
                      </span>
                    </div>
                  ))}
                </div>
              ))
            )
          ))}
        </div>
      </div>
    </div>
  )}
</div>
    <div
      id="campoEscrever"
      className={`py-0 px-2 form-control input-${theme} d-flex flex-row gap-2`}
      style={{ position: 'relative', width: '70%' }}
    >
      <div style={{ position: 'relative' }}>
        {!isRecording && (
        <button
          id="emoji"
          className={`btn d-flex justify-content-center align-items-center btn-2-${theme}`}
          style={{
            width: '35px',
            height: '35px',
            border: 'none',
          }}
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          disabled={!selectedChat}
        >
          <i className="bi bi-emoji-smile"></i>
        </button>
        )}
        
        {showEmojiPicker && !isRecording && (
          <div style={{ position: 'absolute', bottom: '40px', left: '0', zIndex: 1000 }}>
            <EmojiPicker onEmojiClick={handleEmojiClick} theme={theme === 'light' ? 'light' : 'dark'} />
          </div>
        )}
      </div>

        <input
        ref={inputRef}
        className={`form-control input-${theme} d-flex flex-row gap-2 px-0 py-0`}
        type="text"
        placeholder={isRecording ? '' : souVisualizador ? 'Perfil de visualização — você não pode enviar mensagens' : 'Digite sua mensagem...'}
        value={isRecording ? '' : newMessage}
        onChange={e => {
          setNewMessage(e.target.value);
          if (e.target.value.startsWith('/') && !showQuickMsgPopover) {
            setShowQuickMsgPopover(true);
          } else if (!e.target.value.startsWith('/') && showQuickMsgPopover) {
            setShowQuickMsgPopover(false);
          }
        }}
        onFocus={e => {
          if (e.target.value.startsWith('/')) {
            setShowQuickMsgPopover(true);
          }
        }}
        onKeyDown={e => {
          handleQuickMsgKeyDown(e);
          if (e.key === 'Enter' && !isRecording && quickMsgIndex === -1) {
            handleSubmit(newMessage);
            handleSendMessage();
          }
        }}
        style={{
          width: '100%',
          color: isRecording
            ? 'var(--error-color)'
            : theme === 'light'
            ? 'var(--color-light)'
            : 'var(--color-dark)',
          borderColor: isRecording ? 'var(--error-color)' : '',
          backgroundColor: 'transparent',
          border: 'none',
        }}
        disabled={!selectedChat || souVisualizador}
      />
      {isRecording && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '10px',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <i
            className="bi bi-record-circle"
            style={{ color: 'var(--error-color)' }}
          ></i>
          <span>{`${Math.floor(recordingTime / 60)}:${String(
            recordingTime % 60
          ).padStart(2, '0')}`}</span>
        </div>
      )}
    </div>

    <button
      id="audio"
      className={`btn btn-2-${theme}`}
      onClick={() => {
        if (isRecording) {
          // Cancelar gravação
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.onstop = null; // Evita envio
            mediaRecorder.stop();
            stopMediaStream();
          }
          setIsRecording(false);
          setRecordingTime(0);
          setAudioChunks([]);
        } else {
          handleAudioRecording(); // Iniciar gravação
        }
      }}
      style={{
        color: isRecording ? 'var(--error-color)' : '',
        borderColor: isRecording ? 'var(--error-color)' : '',
      }}
      disabled={!selectedChat || souVisualizador}
    >
      <i className={`bi ${isRecording ? 'bi-x' : 'bi-mic'}`}></i>
    </button>

    <button
      id="enviar"
      className={`btn btn-2-${theme}`}
      onClick={() => {
        if (isRecording) {
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
          setIsRecording(false);
          setRecordingTime(0);
        } else {
          handleSubmit(newMessage)
          handleSendMessage();
        }
      }}
      disabled={!selectedChat || souVisualizador}
    >
      <i className="bi bi-send"></i>
    </button>

  </div>

  {/* Overlay para quando nenhuma conversa está selecionada */}
  {!selectedChat && (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: `var(--bg-color-${theme})`,
        color: `var(--color-${theme})`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        borderTopRightRadius: '5px',
        borderBottomRightRadius: '5px',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          padding: '20px',
        }}
      >
        <i 
          className="bi bi-chat-left-text" 
          style={{
            fontSize: '4rem',
            color: `var(--placeholder-color)`,
            marginBottom: '1rem',
            opacity: 0.5,
          }}
        ></i>
        <h5 
          style={{
            color: `var(--color-${theme})`,
            marginBottom: '0.5rem',
            fontWeight: '600',
          }}
        >
          Selecione uma conversa
        </h5>
        <p 
          style={{
            color: `var(--placeholder-color)`,
            fontSize: '0.9rem',
            margin: '0',
            opacity: 0.7,
          }}
        >
          Escolha uma conversa da lista para começar a enviar mensagens
        </p>
      </div>
    </div>
  )}
</div>
    </div>
      <NewContactModal 
        theme={theme} 
        show={showNewContactModal} 
        onHide={() => setShowNewContactModal(false)}
      />

      {/* Etiquetas da conversa: marcar algo especial (ex.: "cliente VIP", "reclamação",
          "aguardando documento"). São as mesmas Listas que filtram a lista de conversas,
          e valem para a EMPRESA — diferente do favorito, que é de cada usuário. */}
      <Modal show={showEtiquetas} onHide={() => setShowEtiquetas(false)} centered>
        <Modal.Header closeButton style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <h5 className={`modal-title header-text-${theme} mb-0`}>
            <i className="bi bi-tag me-2"></i>Etiquetas da conversa
          </h5>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <div className={`card-subtitle-${theme} mb-3`} style={{ fontSize: '0.85rem' }}>
            {selectedChat?.contact_name || selectedChat?.contact_phone || ''}
          </div>

          {listas.length === 0 && (
            <div className={`card-subtitle-${theme} mb-3`} style={{ fontSize: '0.85rem' }}>
              Nenhuma etiqueta criada ainda. Crie a primeira abaixo.
            </div>
          )}

          {listas.map((lista) => {
            const marcada = (selectedChat?.tag_ids || []).includes(lista.id);
            return (
              <div
                key={lista.id}
                className="d-flex align-items-center justify-content-between py-2"
                style={{ borderBottom: `1px solid var(--border-color-${theme})`, cursor: 'pointer' }}
                onClick={() => !salvandoEtiqueta && alternarEtiquetaDoChat(lista.id)}
              >
                <span className={`card-subtitle-${theme}`}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: lista.color || '#0082ca', marginRight: 8 }} />
                  {lista.name}
                </span>
                <i className={`bi ${marcada ? 'bi-check-square-fill text-primary' : 'bi-square'}`}></i>
              </div>
            );
          })}

          <div className="d-flex align-items-center gap-2 mt-3">
            <input
              type="color"
              className="form-control form-control-color"
              style={{ width: 46 }}
              value={corEtiqueta}
              onChange={(e) => setCorEtiqueta(e.target.value)}
              title="Cor da etiqueta"
            />
            <input
              type="text"
              className={`form-control input-${theme}`}
              placeholder="Nova etiqueta (ex.: reclamação, VIP)"
              value={novaEtiqueta}
              onChange={(e) => setNovaEtiqueta(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') criarEtiqueta(); }}
            />
            <button
              className={`btn btn-1-${theme}`}
              disabled={salvandoEtiqueta || !novaEtiqueta.trim()}
              onClick={criarEtiqueta}
            >
              Criar
            </button>
          </div>
          <small className={`card-subtitle-${theme} d-block mt-2`} style={{ fontSize: '0.75rem' }}>
            A etiqueta vale para a equipe e vira filtro na lista de conversas.
          </small>
        </Modal.Body>
      </Modal>

      <QuickMsgManageModal
        theme={theme}
        show={showQuickMsgManage}
        onHide={() => setShowQuickMsgManage(false)}
        mensagens={quickMsgList}
        setMensagens={setQuickMsgList}
      />
      
      <CustomValuesModal
        show={showCustomValuesModal}
        onHide={() => setShowCustomValuesModal(false)}
        theme={theme}
        schema={schema}
      />

      <FinalizarAtendimentoModal
        show={showFinalizarModal}
        onHide={() => setShowFinalizarModal(false)}
        theme={theme}
        selectedChat={selectedChat}
        onFinish={() => {
          setChats(prevChats => prevChats.filter(c => c.id !== selectedChat.id));
          setSelectedChat(null);
          setSelectedMessages([]);
        }}
      />
    </div>
  );
}

function ChatPageWithProvider(props) {
  return (
    <ChatPage {...props} />
  );
}

export default ChatPageWithProvider;