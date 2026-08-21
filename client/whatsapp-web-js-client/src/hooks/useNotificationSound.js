import { useRef, useCallback, useState, useEffect } from 'react';

const MUTE_STORAGE_KEY = 'notificationSoundMuted';
const MUTE_CHANGE_EVENT = 'notification-sound-mute-change';

// A preferência é do usuário, mas fica em cache local para valer já no
// primeiro render (antes da resposta do banco). O cache é separado por
// usuário para não vazar entre contas na mesma máquina.
const getStorageKey = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.id ? `${MUTE_STORAGE_KEY}:${user.id}` : MUTE_STORAGE_KEY;
  } catch (error) {
    return MUTE_STORAGE_KEY;
  }
};

const normalizeMuted = (value) => value === true || value === 'true';

// Lê a preferência salva no navegador (padrão: som ligado)
const readMutedFromStorage = () => {
  try {
    return localStorage.getItem(getStorageKey()) === 'true';
  } catch (error) {
    console.warn('Erro ao ler preferência de som de notificação:', error);
    return false;
  }
};

/**
 * @param {object}   [options]
 * @param {boolean}  [options.mutedPreference] preferência do usuário vinda do banco
 * @param {function} [options.onMutedChange]   persiste a preferência do usuário
 */
const useNotificationSound = ({ mutedPreference, onMutedChange } = {}) => {
  const audioRef = useRef(null);
  const [isMuted, setIsMuted] = useState(readMutedFromStorage);
  // Espelha o estado em uma ref para que playNotificationSound não precise ser recriado
  const isMutedRef = useRef(isMuted);
  // Depois que o usuário decide nesta sessão, a resposta do banco não sobrescreve
  const hasLocalChoiceRef = useRef(false);
  const onMutedChangeRef = useRef(onMutedChange);

  useEffect(() => {
    onMutedChangeRef.current = onMutedChange;
  }, [onMutedChange]);

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

  const applyMuted = useCallback((muted, { persist }) => {
    const value = Boolean(muted);

    try {
      localStorage.setItem(getStorageKey(), String(value));
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

    if (persist && typeof onMutedChangeRef.current === 'function') {
      onMutedChangeRef.current(value);
    }

    window.dispatchEvent(new Event(MUTE_CHANGE_EVENT));
  }, []);

  // Aplica a preferência do usuário assim que ela chega do banco
  useEffect(() => {
    if (mutedPreference === undefined || mutedPreference === null) return;
    if (hasLocalChoiceRef.current) return;

    const value = normalizeMuted(mutedPreference);
    if (value === isMutedRef.current) return;

    applyMuted(value, { persist: false });
  }, [mutedPreference, applyMuted]);

  const setMuted = useCallback((muted) => {
    hasLocalChoiceRef.current = true;
    applyMuted(muted, { persist: true });
  }, [applyMuted]);

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
