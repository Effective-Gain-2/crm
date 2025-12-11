import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'error', duration = 5000) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      message,
      type,
      duration
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove toast after duration
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const showError = useCallback((code) => {
    switch (code) {
      case 401:
        code = 'Erro 401: Não autorizado. Verifique suas credenciais.';
        break;
    case 403:
        code = 'Erro 403: Acesso proibido. Você não tem permissão para acessar este recurso.';
        break;
      case 404:
        code = 'Erro 404: Recurso não encontrado. Verifique a URL ou o recurso solicitado.';
        break;
      case 500:
        code = 'Erro 500: Erro interno do servidor. Entre em contato com o suporte.';
        break;
    }
    showToast(code, 'error');
  }, [showToast]);

  const showSuccess = useCallback((code) => {
    switch (code) {
      case 200:
        code = 'Sucesso: A solicitação foi bem-sucedida.';
        break;
      case 201:
        code = 'Sucesso: Recurso criado com sucesso.';
        break;
    }
    showToast(code, 'success');
  }, [showToast]);

  const showWarning = useCallback((message) => {
    showToast(message, 'warning');
  }, [showToast]);

  const showInfo = useCallback((message) => {
    showToast(message, 'info');
  }, [showToast]);

  const value = {
    toasts,
    showToast,
    showError,
    showSuccess,
    showWarning,
    showInfo,
    removeToast
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}; 