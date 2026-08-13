import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './assets/style.css';
import logo from './assets/effective-gain_logo.png';
import { useTheme } from './assets/js/useTheme';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import { useToast } from '../contexts/ToastContext';

function Login() {
  const { showError } = useToast();
  const [errorCount, setErrorCount] = useState(0);
  const [recaptchaValue, setRecaptchaValue] = useState(null);
  const [theme, setTheme] = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Etapa 2 — seleção de empresa (contas multi-empresa e técnico)
  const [companies, setCompanies] = useState(null);
  const [selecting, setSelecting] = useState(false);

  const navigate = useNavigate();
  const url = process.env.REACT_APP_URL;

  useEffect(() => {
    // Lembra apenas o e-mail (nunca a senha)
    const remembered = localStorage.getItem('rememberedEmail');
    if (remembered) {
      setUsername(remembered);
      setRememberMe(true);
    }
    // Migração: remove senhas em texto puro gravadas por versões antigas
    localStorage.removeItem('rememberedCredentials');
  }, []);

  const persistSession = (data) => {
    const userData = {
      id: data.user.id,
      username: data.user.name,
      role: data.role,
      empresa: data.company.company_name,
      schema: data.company.schema_name,
    };
    localStorage.setItem('user', JSON.stringify(userData));
    if (rememberMe) localStorage.setItem('rememberedEmail', username);
    else localStorage.removeItem('rememberedEmail');
    navigate('/painel');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    if (errorCount >= 5 && !recaptchaValue) {
      setLoading(false);
      showError('Por favor, resolva o reCAPTCHA.');
      return;
    }

    try {
      const response = await axios.post(`${url}/api/login`, {
        email: username,
        password,
        recaptcha: recaptchaValue,
      }, { withCredentials: true });

      if (response.data.success && response.data.needsSelection) {
        setCompanies(response.data.companies || []);
        setLoading(false);
        return;
      }
      if (response.data.success) {
        setErrorCount(0);
        persistSession(response.data);
        return;
      }
      throw new Error('login falhou');
    } catch (err) {
      setErrorCount(prev => prev + 1);
      setLoading(false);
      const apiMsg = err.response?.data?.error;
      setErrorMsg(apiMsg || 'Login e/ou senha incorretos, tente novamente.');
    }
  };

  const handleSelectCompany = async (companyId) => {
    setSelecting(true);
    setErrorMsg('');
    try {
      const response = await axios.post(`${url}/api/select-company`, { company_id: companyId }, { withCredentials: true });
      if (response.data.success) {
        persistSession(response.data);
        return;
      }
      throw new Error('seleção falhou');
    } catch (err) {
      setSelecting(false);
      setErrorMsg(err.response?.data?.error || 'Não foi possível entrar nesta empresa.');
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(newTheme);
    document.cookie = `theme=${newTheme}`;
    setTheme(newTheme);
  };

  return (
    <div
      className={`d-flex justify-content-center align-items-center bg-screen-${theme}`}
      style={{ height: '100vh', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="w-100 h-100 d-flex flex-column justify-content-center align-items-center">
        <div className="w-60 w-md-40 mb-4 d-flex justify-content-center align-items-center">
          <img src={logo} className="w-50" alt="Logo" />
        </div>

        <div className={`col-9 col-md-8 col-lg-6 col-xl-4 max-w-450 p-4 bg-form-${theme} rounded shadow`}>
          {companies ? (
            /* ---- Etapa 2: escolher a empresa ---- */
            <div>
              <h6 className={`mb-3 header-text-${theme}`}>
                <i className="bi bi-buildings me-2"></i>Escolha a empresa
              </h6>
              {errorMsg && <div className="pb-3 text-danger small">{errorMsg}</div>}
              <div className="d-flex flex-column gap-2" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                {companies.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={selecting}
                    onClick={() => handleSelectCompany(c.id)}
                    className={`btn btn-2-${theme} d-flex align-items-center justify-content-between text-start`}
                  >
                    <span className="text-truncate">
                      <i className="bi bi-building me-2"></i>{c.company_name}
                    </span>
                    <span className="badge bg-secondary-subtle text-secondary-emphasis text-capitalize">{c.role}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={`btn btn-link mt-3 p-0 ext-label-${theme}`}
                onClick={() => { setCompanies(null); setPassword(''); }}
              >
                <i className="bi bi-arrow-left me-1"></i>Voltar
              </button>
            </div>
          ) : (
            /* ---- Etapa 1: credenciais ---- */
            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <div className="input-group mb-3">
                  <span className={`input-group-text igt-${theme}`} id="basic-addon1">
                    <i className="bi bi-person"></i>
                  </span>
                  <input
                    type="email"
                    className={`form-control input-${theme}`}
                    placeholder="E-mail"
                    aria-describedby="basic-addon1"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>
              <div className="mb-3">
                <div className="input-group mb-3">
                  <span className={`input-group-text igt-${theme}`} id="basic-addon2">
                    <i className="bi bi-key"></i>
                  </span>
                  <input
                    type="password"
                    className={`form-control input-${theme}`}
                    placeholder="Senha"
                    aria-describedby="basic-addon2"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="pb-3 d-flex justify-content-center text-danger">{errorMsg}</div>
              )}

              <div className="d-flex justify-content-around align-items-center mb-3">
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                  />
                  <label className={`form-check-label ext-label-${theme}`} htmlFor="rememberMe">
                    Lembrar e-mail
                  </label>
                </div>
                <button
                  type="button"
                  className={`btn btn-2-${theme} toggle-${theme}`}
                  onClick={toggleTheme}
                >
                  <i className={`${theme === 'light' ? `bi-sun` : `bi-moon-stars`}`}></i>
                </button>
              </div>
              {errorCount >= 5 && process.env.REACT_APP_RECAPTCHA_SITE_KEY && process.env.REACT_APP_RECAPTCHA_SITE_KEY !== 'PREENCHER' && (
                <div className="mb-3">
                  <ReCAPTCHA
                    sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
                    onChange={setRecaptchaValue}
                  />
                </div>
              )}
              <div className="d-flex flex-column">
                <button
                  type="submit"
                  className={`btn btn-primary btn-1-${theme}`}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
