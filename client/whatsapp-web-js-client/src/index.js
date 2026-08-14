import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Login from './Pages/Login';
import ChatPage from './Pages/Chats';
import UsuariosPage from './Pages/Usuarios';
import Painel from './Pages/Index';
import SchemasPage from './Pages/Schemas';
import ProtectedRoute from './Componentes/ProtectedRoute';
import reportWebVitals from './reportWebVitals';
import { ToastProvider } from './contexts/ToastContext';
import Toast from './Componentes/Toast';
import ToastWrapper from './Componentes/ToastWrapper';
import ErrorBoundary from './Componentes/ErrorBoundary';

// Importar configuração global do axios
import './utils/axiosConfig';
import { setToastCallback } from './utils/axiosConfig';

// Importar estilos
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './index.css';

// Configurar o router
const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />
  },
  {
    path: "/painel",
    element: <ProtectedRoute><Painel /></ProtectedRoute>
  },
  {
    path: '/schemas',
    element: <ProtectedRoute requiredRole="tecnico"><SchemasPage/></ProtectedRoute>
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
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <ToastWrapper>
          <RouterProvider router={router} />
          <Toast />
        </ToastWrapper>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Inicializar web vitals
reportWebVitals();