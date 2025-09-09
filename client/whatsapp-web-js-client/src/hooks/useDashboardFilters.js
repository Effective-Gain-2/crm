import { useMemo, useCallback } from 'react';

const useDashboardFilters = (data, selectedPeriod, selectedSector, selectedChannel) => {
  // Função para filtrar dados por período
  const filterDataByPeriod = useCallback((data, useClosedAt = false) => {
    const now = new Date();
    const periodMap = {
      'diario': 1,
      'semanal': 7,
      'mensal': 30
    };
    const days = periodMap[selectedPeriod] || 1;
    
    let cutoffDate;
    let endOfDay;
    
    if (selectedPeriod === 'diario') {
      // Para diário, pegar apenas dados de hoje (início do dia até fim do dia)
      cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else {
      // Para outros períodos, pegar dados dos últimos X dias
      cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    }
    
    return data.filter(item => {
      if (useClosedAt) {
        if (!item.closed_at) return false;
        const itemDate = new Date(item.closed_at);
        if (selectedPeriod === 'diario') {
          return itemDate >= cutoffDate && itemDate <= endOfDay;
        }
        return itemDate >= cutoffDate;
      } else {
        if (!item.created_at && !item.chat_created_at) return false;
        
        let itemDate;
        if (item.created_at) {
          if (item.created_at > 1000000000000) {
            itemDate = new Date(Number(item.created_at));
          } else {
            itemDate = new Date(item.created_at * 1000);
          }
        } else if (item.chat_created_at) {
          if (item.chat_created_at > 1000000000000) {
            itemDate = new Date(item.chat_created_at);
          } else {
            itemDate = new Date(item.chat_created_at * 1000);
          }
        }
        
        if (selectedPeriod === 'diario') {
          return itemDate && itemDate >= cutoffDate && itemDate <= endOfDay;
        }
        return itemDate && itemDate >= cutoffDate;
      }
    });
  }, [selectedPeriod]);

  // Função para filtrar dados por setor
  const filterDataBySector = useCallback((data, users) => {
    if (selectedSector === 'todos') return data;
    return data.filter(item => {
      const user = users?.find(u => u.id === item.user_id);
      return user && user.setor === selectedSector;
    });
  }, [selectedSector]);

  // Função para filtrar dados por canal
  const filterDataByChannel = useCallback((data) => {
    if (selectedChannel === 'todos') return data;
    return data.filter(item => selectedChannel === 'whatsapp');
  }, [selectedChannel]);

  // Função para filtrar dados dos últimos 7 dias
  const filterDataByLast7Days = useCallback((data, useClosedAt = false) => {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    
    return data.filter(item => {
      if (useClosedAt) {
        if (!item.closed_at) return false;
        const itemDate = new Date(item.closed_at);
        return itemDate >= cutoffDate;
      } else {
        let itemDate = null;
        
        if (item.chat_created_at) {
          if (item.chat_created_at > 1000000000000) {
            itemDate = new Date(item.chat_created_at);
          } else {
            itemDate = new Date(item.chat_created_at * 1000);
          }
        } else if (item.created_at) {
          if (item.created_at > 1000000000000) {
            itemDate = new Date(Number(item.created_at));
          } else {
            itemDate = new Date(item.created_at * 1000);
          }
        } else if (item.timestamp) {
          if (item.timestamp > 1000000000000) {
            itemDate = new Date(item.timestamp);
          } else {
            itemDate = new Date(item.timestamp * 1000);
          }
        } else if (item.updated_time) {
          if (item.updated_time > 1000000000000) {
            itemDate = new Date(item.updated_time);
          } else {
            itemDate = new Date(item.updated_time * 1000);
          }
        }
        
        if (!itemDate) return false;
        return itemDate >= cutoffDate;
      }
    });
  }, []);

  // Aplicar filtros globais
  const applyGlobalFilters = useCallback((data) => {
    let filteredData = data;
    filteredData = filterDataByPeriod(filteredData);
    filteredData = filterDataBySector(filteredData, data.users);
    filteredData = filterDataByChannel(filteredData);
    return filteredData;
  }, [filterDataByPeriod, filterDataBySector, filterDataByChannel]);

  // Calcular KPIs
  const kpis = useMemo(() => {
    if (!data.closedChats?.length || !data.statusList?.length) {
      return {
        conversionRate: 0,
        avgResolutionTime: 0,
        totalVolume: 0,
        slaCompliance: 94
      };
    }

    const conversionFilteredChats = filterDataByPeriod(data.closedChats, true);
    
    const conversionFilteredBySector = filterDataBySector(conversionFilteredChats, data.users);
    
    const conversionFilteredByChannel = filterDataByChannel(conversionFilteredBySector);
    
    const statusSuccessMap = {};
    data.statusList.forEach(s => {
      statusSuccessMap[s.value] = s.success;
    });

    const ganhos = conversionFilteredByChannel.filter(c => {
      const isSuccess = statusSuccessMap[c.status] === true;
      return isSuccess;
    });
    
    const totalChats = conversionFilteredByChannel.length;
    const conversionRate = totalChats > 0 ? (ganhos.length / totalChats) * 100 : 0;
    
    const resolutionTimes = conversionFilteredChats
      .filter(c => c.created_at && c.closed_at)
      .map(c => {
        try {
          let createdTimeUnix;
          if (c.created_at > 1000000000000) {
            createdTimeUnix = Math.floor(c.created_at / 1000);
          } else {
            createdTimeUnix = c.created_at;
          }
          
          const closedTimeUnix = Math.floor(new Date(c.closed_at).getTime() / 1000);
          const diffMinutes = (closedTimeUnix - createdTimeUnix) / 60;
          
          if (diffMinutes >= 0 && diffMinutes <= 43200) {
            return diffMinutes;
          } else {
            return null;
          }
        } catch (error) {
          return null;
        }
      })
      .filter(time => time !== null);

    const avgResolutionTime = resolutionTimes.length > 0 
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length 
      : 0;
    
    return {
      conversionRate: Math.round(conversionRate * 100) / 100,
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
      totalVolume: conversionFilteredByChannel.length,
      slaCompliance: 94
    };
  }, [data.closedChats, data.statusList, filterDataByPeriod, filterDataBySector, filterDataByChannel]);

  // Calcular Live Ops
  const liveOps = useMemo(() => {
    const onlineUsers = data.users?.filter(u => u.online && u.permission === 'user').length || 0;
    const activeQueues = data.queues?.length || 0;
    
    return {
      onlineUsers,
      activeQueues,
      activeChats: data.activeChats?.length || 0,
      avgResponseTime: 8
    };
  }, [data.users, data.queues, data.activeChats]);

  // Calcular Performance
  const performance = useMemo(() => {
    if (!data.closedChats?.length) {
      return {
        hourlyVolume: [],
        userRanking: [],
        channelDistribution: [],
        conversionByChannel: []
      };
    }

    const filteredChats = filterDataByLast7Days(data.closedChats);
    let finalFilteredChats = filterDataByPeriod(data.closedChats, true);
    finalFilteredChats = filterDataBySector(finalFilteredChats, data.users);
    finalFilteredChats = filterDataByChannel(finalFilteredChats);

    const userStats = {};
    finalFilteredChats.forEach(chat => {
      if (chat.user_id) {
        userStats[chat.user_id] = (userStats[chat.user_id] || 0) + 1;
      }
    });

    const userRanking = Object.entries(userStats)
      .map(([userId, count]) => ({
        userId,
        name: data.userNames?.[userId] || `Usuário ${userId}`,
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      hourlyVolume: [],
      userRanking,
      channelDistribution: [],
      conversionByChannel: []
    };
  }, [data.closedChats, data.userNames, filterDataByLast7Days, filterDataByPeriod, filterDataBySector, filterDataByChannel]);

  // Calcular volume diário
  const dailyVolume = useMemo(() => {
    const allChats = [...(data.activeChats || []), ...(data.closedChats || [])];
    if (allChats.length === 0) return [12, 8, 15, 25, 18, 10, 5];

    const last7DaysChats = filterDataByLast7Days(allChats, false);
    const dailyData = [0, 0, 0, 0, 0, 0, 0];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    last7DaysChats.forEach(chat => {
      let chatDate = null;
      
      if (chat.created_at) {
        if (chat.created_at > 1000000000000) {
          chatDate = new Date(Number(chat.created_at));
        } else {
          chatDate = new Date(chat.created_at * 1000);
        }
      } else if (chat.timestamp) {
        if (chat.timestamp > 1000000000000) {
          chatDate = new Date(chat.timestamp);
        } else {
          chatDate = new Date(chat.timestamp * 1000);
        }
      } else if (chat.updated_time) {
        if (chat.updated_time > 1000000000000) {
          chatDate = new Date(chat.updated_time);
        } else {
          chatDate = new Date(chat.updated_time * 1000);
        }
      }

      if (chatDate) {
        chatDate.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - chatDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 0 && diffDays < 7) {
          const index = 6 - diffDays;
          if (index >= 0 && index < 7) {
            dailyData[index]++;
          }
        }
      }
    });

    return dailyData;
  }, [data.activeChats, data.closedChats, filterDataByLast7Days]);

  return {
    kpis,
    liveOps,
    performance,
    dailyVolume,
    applyGlobalFilters,
    filterDataByPeriod,
    filterDataBySector,
    filterDataByChannel,
    filterDataByLast7Days
  };
};

export default useDashboardFilters;
