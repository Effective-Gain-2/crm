import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './assets/style.css';
import logo from './assets/effective-gain_logo.png';
import { useTheme } from './assets/js/useTheme';
import { useEffect } from 'react';
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import { useToast } from '../contexts/ToastContext';


function Redirecionar(){
  const navigate = useNavigate()

  useEffect(()=>{
    navigate('/')
  }, [navigate])
}

// Removendo o refresh token automático fora do componente
// Será movido para dentro do componente Login

function Login() {
  const { showError } = useToast();
  const [errorCount, setErrorCount] = useState(0);
  const [recaptchaValue, setRecaptchaValue] = useState(null);
  const [theme, setTheme] = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const url = process.env.REACT_APP_URL;


  useEffect(() => {
    const rememberedCredentials = JSON.parse(localStorage.getItem('rememberedCredentials')) || {};
    if (rememberedCredentials[username]) {
      setPassword(rememberedCredentials[username]);
      setRememberMe(true);
    } else {
      setPassword('');
      setRememberMe(false);
    }
  }, [username]);


  
const handleLogin = async (e) => {
  e.preventDefault();
  setLoading(true); 

 if (errorCount >= 5 && !recaptchaValue) {
      setLoading(false);
      showError('Por favor, resolva o reCAPTCHA.');
      return;
    }

  try {
    const url = process.env.REACT_APP_URL;
    const response = await axios.post(`${url}/api/login`, {
      email: username,  
      password,
      recaptcha: recaptchaValue,
    }, { withCredentials: true });


    if (response.data.success) {
       
      const userData = {
        id: response.data.user.id,
        username: response.data.user.name,
        role: response.data.user.permission,
        empresa: response.data.company.company_name,
        schema: response.data.company.schema_name,
      };
      localStorage.setItem('user', JSON.stringify(userData));

      const rememberedCredentials = JSON.parse(localStorage.getItem('rememberedCredentials')) || {};
      if (rememberMe) {
        rememberedCredentials[username] = password;
      } else {
        delete rememberedCredentials[username];
      }
      localStorage.setItem('rememberedCredentials', JSON.stringify(rememberedCredentials));
      setErrorCount(0);
      setTimeout(() => {
        setLoading(false);
        if (userData.role === 'admin') {
          navigate('/painel');
        } else if (userData.role === 'tecnico') {
          navigate('/schemas');
        } else {
          navigate('/painel');
        }
      }, 5000);
    } else {
      setLoading(false);
      setErrorCount(prev => prev + 1);
      const senhaIncorretaElement = document.getElementById("senhaIncorreta");
      if (senhaIncorretaElement) {
        senhaIncorretaElement.classList.remove("d-none");
      }
    }
  } catch (err) {
    setErrorCount(prev => prev + 1);
    setLoading(false);
    const senhaIncorretaElement = document.getElementById("senhaIncorreta");
    if (senhaIncorretaElement) {
      senhaIncorretaElement.classList.remove("d-none");
    }
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

            <div id="senhaIncorreta" className="pb-3 d-flex justify-content-center text-danger d-none">Login e/ou senha incorretos, tente novamente.</div>

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
                  Lembrar senha
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
            {errorCount >= 5 && (
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
                style={loading ? { backgroundColor: 'transparent' } : {}}
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
              
              {/* <div className="text-center my-3">
                <span className={`text-muted ext-label-${theme}`}>ou</span>
              </div>
              
              <button
                type="button"
                className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2"
                onClick={() => window.location.href = `${url}/auth/google-login`}
                disabled={loading}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Entrar com Google
              </button> */}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
