import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

const useDashboardData = (schema, url) => {
  const [data, setData] = useState({
    users: [],
    closedChats: [],
    statusList: [],
    activeChats: [],
    queues: [],
    connections: [],
    reportData: [],
    userNames: {},
    queueMap: {}
  });

  const [loading, setLoading] = useState({
    users: false,
    closedChats: false,
    statusList: false,
    activeChats: false,
    queues: false,
    connections: false,
    reportData: false
  });

  const [error, setError] = useState({
    users: null,
    closedChats: null,
    statusList: null,
    activeChats: null,
    queues: null,
    connections: null,
    reportData: null
  });

  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Função para fazer requisições com retry e debounce
  const fetchWithRetry = useCallback(async (endpoint, options = {}) => {
    const maxRetries = 3;
    const delay = 1000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await axios.get(endpoint, {
          withCredentials: true,
          ...options
        });
        return response.data;
      } catch (err) {
        if (i === maxRetries - 1) throw err;
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }, []);

  // Função para buscar conexões
  const fetchConnections = useCallback(async () => {
    if (!schema) return [];
    
    setLoading(prev => ({ ...prev, connections: true }));
    setError(prev => ({ ...prev, connections: null }));
    
    try {
      const response = await fetchWithRetry(`${url}/connection/get-all-connections/${schema}`);
      const connections = Array.isArray(response) ? response : [response];
      setData(prev => ({ ...prev, connections }));
      return connections;
    } catch (err) {
      console.error('Erro ao buscar conexões:', err);
      setError(prev => ({ ...prev, connections: err.message }));
      return [];
    } finally {
      setLoading(prev => ({ ...prev, connections: false }));
    }
  }, [schema, url, fetchWithRetry]);

  // Função para buscar dados básicos
  const fetchBasicData = useCallback(async () => {
    if (!schema) return;

    setLoading(prev => ({
      ...prev,
      users: true,
      closedChats: true,
      statusList: true,
      queues: true,
      reportData: true
    }));

    try {
      // Buscar usuários
      const usersResponse = await fetchWithRetry(`${url}/api/users/${schema}`);
      const usersData = usersResponse || [];
      const usersArray = Array.isArray(usersData) ? usersData : [usersData];
      const users = usersArray[0]?.users || [];

      // Criar mapeamento de nomes
      const userNames = {};
      users.forEach(user => {
        userNames[user.id] = user.nome || user.username || user.name || `Usuário ${user.id}`;
      });

      // Buscar conversas fechadas
      const closedChatsResponse = await fetchWithRetry(`${url}/chat/get-closed-chats/${schema}`);
      const closedChats = closedChatsResponse?.result || [];

      // Buscar status
      const statusResponse = await fetchWithRetry(`${url}/chat/get-status/${schema}`);
      const statusList = statusResponse?.result || [];

      // Buscar filas
      const queuesResponse = await fetchWithRetry(`${url}/queue/get-all-queues/${schema}`);
      const queues = queuesResponse?.result || [];

      // Criar mapeamento de filas
      const queueMap = {};
      queues.forEach(queue => {
        queueMap[queue.id] = queue.name || `Fila ${queue.id}`;
      });

      // Buscar relatórios
      const reportsResponse = await fetchWithRetry(`${url}/report/get-reports/${schema}`);
      let reportData = reportsResponse?.result || [];
      if (typeof reportData === 'string') {
        try {
          reportData = JSON.parse(reportData);
        } catch {}
      }
      if (!Array.isArray(reportData)) reportData = [reportData];

      setData(prev => ({
        ...prev,
        users,
        closedChats,
        statusList,
        queues,
        reportData,
        userNames,
        queueMap
      }));

      setLastUpdate(new Date());
    } catch (err) {
      console.error('Erro ao carregar dados básicos:', err);
      setError(prev => ({
        ...prev,
        users: err.message,
        closedChats: err.message,
        statusList: err.message,
        queues: err.message,
        reportData: err.message
      }));
    } finally {
      setLoading(prev => ({
        ...prev,
        users: false,
        closedChats: false,
        statusList: false,
        queues: false,
        reportData: false
      }));
    }
  }, [schema, url, fetchWithRetry]);

  // Função para buscar chats ativos
  const fetchActiveChats = useCallback(async () => {
    if (!schema) return;

    setLoading(prev => ({ ...prev, activeChats: true }));
    setError(prev => ({ ...prev, activeChats: null }));

    try {
      const response = await fetchWithRetry(`${url}/chat/getChats/${schema}`);
      const openChats = response.filter(c => c.status !== 'closed');
      setData(prev => ({ ...prev, activeChats: openChats }));
    } catch (err) {
      console.error('Erro ao buscar chats ativos:', err);
      setError(prev => ({ ...prev, activeChats: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, activeChats: false }));
    }
  }, [schema, url, fetchWithRetry]);

  // Efeito para carregar dados básicos
  useEffect(() => {
    if (schema && url) {
      fetchBasicData();
    }
  }, [schema, url, fetchBasicData]);

  // Efeito para carregar chats ativos
  useEffect(() => {
    if (schema && url) {
      fetchActiveChats();
    }
  }, [schema, url, fetchActiveChats]);

  // Efeito para carregar conexões
  useEffect(() => {
    if (schema && url) {
      fetchConnections();
    }
  }, [schema, url, fetchConnections]);

  // Memoizar dados calculados
  const calculatedData = useMemo(() => {
    const { closedChats, statusList, connections, activeChats } = data;

    // Mapear status de sucesso
    const statusSuccessMap = {};
    statusList.forEach(s => {
      statusSuccessMap[s.value] = s.success;
    });

    // Separar status de sucesso e perda
    const successStatusList = statusList.filter(s => s.success);
    const loseStatusList = statusList.filter(s => s.success === false);

    // Calcular dados de ganho
    const successLabel = successStatusList.map(s => s.value);
    const ganhoDatas = successLabel.map(motivo => 
      closedChats.filter(chat => chat.status === motivo).length
    );

    // Calcular dados de perda
    const perdaLabels = loseStatusList.map(s => s.value);
    const perdaDatas = perdaLabels.map(motivo =>
      closedChats.filter(chat => chat.status === motivo).length
    );

    // Calcular conversão por canal
    const channelTotal = {};
    const channelStats = {};

    closedChats.forEach(chat => {
      const channelId = chat.connection_id || chat.channel_id || chat.canal || 'desconhecido';
      channelTotal[channelId] = (channelTotal[channelId] || 0) + 1;
      if (statusSuccessMap[chat.status] === true) {
        channelStats[channelId] = (channelStats[channelId] || 0) + 1;
      }
    });

    const conversionByChannel = connections.map(conn => {
      const total = channelTotal[conn.id] || 0;
      const converted = channelStats[conn.id] || 0;
      return total > 0 ? Math.round((converted / total) * 100) : 0;
    });

    // Calcular dados de chats abertos por canal
    const channelOpenTotals = {};
    activeChats.forEach(chat => {
      const channelId = chat.connection_id || chat.channel_id || chat.canal || 'desconhecido';
      channelOpenTotals[channelId] = (channelOpenTotals[channelId] || 0) + 1;
    });

    return {
      successStatusList,
      loseStatusList,
      ganhoDatas,
      perdaDatas,
      conversionByChannel,
      channelOpenTotals,
      statusSuccessMap
    };
  }, [data.closedChats, data.statusList, data.connections, data.activeChats]);

  return {
    data,
    loading,
    error,
    lastUpdate,
    calculatedData,
    refetch: {
      connections: fetchConnections,
      basicData: fetchBasicData,
      activeChats: fetchActiveChats
    }
  };
};

export default useDashboardData;
