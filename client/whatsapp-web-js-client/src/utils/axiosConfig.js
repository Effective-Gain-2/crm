import axios from 'axios';

// Definir baseURL dinâmico para funcionar com nginx
const baseURL = process.env.NODE_ENV === 'development'
  ? process.env.REACT_APP_URL
  : '/api';

// Criar instância de axios centralizada
export const api = axios.create({
  baseURL,
  withCredentials: true
});

// Função para exibir toast de erro (será definida globalmente)
let showErrorToast = (message) => {
  console.error('Toast não disponível:', message);
};

// Função para definir o callback do toast
export const setToastCallback = (callback) => {
  showErrorToast = callback;
};

// Variável para controlar se já está fazendo refresh
let isRefreshing = false;
let failedQueue = [];

// Função para processar a fila de requisições falhadas
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Interceptor de resposta para tratar erros 401
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Se já está fazendo refresh, adiciona à fila
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await api.post('/api/refresh-token', {});

        if (response.data.success) {
          processQueue(null, response.data.token);
          return api(originalRequest);
        } else {
          processQueue(error, null);
          // Redirecionar para login se refresh falhou
          localStorage.removeItem('user');
          window.location.href = '/';
          return Promise.reject(error);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Redirecionar para login se refresh falhou
        localStorage.removeItem('user');
        window.location.href = '/';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Exibir toast de erro apenas para erros do servidor
    if (error.response) {
      // Erro do servidor com resposta
      const errorMessage = error.response.data?.message || error.response.data?.error || 'Erro no servidor';
      showErrorToast(errorMessage);
    }

    return Promise.reject(error);
  }
);

export default api; 