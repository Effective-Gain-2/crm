import React from 'react';
import { useToast } from '../contexts/ToastContext';
import './Toast.css';

const Toast = () => {
  const { toasts, removeToast } = useToast();

  const getToastIcon = (type) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return 'ℹ';
    }
  };

  const getToastClass = (type) => {
    switch (type) {
      case 'success':
        return 'toast-success';
      case 'error':
        return 'toast-error';
      case 'warning':
        return 'toast-warning';
      case 'info':
        return 'toast-info';
      default:
        return 'toast-info';
    }
  };

  return (
    <div className="toast-container">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className={`toast ${getToastClass(toast.type)}`}
          onClick={() => removeToast(toast.id)}
          style={{ 
            position: 'fixed',
            top: `${20 + (index * 80)}px`,
            right: '20px',
            backgroundColor: toast.type === 'error' ? '#fef2f2' : '#f0fdf4',
            color: toast.type === 'error' ? '#dc2626' : '#16a34a',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            minWidth: '300px',
            maxWidth: '400px',
            display: 'flex',
            alignItems: 'center',
            zIndex: 99999,
            animation: 'slideIn 0.3s ease-out'
          }}
        >
          <div style={{ fontSize: '18px', marginRight: '12px', fontWeight: 'bold' }}>
            {getToastIcon(toast.type)}
          </div>
          <div style={{ flex: 1, fontSize: '14px', lineHeight: 1.4 }}>
            {toast.message}
          </div>
          <button
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              marginLeft: '8px',
              opacity: 0.7
            }}
            onClick={(e) => {
              e.stopPropagation();
              removeToast(toast.id);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast; 