import React, { useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { setToastCallback } from '../utils/axiosConfig';

const ToastWrapper = ({ children }) => {
  const { showError } = useToast();

  useEffect(() => {
    // Conectar o toast com o axios
    setToastCallback(showError);
  }, [showError]);

  return <>{children}</>;
};

export default ToastWrapper; 