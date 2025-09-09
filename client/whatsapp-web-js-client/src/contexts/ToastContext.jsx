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

  const showError = useCallback((message) => {
    showToast(message, 'error');
  }, [showToast]);

  const showSuccess = useCallback((message) => {
    showToast(message, 'success');
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