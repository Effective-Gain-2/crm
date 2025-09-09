import { useRef, useCallback } from 'react';

const useNotificationSound = () => {
  const audioRef = useRef(null);

  const playNotificationSound = useCallback(() => {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(error => {
          console.warn('Erro ao tocar som de notificação:', error);
        });
      }
    } catch (error) {
      console.warn('Erro ao tocar som de notificação:', error);
    }
  }, []);

  const setNotificationSound = useCallback((audioUrl) => {
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
    }
  }, []);

  return {
    playNotificationSound,
    setNotificationSound,
    audioRef
  };
};

export default useNotificationSound; 