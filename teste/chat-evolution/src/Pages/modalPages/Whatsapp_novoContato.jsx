import React, { useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import InputMask from 'react-input-mask';
import axios from 'axios';

function WhatsappNovoContatoModal({ theme, show, onHide, onSave }) {
  const [nome, setNome] = useState('');
  const [numero, setNumero] = useState('');
  const [qrCode, setQrCode] = useState(null);
  const [status, setStatus] = useState('aguardando'); // aguardando, conectando, conectado, erro

  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;

  const handleClose = () => {
    if (onHide) onHide();
  };

    useEffect(() => {
    if (show) {
      setNome('');
      setNumero('');
      setQrCode(null);
      setStatus('aguardando');
    }
  }, [show]);


  // Gera QR Code sem limpar os campos
  const handleGenerateQrCode = async () => {
    if (!nome || !numero) {
      console.error('Preencha todos os campos obrigatórios.');
      return;
    }

    const numeroLimpo = numero.replace(/\D/g, '');
    if (numeroLimpo.length !== 12) {
      console.error('Número inválido para EvolutionAPI.');
      return;
    }

    setStatus('conectando');
    setQrCode(null);

    try {
      console.log(nome, numeroLimpo)
      const response = await axios.post(`${url}/evo/instance`, {
        instanceName: nome,
        number: numeroLimpo,
        schema: schema
      });
      // Supondo que o QR Code vem em response.data.result.qrcode.base64
      if (response.data?.result?.qrcode?.base64) {
        setQrCode(response.data.result.qrcode.base64);
        setStatus('conectando'); // Mantém status enquanto não conectar
      } else {
        setQrCode(null);
        setStatus('erro');
      }
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      setQrCode(null);
      setStatus('erro');
    }
  };

  // Salva o contato (chame seu backend de /connection/create aqui se desejar)
  const handleSave = async () => {
    if (!nome || !numero) {
      console.error('Preencha todos os campos obrigatórios.');
      return;
    }

    const numeroLimpo = numero.replace(/\D/g, '');
    if (numeroLimpo.length !== 12) {
      console.error('Número inválido para EvolutionAPI.');
      return;
    }

    try {
      // Aqui você pode chamar o endpoint de salvar contato, se necessário
      // Exemplo:
      // const response = await axios.post(`${url}/connection/create`, {
      //   name: nome,
      //   number: numeroLimpo,
      //   schema: schema
      // });
      if (onSave) {
        onSave({ name: nome, number: numeroLimpo });
      }
      setNome('');
      setNumero('');
      setQrCode(null);
      setStatus('aguardando');
      handleClose();
    } catch (error) {
      console.error('Erro ao salvar contato:', error);
      setStatus('erro');
    }
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
          <h5 className={`modal-title header-text-${theme}`}>Novo Contato WhatsApp</h5>
        </div>
      </Modal.Header>
      
      <Modal.Body style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <div className="d-flex flex-column gap-3">
          {/* Botão Voltar */}
          <div>
            <button
              type="button"
              className={`btn btn-2-${theme}`}
              onClick={onHide}
            >
              <i className="bi bi-arrow-left me-2"></i>
              Voltar
            </button>
          </div>

          {/* Nome do Contato */}
          <div className="mb-3">
            <label htmlFor="nomeContato" className={`form-label card-subtitle-${theme}`}>
              Nome do Contato
            </label>
            <input
              type="text"
              className={`form-control input-${theme}`}
              id="nomeContato"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite um nome para identificar este contato"
            />
          </div>

          {/* Número do WhatsApp */}
          <div className="mb-3">
            <label htmlFor="numeroWhatsapp" className={`form-label card-subtitle-${theme}`}>
              Número do WhatsApp
            </label>
            <InputMask
              mask="+55 (99) 9999-9999"
              className={`form-control input-${theme}`}
              id="numeroWhatsapp"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="+55 (__) ____-____"
            />
          </div>

          {/* QR Code */}
          <div className="mb-3">
            <label className={`form-label card-subtitle-${theme}`}>
              QR Code
            </label>
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
                  <div className={`card-subtitle-${theme}`}>
                    Gerando QR Code...
                  </div>
                </div>
              )}
              {qrCode && (
                <img
                  src={qrCode}
                  alt="QR Code"
                  style={{ maxWidth: '200px', maxHeight: '200px', filter: 'grayscale(1) contrast(2)' }}
                />
              )}
              {status === 'erro' && (
                <div className="text-danger">
                  <i className="bi bi-x-circle-fill fs-1"></i>
                  <div className={`card-subtitle-${theme}`}>
                    Erro ao gerar QR Code. Tente novamente.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <button
          type="button"
          className={`btn btn-1-${theme}`}
          onClick={handleGenerateQrCode}
          disabled={
            !nome ||
            !numero ||
            status === 'conectando' ||
            status === 'conectado' ||
            numero.replace(/\D/g, '').length !== 12
          }
        >
          Gerar QR Code
        </button>
        <button
          type="button"
          className={`btn btn-1-${theme}`}
          onClick={handleSave}
          disabled={!nome || !numero || !qrCode || numero.replace(/\D/g, '').length !== 12}
        >
          Salvar
        </button>
      </Modal.Footer>
    </Modal>
  );
}

WhatsappNovoContatoModal.defaultProps = {
  show: false,
  onHide: () => {},
};

export default WhatsappNovoContatoModal;