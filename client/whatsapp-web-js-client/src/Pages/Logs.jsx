import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';

function LogsPage({ theme }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showError } = useToast();
  
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;

  useEffect(() => {
    fetchLogs();
  }, [schema, url]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      // Ajuste a URL da API conforme necessário
      const response = await axios.get(`${url}/api/logs/${schema}`, {
        withCredentials: true
      });
      
      // Ajuste conforme a estrutura da resposta da API
      const logsData = Array.isArray(response.data.data) ? response.data.data : (response.data?.data || []);
      setLogs(logsData);
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
      showError('Erro ao carregar logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Data não disponível';
    try {
      const date = new Date(Number(dateString));
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className={`bg-screen-${theme} w-100 h-100`}>
      <div className="container-fluid py-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className={`text-${theme === 'light' ? 'dark' : 'light'}`}>Logs do Sistema</h4>
          <button 
            className={`btn btn-2-${theme}`}
            onClick={fetchLogs}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise me-2"></i>
            Atualizar
          </button>
        </div>

        {loading ? (
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className={`card border-${theme} card-${theme}`}>
            <div className="card-body text-center py-5">
              <i className="bi bi-inbox" style={{ fontSize: '48px', opacity: 0.5 }}></i>
              <p className="mt-3 mb-0">Nenhum log encontrado</p>
            </div>
          </div>
        ) : (
          <div className={`card border-${theme} card-${theme}`}>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className={`table table-hover mb-0`}>
                  <thead className={`bg-form-${theme}`}>
                    <tr>
                      <th className={`text-${theme === 'light' ? 'dark' : 'light'}`} style={{ width: '30%' }}>Usuário</th>
                      <th className={`text-${theme === 'light' ? 'dark' : 'light'}`} style={{ width: '40%' }}>Ação</th>
                      <th className={`text-${theme === 'light' ? 'dark' : 'light'}`} style={{ width: '30%' }}>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, index) => (
                      <tr key={log.id || index} className={`border-${theme}`}>
                        <td className={`text-${theme === 'light' ? 'dark' : 'light'}`}>
                          {log.username || log.user_name || log.usuario || 'Usuário não identificado'}
                        </td>
                        <td className={`text-${theme === 'light' ? 'dark' : 'light'}`}>
                          {log.action || log.acao || log.descricao || 'Ação não especificada'}
                        </td>
                        <td className={`text-${theme === 'light' ? 'dark' : 'light'}`}>
                          {formatDate(log.date || log.created_at || log.data)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LogsPage;


