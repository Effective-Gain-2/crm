import { useEffect, useRef } from 'react';
import io from 'socket.io-client';

const useOnlineStatus = (userId, schema) => {
  const socketRef = useRef(null);
  const isVisibleRef = useRef(true);

  useEffect(() => {
    if (!userId || !schema) return;

    // Conectar ao socket
    socketRef.current = io('http://localhost:3333');

    // Função para enviar status de visibilidade
    const sendVisibilityStatus = (isVisible) => {
      if (socketRef.current && socketRef.current.connected) {
        console.log(`📡 Enviando status: ${isVisible ? 'online' : 'offline'} para usuário ${userId}`);
        socketRef.current.emit('page_visibility_change', {
          isVisible,
          userId,
          schema
        });
      } else {
        console.log('❌ Socket não conectado, não foi possível enviar status');
      }
    };

    // Função para lidar com mudanças de visibilidade
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      
      console.log(`👁️ Mudança de visibilidade detectada: ${isVisible ? 'visível' : 'oculto'}`);
      
      if (isVisibleRef.current !== isVisible) {
        isVisibleRef.current = isVisible;
        sendVisibilityStatus(isVisible);
      }
    };

    // Função para lidar com antes de descarregar a página
    const handleBeforeUnload = () => {
      console.log('🚪 Página sendo fechada, marcando como offline');
      sendVisibilityStatus(false);
    };

    // Event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Conectar ao socket e enviar login
    socketRef.current.on('connect', () => {
      console.log('🔗 Conectado ao socket de status online');
      
      // Enviar evento de login do usuário
      socketRef.current.emit('user_login', { userId, schema });
      
      // Enviar status inicial
      sendVisibilityStatus(!document.hidden);
    });

    // Limpeza
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [userId, schema]);
};

export default useOnlineStatus; 