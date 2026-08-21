import { useRef, useCallback, useState, useEffect } from 'react';

const MUTE_STORAGE_KEY = 'notificationSoundMuted';
const MUTE_CHANGE_EVENT = 'notification-sound-mute-change';

// Lê a preferência de som salva no navegador (padrão: som ligado)
const readMutedFromStorage = () => {
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
  } catch (error) {
    console.warn('Erro ao ler preferência de som de notificação:', error);
    return false;
  }
};

const useNotificationSound = () => {
  const audioRef = useRef(null);
  const [isMuted, setIsMuted] = useState(readMutedFromStorage);
  // Espelha o estado em uma ref para que playNotificationSound não precise ser recriado
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    isMutedRef.current = isMuted;
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Mantém a preferência sincronizada entre abas e entre componentes
  useEffect(() => {
    const syncMuted = () => setIsMuted(readMutedFromStorage());

    window.addEventListener('storage', syncMuted);
    window.addEventListener(MUTE_CHANGE_EVENT, syncMuted);

    return () => {
      window.removeEventListener('storage', syncMuted);
      window.removeEventListener(MUTE_CHANGE_EVENT, syncMuted);
    };
  }, []);

  const setMuted = useCallback((muted) => {
    const value = Boolean(muted);

    try {
      localStorage.setItem(MUTE_STORAGE_KEY, String(value));
    } catch (error) {
      console.warn('Erro ao salvar preferência de som de notificação:', error);
    }

    isMutedRef.current = value;
    setIsMuted(value);

    // Interrompe um som que já esteja tocando ao silenciar
    if (value && audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (error) {
        console.warn('Erro ao interromper som de notificação:', error);
      }
    }

    window.dispatchEvent(new Event(MUTE_CHANGE_EVENT));
  }, []);

  const toggleMute = useCallback(() => {
    setMuted(!isMutedRef.current);
  }, [setMuted]);

  const playNotificationSound = useCallback(() => {
    if (isMutedRef.current) return;

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
    audioRef,
    isMuted,
    setMuted,
    toggleMute
  };
};

export default useNotificationSound;
