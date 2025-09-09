import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';

function AgendarMensagemModal({ show, onHide, theme, selectedChat }) {
  const [clienteNome, setClienteNome] = useState('');
  const [dataAgendamento, setDataAgendamento] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { showError, showSuccess } = useToast();
  
  
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;

  const now = new Date();
  const pad = n => n.toString().padStart(2, '0');
  const minDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

  useEffect(() => {
    if (show && selectedChat) {
      setClienteNome(selectedChat.contact_name || selectedChat.contact_phone || 'Cliente');
      setDataAgendamento('');
      setMensagem('');
      setError('');
    }
  }, [show, selectedChat]);

  const handleSalvar = async () => {
    if (!dataAgendamento || !mensagem.trim()) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    const dataSelecionada = new Date(dataAgendamento);
    const agora = new Date();
    
    if (dataSelecionada <= agora) {
      showError('A data de agendamento deve ser futura');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${url}/chat/schedule-message`, {
        chat_id: selectedChat.id,
        instance: selectedChat.connection_id,
        message: mensagem,
        contact_phone: selectedChat.contact_phone,
        timestamp: Math.floor(dataSelecionada.getTime() / 1000),
        user:userData.id,
        schema: schema,
      },
        {
      withCredentials: true
    });

      if (response.data.success) {
        onHide();
        setClienteNome('');
        setDataAgendamento('');
        setMensagem('');
        setError('');
        showSuccess('Mensagem agendada com sucesso')
      } else {
        showError(response.data.message || 'Erro ao agendar mensagem');
      }
    } catch (error) {
      console.error('Erro ao agendar mensagem:', error);
      setError('Erro ao agendar mensagem. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = () => {
    setClienteNome('');
    setDataAgendamento('');
    setMensagem('');
    setError('');
    onHide();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCancelar();
    }
  };

  if (!show) return null;

  return (
    <div 
      className="modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1050,
        overflowY: 'auto',
      }}
      onClick={handleBackdropClick}
    >
      <div 
        className="modal-dialog modal-md"
        style={{
          margin: 0,
          maxWidth: '600px',
          width: '98%',
          borderRadius: '16px',
          boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
          background: 'transparent',
          padding: 0,
          overflow: 'visible',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content" style={{ 
          backgroundColor: `var(--bg-color-${theme})`,
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
          overflow: 'hidden',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div className="modal-header gap-3" style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px', paddingLeft: 0, paddingRight: 0, paddingTop: 0 }}>
            <i className={`bi bi-clock header-text-${theme}`}></i>
            <h5 className={`modal-title header-text-${theme}`}>
              Agendar Mensagem
            </h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={handleCancelar}
              aria-label="Fechar"
            ></button>
          </div>

          <div className="modal-body" style={{ overflowY: 'auto', padding: 0 }}>
            <div className="mb-3">
              <span className={`form-label card-subtitle-${theme}`}>Cliente: <b>{clienteNome}</b></span>
            </div>

            <div className="mb-3">
              <label htmlFor="dataAgendamento" className={`form-label card-subtitle-${theme}`}>
                Data e Hora do Agendamento *
              </label>
              <input
                type="datetime-local"
                className={`form-control input-${theme}`}
                id="dataAgendamento"
                value={dataAgendamento}
                onChange={(e) => setDataAgendamento(e.target.value)}
                min={minDate}
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="mensagem" className={`form-label card-subtitle-${theme}`}>
                Mensagem *
              </label>
              <textarea
                className={`form-control input-${theme}`}
                id="mensagem"
                rows="4"
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Digite a mensagem que será enviada..."
                maxLength="1000"
                required
              ></textarea>
              <div className="form-text">
                {mensagem.length}/1000 caracteres
              </div>
            </div>

            {error && (
              <div className="alert alert-danger py-2 px-3 small" role="alert">
                {error}
              </div>
            )}
          </div>

          <div className="modal-footer" style={{ borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', paddingLeft: 0, paddingRight: 0, paddingBottom: 0 }}>
             <div className="modal-footer" style={{ borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', paddingLeft: 0, paddingRight: 0, paddingBottom: 0 }}>
  <button
    type="button"
    className={`btn btn-1-${theme}`}
    onClick={handleSalvar}
    disabled={loading || !dataAgendamento || !mensagem.trim()}
  >
    {loading ? (
      <>
        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        Agendando...
      </>
    ) : (
      'Agendar Mensagem'
    )}
  </button>
  <button
    type="button"
    className={`btn btn-2-${theme} ms-2`} 
    onClick={handleCancelar}
    disabled={loading}
  >
    Cancelar
  </button>
</div>
           
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgendarMensagemModal; 