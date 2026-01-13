import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Login from './Pages/Login';
import App from './App';
import ChatPage from './Pages/Chats';
import DashboardCards from './Pages/Dashboard';
import UsuariosPage from './Pages/Usuarios';
import Painel from './Pages/Index';
import SchemasPage from './Pages/Schemas';
import reportWebVitals from './reportWebVitals';
import { ToastProvider } from './contexts/ToastContext';
import Toast from './Componentes/Toast';
import ToastWrapper from './Componentes/ToastWrapper';

import './utils/axiosConfig';
import { setToastCallback } from './utils/axiosConfig';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './index.css';
import { PrivateRoute } from './contexts/PrivateRoute';
import { AuthProvider } from './contexts/AuthContext';

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
    element: (
      <PrivateRoute>
        <Painel />
      </PrivateRoute>
    )
  },
  {
    path: '/schemas',
    element: <SchemasPage/>
  }
]);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

const root = ReactDOM.createRoot(rootElement);

root.render(

    <AuthProvider>
    <ToastProvider>
      <ToastWrapper>
        <RouterProvider router={router} />
        <Toast />
      </ToastWrapper>
    </ToastProvider>
    </AuthProvider>

);

reportWebVitals();