import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form, InputGroup } from 'react-bootstrap';
import axios from 'axios';

const NovoMotivoModal = ({ show, onHide, onCreate, theme, loading }) => {
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState('');
  const [success, setSuccess] = useState(true);

  useEffect(() => {
    if (!show) {
      setNome('');
      setErro('');
      setSuccess(true);
    }
  }, [show]);

  const handleSalvar = async () => {
    if (!nome.trim()) {
      setErro('Digite o nome do motivo');
      return;
    }
    setErro('');
    await onCreate(nome, success, setErro);
    setNome('');
  };

  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      centered 
      className={`modal-${theme} modal-novo-motivo`}
    >
      <Modal.Header 
        closeButton 
        style={{ backgroundColor: `var(--bg-color-${theme})` }}
      >
        <div className="d-flex align-items-center gap-3">
          <i className={`bi bi-plus-circle header-text-${theme}`}></i>
          <h5 className={`modal-title header-text-${theme} mb-0`}>
            Novo Motivo
          </h5>
        </div>
      </Modal.Header>

      <Modal.Body style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label className={`form-label card-subtitle-${theme}`}>
              Nome do Motivo
            </Form.Label>
            <Form.Control
              type="text"
              className={`form-control input-${theme}`}
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Digite o motivo"
              disabled={loading}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className={`form-label card-subtitle-${theme}`}>
              Tipo
            </Form.Label>
            <div className="d-flex gap-2">
              <Button
                variant={success ? 'success' : 'outline-secondary'}
                onClick={() => setSuccess(true)}
                className="flex-fill"
              >
                <i className="bi bi-check-circle me-2"></i>
                Ganho
              </Button>
              <Button
                variant={!success ? 'danger' : 'outline-secondary'}
                onClick={() => setSuccess(false)}
                className="flex-fill"
              >
                <i className="bi bi-x-circle me-2"></i>
                Perda
              </Button>
            </div>
          </Form.Group>

          {erro && (
            <div className="text-danger mb-2" style={{ fontSize: 14 }}>
              {erro}
            </div>
          )}
        </Form>
      </Modal.Body>

      <Modal.Footer style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <Button 
          variant="outline-secondary" 
          onClick={onHide} 
          disabled={loading}
          className="btn-2-light"
        >
          Cancelar
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSalvar} 
          disabled={loading || !nome.trim()}
          className={loading || !nome.trim() ? "btn-disabled" : "btn-1-light"}
          style={{
            background: loading || !nome.trim() ? 'transparent' : undefined,
            color: loading || !nome.trim() ? 'var(--placeholder-color)' : undefined,
            border: loading || !nome.trim() ? '1px solid var(--border-color-light)' : undefined
          }}
        >
          Salvar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

const CustomDropdownMotivo = ({ statusList, value, onChange, loading, theme }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef();

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const motivosGanho = statusList.filter(s => s.success === true && 
    (!search || (s.status || s.value || s.nome || s.label).toLowerCase().includes(search.toLowerCase())));
  const motivosPerda = statusList.filter(s => s.success === false && 
    (!search || (s.status || s.value || s.nome || s.label).toLowerCase().includes(search.toLowerCase())));

  function handleSelect(val) {
    onChange(val);
    setOpen(false);
  }

  function getLabel(val) {
    const found = statusList.find(s => (s.status || s.value || s.nome || s.label) === val);
    return found ? (found.status || found.value || found.nome || found.label) : '';
  }

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => setOpen(v => !v)}
        className={`form-control input-${theme}`}
        style={{
          cursor: loading ? 'not-allowed' : 'pointer',
          color: value ? `var(--color-${theme})` : 'var(--placeholder-color)',
          fontWeight: 500,
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 40,
          backgroundColor: `var(--bg-color-${theme})`,
          borderColor: `var(--border-color-${theme})`,
        }}
      >
        <span>{getLabel(value) || 'Selecione um motivo...'}</span>
        <i className="bi bi-chevron-down" style={{ fontSize: 14, color: 'var(--placeholder-color)' }}></i>
      </div>
      
      {open && (
        <div style={{
          position: 'absolute',
          top: '110%',
          left: 0,
          width: '100%',
          background: `var(--bg-color-${theme})`,
          border: `1px solid var(--border-color-${theme})`,
          borderRadius: 8,
          boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
          zIndex: 1000,
          maxHeight: 260,
          overflowY: 'auto',
        }}>
          <div style={{ padding: 12 }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar motivo..."
              className={`form-control input-${theme}`}
              style={{ fontSize: 14 }}
              autoFocus
            />
          </div>
          
          {motivosGanho.length > 0 && (
            <div style={{ 
              padding: '8px 16px', 
              fontSize: 12, 
              color: '#1dbf73', 
              fontWeight: 700, 
              background: 'rgba(168,255,176,0.10)' 
            }}>
              GANHO
            </div>
          )}
          
          {motivosGanho.map((s, idx) => (
            <div
              key={s.id || 'ganho-' + idx}
              onClick={() => handleSelect(s.status || s.value || s.nome || s.label)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                background: value === (s.status || s.value || s.nome || s.label)
                  ? 'linear-gradient(90deg, #a8ffb0 0%, #eafff0 100%)'
                  : 'transparent',
                color: value === (s.status || s.value || s.nome || s.label) ? '#0a3d2e' : `var(--color-${theme})`,
                fontWeight: value === (s.status || s.value || s.nome || s.label) ? 700 : 500,
                borderBottom: `1px solid var(--border-color-${theme})`,
                transition: 'all 0.15s',
                fontSize: 14,
              }}
              onMouseOver={e => {
                if (value !== (s.status || s.value || s.nome || s.label)) {
                  e.currentTarget.style.background = 'linear-gradient(90deg, rgba(168,255,176,0.22) 0%, rgba(168,255,176,0.32) 100%)';
                }
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = value === (s.status || s.value || s.nome || s.label)
                  ? 'linear-gradient(90deg, #a8ffb0 0%, #eafff0 100%)'
                  : 'transparent';
              }}
            >
              {s.status || s.value || s.nome || s.label}
            </div>
          ))}
          
          {motivosPerda.length > 0 && (
            <div style={{ 
              padding: '8px 16px', 
              fontSize: 12, 
              color: '#ff5252', 
              fontWeight: 700, 
              background: 'rgba(255,82,82,0.10)' 
            }}>
              PERDA
            </div>
          )}
          
          {motivosPerda.map((s, idx) => (
            <div
              key={s.id || 'perda-' + idx}
              onClick={() => handleSelect(s.status || s.value || s.nome || s.label)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                background: value === (s.status || s.value || s.nome || s.label)
                  ? 'linear-gradient(90deg, #ffd6d6 0%, #fff0f0 100%)'
                  : 'transparent',
                color: value === (s.status || s.value || s.nome || s.label) ? '#7a1a1a' : `var(--color-${theme})`,
                fontWeight: value === (s.status || s.value || s.nome || s.label) ? 700 : 500,
                borderBottom: `1px solid var(--border-color-${theme})`,
                transition: 'all 0.15s',
                fontSize: 14,
              }}
              onMouseOver={e => {
                if (value !== (s.status || s.value || s.nome || s.label)) {
                  e.currentTarget.style.background = 'linear-gradient(90deg, rgba(255,82,82,0.18) 0%, rgba(255,23,68,0.22) 100%)';
                }
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = value === (s.status || s.value || s.nome || s.label)
                  ? 'linear-gradient(90deg, #ffd6d6 0%, #fff0f0 100%)'
                  : 'transparent';
              }}
            >
              {s.status || s.value || s.nome || s.label}
            </div>
          ))}
          
          {motivosGanho.length === 0 && motivosPerda.length === 0 && (
            <div style={{ padding: 16, color: 'var(--placeholder-color)', textAlign: 'center', fontSize: 14 }}>
              Nenhum motivo encontrado
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const FinalizarAtendimentoModal = ({ show, onHide, theme, selectedChat, onFinish }) => {
  const [status, setStatus] = useState('');
  const [statusList, setStatusList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNovoMotivo, setShowNovoMotivo] = useState(false);
  const [loadingNovo, setLoadingNovo] = useState(false);

  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${url}/chat/get-status/${schema}`, { withCredentials: true });
      setStatusList(Array.isArray(res.data.result) ? res.data.result : []);
    } catch {
      setStatusList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (show && schema) {
      fetchStatus();
    }
    if (!show) {
      setStatus('');
      setError('');
    }
  }, [show, schema, url]);

  const handleFinalizar = async () => {
    if (!status) {
      setError('Selecione o motivo');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await axios.post(`${url}/chat/close`, {
        chat_id: selectedChat.id,
        schema,
        status
      }, { withCredentials: true });
      if (onFinish) onFinish();
      onHide();
    } catch (err) {
      setError('Erro ao finalizar atendimento');
    }
    setLoading(false);
  };

  const handleCreateMotivo = async (nome, success, setErro) => {
    setLoadingNovo(true);
    try {
      await axios.post(`${url}/chat/create-status`, {
        text: nome,
        success,
        schema
      }, { withCredentials: true });
      setShowNovoMotivo(false);
      await fetchStatus();
    } catch (err) {
      setErro('Erro ao criar motivo');
    }
    setLoadingNovo(false);
  };

  if (!show) return null;

  return (
    <>
      <Modal 
        show={show} 
        onHide={onHide} 
        centered 
        className={`modal-${theme} modal-50vw ${showNovoMotivo ? 'modal-blur' : ''}`}
      >
        <Modal.Header 
          closeButton 
          style={{ backgroundColor: `var(--bg-color-${theme})` }}
        >
          <div className="d-flex align-items-center gap-3">
            <i className={`bi bi-check-circle header-text-${theme}`}></i>
            <h5 className={`modal-title header-text-${theme} mb-0`}>
              Finalizar Atendimento
            </h5>
          </div>
        </Modal.Header>

        <Modal.Body style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label className={`form-label card-subtitle-${theme}`}>
                Motivo do Encerramento
              </Form.Label>
              <InputGroup>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <CustomDropdownMotivo
                    statusList={statusList}
                    value={status}
                    onChange={setStatus}
                    loading={loading}
                    theme={theme}
                  />
                </div>
                <Button 
                  variant="outline-primary" 
                  onClick={() => setShowNovoMotivo(true)} 
                  disabled={loadingNovo || loading}
                  className="btn-2-light"
                  style={{ marginLeft: 8 }}
                >
                  <i className="bi bi-plus-circle me-1"></i>
                  Novo
                </Button>
              </InputGroup>
            </Form.Group>

            {error && (
              <div className="text-danger mb-2" style={{ fontSize: 14 }}>
                {error}
              </div>
            )}
          </Form>
        </Modal.Body>

        <Modal.Footer style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <Button 
            variant="outline-secondary" 
            onClick={onHide} 
            disabled={loading}
            className="btn-2-light"
          >
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={handleFinalizar} 
            disabled={loading || !status}
            className={loading || !status ? "btn-disabled" : "btn-1-light"}
            style={{
              background: loading || !status ? 'transparent' : undefined,
              color: loading || !status ? 'var(--placeholder-color)' : undefined,
              border: loading || !status ? '1px solid var(--border-color-light)' : undefined
            }}
          >
            <i className="bi bi-check-circle me-1"></i>
            Finalizar
          </Button>
        </Modal.Footer>
      </Modal>

      <NovoMotivoModal
        show={showNovoMotivo}
        onHide={() => setShowNovoMotivo(false)}
        onCreate={handleCreateMotivo}
        theme={theme}
        loading={loadingNovo}
      />
    </>
  );
};

export default FinalizarAtendimentoModal; 