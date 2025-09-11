// Arquivo convertido para React.
// Componentes divididos por funcionalidade e estados gerenciados por hooks.
// Bibliotecas como bootstrap podem ser usadas com react-bootstrap ou direto via classes.

import { useEffect, useState } from 'react';
import { Tooltip } from 'bootstrap';

export function useTheme() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const cookies = document.cookie.split('; ');
    let currentTheme = 'light';

    cookies.forEach(cookie => {
      const [name, value] = cookie.split('=');
      if (name === 'theme') currentTheme = value;
    });

    document.body.classList.remove('light', 'dark');
    document.body.classList.add(currentTheme);
    setTheme(currentTheme);
  }, []);

  return [theme, setTheme];
  
}

export function SidebarToggle({ expanded, setExpanded }) {
  const toggleSidebar = () => {
    setExpanded(!expanded);
  };

  return (
    <button onClick={toggleSidebar} id="toggleSidebar">
      <i className={`bi ${expanded ? 'bi-arrow-bar-left' : 'bi-arrow-bar-right'}`}></i>
    </button>
  );
}

export function PasswordValidation({ password }) {
  const checks = {
    maiuscula: /[A-Z]/.test(password),
    minuscula: /[a-z]/.test(password),
    numero: /\d/.test(password),
    simbolo: /[@#$%&]/.test(password),
    caractere: password.length >= 8
  };

  return (
    <ul className="ul-pw">
      {Object.entries(checks).map(([key, valid]) => (
        <li key={key} id={key} className={valid ? 'checked' : ''}>
          <i className={valid ? 'checked' : ''}></i> {key}
        </li>
      ))}
    </ul>
  );
}

export function PasswordConfirm({ password, confirmPassword }) {
  const valid = password === confirmPassword && confirmPassword !== '';

  return (
    <ul className="ul-pw2">
      <li id="confirm" className={valid ? 'checked' : 'hidden'}>
        <i className={valid ? 'checked' : 'hidden'}></i> Confirmado
      </li>
    </ul>
  );
}

export function MoneyToggleCard({ value, theme }) {
  const [hidden, setHidden] = useState(true);

  return (
    <div className="col-md-3">
      <div className={`money-${theme} ${hidden ? 'money-hidden' : ''}`}>{value}</div>
      <button className="toggle-money-btn" onClick={() => setHidden(!hidden)}>
        <i className={`bi ${hidden ? 'bi-eye-slash' : 'bi-eye'}`}></i>
      </button>
    </div>
  );
}

export function useTooltips() {
  useEffect(() => {
    const tooltips = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltips.map(el => new Tooltip(el));
  }, []);
}

// Para listas, rankings, carregamento de dados, deve-se usar fetch com useEffect + useState
// Recomenda-se separar componentes: Sidebar, Dashboard, PageLoader, ThemeContext, etc.
// Esse arquivo serve de exemplo de estrutura para adaptação gradual do projeto.