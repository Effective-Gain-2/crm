import React, { useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import InputMask from 'react-input-mask';
import axios from 'axios';
import { socket } from '../../socket';

function WhatsappNovoContatoModal({ theme, show, onHide, onSave }) {
  const [nome, setNome] = useState('');
  const [numero, setNumero] = useState('');
  const [qrCode, setQrCode] = useState(null);
  const [status, setStatus] = useState('aguardando'); // aguardando, conectando, conectado, erro
  const [errorMsg, setErrorMsg] = useState('');
  const [connectionId, setConnectionId] = useState(null);
  const [connectionName, setConnectionName] = useState(null);
  const [socketInstance] = useState(() => socket());

  const url = process.env.REACT_APP_URL;

  // Número BR: 55 + DDD + 8 ou 9 dígitos (12–13 no total)
  const numeroLimpo = numero.replace(/\D/g, '');
  const numeroValido = numeroLimpo.length === 12 || numeroLimpo.length === 13;

  const handleClose = () => {
    if (onHide) onHide();
  };

  useEffect(() => {
    if (show) {
      setNome('');
      setNumero('');
      setQrCode(null);
      setStatus('aguardando');
      setErrorMsg('');
      setConnectionId(null);
      setConnectionName(null);
    }
  }, [show]);

  // Conexão em tempo real: quando o usuário escaneia, o webhook CONNECTION_UPDATE
  // atualiza o status e este modal mostra "Conectado".
  useEffect(() => {
    const handleStatus = ({ connection_name, status: st }) => {
      if (connectionName && connection_name === connectionName && st === 'connected') {
        setStatus('conectado');
      }
    };
    const handleQr = ({ connection_name, base64 }) => {
      if (connectionName && connection_name === connectionName && base64) {
        setQrCode(base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`);
      }
    };
    socketInstance.on('connectionStatus', handleStatus);
    socketInstance.on('qrcodeUpdated', handleQr);
    return () => {
      socketInstance.off('connectionStatus', handleStatus);
      socketInstance.off('qrcodeUpdated', handleQr);
    };
  }, [socketInstance, connectionName]);

  // Cria a instância na Evolution e mostra o QR
  const handleGenerateQrCode = async () => {
    if (!nome || !numeroValido) return;
    setStatus('conectando');
    setQrCode(null);
    setErrorMsg('');

    try {
      const response = await axios.post(`${url}/evo/instance`, {
        instanceName: nome,
        number: numeroLimpo,
      }, { withCredentials: true });

      const qr = response.data?.result?.qrcode?.base64;
      setConnectionId(response.data?.result?.instance?.instanceId || null);
      setConnectionName(response.data?.connection_name || null);
      if (qr) {
        setQrCode(qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`);
        setStatus('conectando');
      } else {
        setStatus('erro');
        setErrorMsg('A Evolution não retornou um QR Code.');
      }
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      setStatus('erro');
      setErrorMsg(error.response?.data?.error || 'Erro ao gerar QR Code. Tente novamente.');
    }
  };

  // QR expira (~40s) — busca um novo sem recriar a instância
  const handleRefreshQr = async () => {
    if (!connectionId) return handleGenerateQrCode();
    setErrorMsg('');
    try {
      const response = await axios.get(`${url}/evo/qr/${connectionId}`, { withCredentials: true });
      if (response.data?.connected) {
        setStatus('conectado');
        return;
      }
      const qr = response.data?.qrcode;
      if (qr) {
        setQrCode(qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`);
        setStatus('conectando');
      } else {
        setErrorMsg('Não foi possível obter um novo QR. Tente novamente.');
      }
    } catch (error) {
      setErrorMsg(error.response?.data?.error || 'Erro ao renovar o QR.');
    }
  };

  const handleSave = () => {
    if (onSave) onSave({ name: nome, number: numeroLimpo });
    handleClose();
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      backdrop="static"
      style={{ zIndex: 1060 }}
    >
      <Modal.Header closeButton style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <div className="d-flex align-items-center gap-3">
          <i className={`bi bi-whatsapp header-text-${theme}`}></i>
          <h5 className={`modal-title header-text-${theme}`}>Nova Conexão WhatsApp</h5>
        </div>
      </Modal.Header>

      <Modal.Body style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <div className="d-flex flex-column gap-3">
          <div className="mb-3">
            <label htmlFor="nomeContato" className={`form-label card-subtitle-${theme}`}>
              Nome da Conexão
            </label>
            <input
              type="text"
              className={`form-control input-${theme}`}
              id="nomeContato"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Comercial, Suporte, Vendas"
              disabled={status === 'conectando' || status === 'conectado'}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="numeroWhatsapp" className={`form-label card-subtitle-${theme}`}>
              Número do WhatsApp
            </label>
            <InputMask
              mask="+55 (99) 99999-9999"
              className={`form-control input-${theme}`}
              id="numeroWhatsapp"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="+55 (__) _____-____"
              disabled={status === 'conectando' || status === 'conectado'}
            />
            {numero && !numeroValido && (
              <small className="text-danger">Informe DDI+DDD+número (12 ou 13 dígitos).</small>
            )}
          </div>

          <div className="mb-3">
            <label className={`form-label card-subtitle-${theme}`}>QR Code</label>
            <div className={`p-4 border rounded input-${theme} text-center`} style={{ minHeight: '200px' }}>
              {status === 'aguardando' && (
                <div className={`card-subtitle-${theme}`}>
                  Clique em "Gerar QR Code" para iniciar a conexão
                </div>
              )}
              {status === 'conectando' && !qrCode && (
                <div className="d-flex flex-column align-items-center gap-2">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Carregando...</span>
                  </div>
                  <div className={`card-subtitle-${theme}`}>Gerando QR Code...</div>
                </div>
              )}
              {status === 'conectado' && (
                <div className="text-success d-flex flex-column align-items-center gap-2">
                  <i className="bi bi-check-circle-fill fs-1"></i>
                  <div className={`card-subtitle-${theme}`}>WhatsApp conectado com sucesso!</div>
                </div>
              )}
              {status !== 'conectado' && qrCode && (
                <div className="d-flex flex-column align-items-center gap-2">
                  <img
                    src={qrCode}
                    alt="QR Code"
                    style={{ maxWidth: '220px', maxHeight: '220px' }}
                  />
                  <small className={`card-subtitle-${theme}`}>
                    Abra o WhatsApp → Aparelhos conectados → Conectar aparelho
                  </small>
                  <button type="button" className={`btn btn-sm btn-2-${theme}`} onClick={handleRefreshQr}>
                    <i className="bi bi-arrow-repeat me-1"></i>QR expirou? Gerar novo
                  </button>
                </div>
              )}
              {status === 'erro' && (
                <div className="text-danger">
                  <i className="bi bi-x-circle-fill fs-1"></i>
                  <div className={`card-subtitle-${theme}`}>{errorMsg || 'Erro ao gerar QR Code. Tente novamente.'}</div>
                </div>
              )}
            </div>
            {errorMsg && status !== 'erro' && <small className="text-danger">{errorMsg}</small>}
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <button type="button" className={`btn btn-2-${theme}`} onClick={handleClose}>
          {status === 'conectado' ? 'Concluir' : 'Cancelar'}
        </button>
        <button
          type="button"
          className={`btn btn-1-${theme}`}
          onClick={handleGenerateQrCode}
          disabled={!nome || !numeroValido || status === 'conectando' || status === 'conectado'}
        >
          Gerar QR Code
        </button>
        {status === 'conectado' && (
          <button type="button" className={`btn btn-1-${theme}`} onClick={handleSave}>
            Salvar
          </button>
        )}
      </Modal.Footer>
    </Modal>
  );
}

WhatsappNovoContatoModal.defaultProps = {
  show: false,
  onHide: () => {},
};

export default WhatsappNovoContatoModal;
