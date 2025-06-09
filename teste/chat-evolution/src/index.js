import React from 'react';
import ReactDOM from 'react-dom/client';
<<<<<<< HEAD:teste/chat-evolution/src/index.js
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
=======
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Login from './Pages/Login';
import App from './App';
import ChatPage from './Pages/Chats';
import DashboardCards from './Pages/Dashboard';
import UsuariosPage from './Pages/Usuarios';
import Painel from './Pages/Index';
import SchemasPage from './Pages/Schemas';
import reportWebVitals from './reportWebVitals';

// Importar estilos
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './index.css';

// Configurar o router
const router = createBrowserRouter([
  {
    path: "/home",
    element: <App />
  },
  {
    path: "/",
    element: <Login />
  },
  {
    path: "/painel", 
    element: <Painel />
  },
  {
    path: '/schemas',
    element: <SchemasPage/>
  }
]);

// Garantir que o elemento root existe
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

// Criar a raiz do React e renderizar a aplicação
const root = ReactDOM.createRoot(rootElement);

// Renderizar a aplicação com StrictMode
>>>>>>> 89c51aef05510833ad3e2e2c42e5cc405791adeb:client/whatsapp-web-js-client/src/index.js
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

<<<<<<< HEAD:teste/chat-evolution/src/index.js
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
=======
// Inicializar web vitals
reportWebVitals();
>>>>>>> 89c51aef05510833ad3e2e2c42e5cc405791adeb:client/whatsapp-web-js-client/src/index.js
