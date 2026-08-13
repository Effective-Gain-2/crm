import React from 'react';
import { Navigate } from 'react-router-dom';

// Proteção de rota (camada de UX — a autoridade real é o servidor via JWT).
// requiredRole: papel mínimo (hierarquia operacional < lider < master < tecnico).
const ROLE_LEVEL = { operacional: 1, user: 1, lider: 2, master: 3, admin: 3, tecnico: 4 };

const ProtectedRoute = ({ children, requiredRole }) => {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch (e) { /* cache inválido */ }

  if (!user || !user.id) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole) {
    const level = ROLE_LEVEL[(user.role || '').toLowerCase()] || 1;
    if (level < (ROLE_LEVEL[requiredRole] || 99)) {
      return <Navigate to="/painel" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
