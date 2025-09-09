import { useState, useEffect } from 'react';
import axios from 'axios';

const useUserPreferences = () => {
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem('userPreferences');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Erro ao carregar preferências:', error);
      return {};
    }
  });

  const [userData] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch (error) {
      return null;
    }
  });

  const url = process.env.REACT_APP_URL;

  // Carregar preferências do banco de dados
  const loadPreferencesFromDB = async () => {
    if (!userData?.id) return;
    
    try {
      const response = await axios.get(`${url}/preferences/get-user-preference/${userData.id}/${userData.schema}`,
        {
          withCredentials:true
        }
      );
      const dbPreferences = response.data || {};
      
      // Mesclar preferências do banco com localStorage
      const mergedPreferences = {
        ...preferences,
        ...dbPreferences
      };
      
      setPreferences(mergedPreferences);
      localStorage.setItem('userPreferences', JSON.stringify(mergedPreferences));
    } catch (error) {
      console.error('Erro ao carregar preferências do banco:', error);
    }
  };

  // Salvar preferência no banco de dados
  const savePreferenceToDB = async (key, value) => {
    if (!userData?.id) return;
    
    try {
      await axios.post(`${url}/preferences/set-preference`, {
        user_id: userData.id,
        key: key,
        value: typeof value === 'object' ? JSON.stringify(value) : value,
        schema: userData.schema,
        userRole:userData.role || userData.permission
      });
    } catch (error) {
      console.error('Erro ao salvar preferência no banco:', error);
    }
  };

  // Carregar preferências do banco ao inicializar
  useEffect(() => {
    loadPreferencesFromDB();
  }, [userData?.id]);

  const savePreferences = (newPreferences) => {
    try {
      const updatedPreferences = {
        ...preferences,
        ...newPreferences,
        lastUpdated: Date.now()
      };
      localStorage.setItem('userPreferences', JSON.stringify(updatedPreferences));
      setPreferences(updatedPreferences);

      // Salvar no banco de dados
      Object.entries(newPreferences).forEach(([key, value]) => {
        if (key !== 'lastUpdated') {
          savePreferenceToDB(key, value);
        }
      });
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
    }
  };

  const updatePage = (page) => {
    savePreferences({ currentPage: page });
  };

  const updateChatsTab = (tab) => {
    savePreferences({ chatsTab: tab });
  };

  const updateKanbanFunnel = (funnel) => {
    savePreferences({ kanbanFunnel: funnel });
  };

  const clearPreferences = () => {
    try {
      localStorage.removeItem('userPreferences');
      setPreferences({});
    } catch (error) {
      console.error('Erro ao limpar preferências:', error);
    }
  };

  return {
    preferences,
    savePreferences,
    updatePage,
    updateChatsTab,
    updateKanbanFunnel,
    clearPreferences,
    loadPreferencesFromDB
  };
};

export default useUserPreferences; 