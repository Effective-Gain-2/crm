import axios from 'axios';

// ============================================================================
// Configuração GLOBAL do axios — todo `import axios from 'axios'` do app passa
// por aqui (importado uma vez em src/index.js).
//
// Regras:
//  1. Toda requisição tem timeout (sem isso, um backend reiniciando deixava
//     botões em "carregando" PARA SEMPRE, sem mensagem).
//  2. Nenhum erro é silencioso: rede/timeout/5xx/403 viram toast (com dedupe).
//  3. 401 fora das rotas de autenticação → tenta UM refresh e repete a chamada;
//     se falhar, avisa e volta ao login.
//  4. 401/400 NAS rotas de autenticação (login, seleção de empresa, troca de
//     senha) ficam com a própria tela — antes o interceptor RECARREGAVA a
//     página no meio, engolindo o "senha incorreta".
//  5. `config.silent = true` desliga o toast de uma chamada específica.
// ============================================================================

axios.defaults.withCredentials = true;
axios.defaults.timeout = 20000;

// Callback do toast (registrado pelo ToastWrapper dentro do ToastProvider)
let showErrorToast = (message) => {
  console.error('Toast não disponível:', message);
};
export const setToastCallback = (callback) => {
  showErrorToast = callback;
};

// Dedupe: Promise.all de várias chamadas não pode virar chuva de toasts iguais
let ultimoToast = { msg: '', ts: 0 };
const toastErro = (msg) => {
  const agora = Date.now();
  if (msg === ultimoToast.msg && agora - ultimoToast.ts < 3000) return;
  ultimoToast = { msg, ts: agora };
  showErrorToast(msg);
};

// Rotas cujo erro é tratado pela própria tela (o interceptor não intervém)
const ROTAS_DE_AUTH = ['/api/login', '/api/select-company', '/api/refresh-token', '/api/change-password'];
const ehRotaDeAuth = (url = '') => ROTAS_DE_AUTH.some((p) => String(url).includes(p));

// Refresh único compartilhado (várias chamadas 401 simultâneas → um só refresh)
let isRefreshing = false;
let failedQueue = [];
const processQueue = (error) => {
  failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve()));
  failedQueue = [];
};

const sessaoExpirou = (error) => {
  try { localStorage.removeItem('user'); } catch (e) { /* noop */ }
  toastErro('Sessão expirada — entre novamente.');
  // pequeno atraso para o toast aparecer antes da navegação
  setTimeout(() => { window.location.href = '/'; }, 800);
  return Promise.reject(error);
};

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const cfg = error.config || {};

    // ---- Sem resposta: rede caiu, timeout ou servidor reiniciando (deploy) ----
    if (!error.response) {
      if (!cfg.silent) {
        toastErro(
          error.code === 'ECONNABORTED'
            ? 'O servidor demorou a responder. Aguarde alguns segundos e tente de novo.'
            : 'Sem resposta do servidor. Verifique a conexão e tente novamente.'
        );
      }
      return Promise.reject(error);
    }

    const status = error.response.status;
    const msgApi = error.response.data?.error || error.response.data?.message;

    // ---- Rotas de auth: a tela cuida (Login/seleção/troca de senha) ----
    if (ehRotaDeAuth(cfg.url)) {
      return Promise.reject(error);
    }

    // ---- 401 fora do login: tenta UM refresh e repete a chamada original ----
    if (status === 401 && !cfg._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => axios({ ...cfg, _retry: true }))
          .catch((err) => Promise.reject(err));
      }

      cfg._retry = true;
      isRefreshing = true;
      try {
        const r = await axios.post(
          `${process.env.REACT_APP_URL}/api/refresh-token`,
          {},
          { withCredentials: true, silent: true }
        );
        isRefreshing = false;
        if (r.data?.success) {
          processQueue(null);
          return axios(cfg);
        }
        processQueue(error);
        return sessaoExpirou(error);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError);
        return sessaoExpirou(error);
      }
    }
    if (status === 401) {
      // refresh já tentado e ainda 401
      return sessaoExpirou(error);
    }

    // ---- Demais erros com resposta: toast informativo (a tela ainda recebe o reject) ----
    if (!cfg.silent) {
      if (status === 403) toastErro(msgApi || 'Você não tem permissão para esta ação.');
      else if (status >= 500) toastErro(msgApi || 'Erro no servidor. Tente novamente em instantes.');
      else toastErro(msgApi || `Não foi possível concluir a ação (erro ${status}).`);
    }

    return Promise.reject(error);
  }
);

export default axios;
