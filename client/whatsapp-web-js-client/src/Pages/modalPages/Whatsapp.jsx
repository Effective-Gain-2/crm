import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from 'react-bootstrap';
import WhatsappNovoContatoModal from './Whatsapp_novoContato';
import WhatsappDeleteModal from './Whatsapp_delete';
import WhatsappFilasModal from './Whatsapp_filas';
import { socket } from '../../socket';

import axios from 'axios';

// Badge de status real da conexão (alimentado pelo webhook CONNECTION_UPDATE da Evolution)
const StatusBadge = ({ status }) => {
  const map = {
    connected: { cls: 'bg-success-subtle text-success-emphasis', icon: 'bi-check-circle-fill', label: 'Conectado' },
    connecting: { cls: 'bg-warning-subtle text-warning-emphasis', icon: 'bi-arrow-repeat', label: 'Conectando' },
    disconnected: { cls: 'bg-danger-subtle text-danger-emphasis', icon: 'bi-x-circle-fill', label: 'Desconectado' },
  };
  const s = map[status] || map.disconnected;
  return (
    <span className={`badge ${s.cls}`}>
      <i className={`bi ${s.icon} me-1`}></i>{s.label}
    </span>
  );
};

function WhatsappModal({ theme, show, onHide }) {
  const [contatos, setContatos] = useState([]);
  const [selectedContato, setSelectedContato] = useState(null);
  const [showNovoContatoModal, setShowNovoContatoModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUsuariosModal, setShowUsuariosModal] = useState(false);
  const [socketInstance] = useState(() => socket());
  // Reconexão: QR de uma conexão JÁ existente (o QR do WhatsApp expira em segundos)
  const [qrConn, setQrConn] = useState(null);
  const [qrImg, setQrImg] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrErro, setQrErro] = useState('');
  // Painel de risco: quanto ja saiu hoje por numero, teto, pausa automatica e ajustes
  const [risco, setRisco] = useState([]);
  const [salvandoRisco, setSalvandoRisco] = useState(null);

  const url = process.env.REACT_APP_URL;

  const carregarRisco = useCallback(async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const { data } = await axios.get(`${url}/compliance/status/${userData?.schema}`, { withCredentials: true });
      setRisco(Array.isArray(data) ? data : []);
    } catch (err) {
      setRisco([]);
    }
  }, [url]);

  const configurarRisco = async (connectionId, mudanca) => {
    setSalvandoRisco(connectionId);
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const { data } = await axios.post(`${url}/compliance/configurar`,
        Object.assign({ connection_id: connectionId, schema: userData?.schema }, mudanca),
        { withCredentials: true });
      setRisco(Array.isArray(data) ? data : []);
    } catch (err) {
      // erro ja aparece pelo toast global do axiosConfig
    } finally {
      setSalvandoRisco(null);
    }
  };

  const abrirQr = useCallback(async (contato) => {
    setQrConn(contato); setQrImg(null); setQrErro(''); setQrLoading(true);
    try {
      const { data } = await axios.get(`${url}/evo/qr/${contato.id}`, { withCredentials: true });
      if (data?.connected) {
        setQrErro('Esta conexão já está conectada.');
        setContatos(prev => prev.map(c => (c.id === contato.id ? { ...c, status: 'connected' } : c)));
      } else if (data?.qrcode) {
        setQrImg(data.qrcode.startsWith('data:') ? data.qrcode : `data:image/png;base64,${data.qrcode}`);
      } else {
        setQrErro('A Evolution não devolveu o QR. Tente novamente em alguns segundos.');
      }
    } catch (e) {
      setQrErro(e.response?.data?.error || 'Erro ao gerar o QR.');
    } finally {
      setQrLoading(false);
    }
  }, [url]);

  const loadConns = useCallback(async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await axios.get(`${url}/connection/get-all-connections/${userData?.schema}`, { withCredentials: true });
      const list = Array.isArray(response.data) ? response.data : (response.data?.connections || response.data || []);
      setContatos(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error(error);
    }
  }, [url]);

  useEffect(() => {
    if (show) { loadConns(); carregarRisco(); }
  }, [show, loadConns, carregarRisco]);

  // Pausa automática / teto atingido chegam por socket: o painel se atualiza sozinho
  useEffect(() => {
    const handleAlerta = () => { if (show) carregarRisco(); };
    socketInstance.on('alertaCompliance', handleAlerta);
    return () => { socketInstance.off('alertaCompliance', handleAlerta); };
  }, [socketInstance, show, carregarRisco]);

  // Status em tempo real
  useEffect(() => {
    const handleStatus = ({ connection_name, status }) => {
      setContatos(prev => prev.map(c => (c.name === connection_name ? { ...c, status } : c)));
      // Conectou enquanto o QR estava aberto → fecha e avisa
      setQrConn(prev => {
        if (prev && prev.name === connection_name && status === 'connected') {
          setQrImg(null); setQrErro('Conectado com sucesso!');
        }
        return prev;
      });
    };
    // QR rotativo da Evolution: atualiza a imagem sem o usuário clicar de novo
    const handleQr = ({ connection_name, base64 }) => {
      setQrConn(prev => {
        if (prev && prev.name === connection_name && base64) {
          setQrImg(base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`);
          setQrErro('');
        }
        return prev;
      });
    };
    socketInstance.on('connectionStatus', handleStatus);
    socketInstance.on('qrcodeUpdated', handleQr);
    return () => {
      socketInstance.off('connectionStatus', handleStatus);
      socketInstance.off('qrcodeUpdated', handleQr);
    };
  }, [socketInstance]);

  const handleNovoContato = () => {
    // Recarrega do servidor (o estado real vem do backend — nada de status fake)
    loadConns();
    setShowNovoContatoModal(false);
  };

  const handleDelete = (contato) => {
    try {
      setContatos(contatos.filter(c => c.id !== contato.id));
    } catch (error) {
      console.error('Erro ao excluir contato:', error);
    } finally {
      setShowDeleteModal(false);
      setSelectedContato(null);
    }
  };

  const handleVerFilas = (contato) => {
    setSelectedContato(contato);
    setShowUsuariosModal(true);
  };

  const handleQueueChange = (contatoId, novaFilaId) => {
    setContatos(prevContatos =>
      prevContatos.map(contato =>
        contato.id === contatoId
          ? { ...contato, queue_id: novaFilaId }
          : contato
      )
    );
  };

  // Exibe o nome sem o prefixo técnico do schema
  const displayName = (name) => (name || '').includes('__') ? name.split('__').slice(1).join('__') : name;

  return (
    <>
      <Modal
        show={show}
        onHide={onHide}
        size="lg"
        centered
        backdrop="static"
        style={{ zIndex: 1050 }}
      >
        <Modal.Header closeButton style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <div className="d-flex align-items-center gap-3">
            <i className={`bi bi-whatsapp header-text-${theme}`}></i>
            <h5 className={`modal-title header-text-${theme} mb-0`}>Conexões WhatsApp</h5>
          </div>
        </Modal.Header>

        <Modal.Body style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <div className="d-flex justify-content-end mb-3">
            <button
              type="button"
              className={`btn btn-1-${theme}`}
              onClick={() => setShowNovoContatoModal(true)}
            >
              <i className="bi bi-plus-lg me-2"></i> Nova Conexão
            </button>
          </div>

          {/* ---- Painel de risco de bloqueio ----
              Mostra ao OPERADOR o que antes só existia na API: quanto já saiu hoje por
              número, o teto (automático pelo aquecimento ou manual), pausas automáticas
              e o interruptor de lista fria. Sem isso o controle existe e ninguém vê. */}
          {risco.length > 0 && (
            <div className={`card card-${theme} p-3 mb-3`}>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="d-flex align-items-center gap-2">
                  <i className="bi bi-shield-check text-success"></i>
                  <strong className={`header-text-${theme}`}>Risco de bloqueio</strong>
                </span>
                <button className={`btn btn-sm btn-2-${theme}`} onClick={carregarRisco} title="Atualizar">
                  <i className="bi bi-arrow-clockwise"></i>
                </button>
              </div>

              {risco.map((r) => {
                const pct = r.limite_diario ? Math.min(100, Math.round((r.enviados_hoje / r.limite_diario) * 100)) : 0;
                const cor = pct >= 100 ? '#dc3545' : pct >= 80 ? '#ffc107' : '#198754';
                const emPausa = r.em_pausa_ate && new Date(r.em_pausa_ate) > new Date();
                return (
                  <div key={r.id} className="mb-3 pb-3" style={{ borderBottom: `1px solid var(--border-color-${theme})` }}>
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                      <span className={`card-subtitle-${theme}`}>
                        <strong>{displayName(r.nome)}</strong>{r.numero ? ` · ${r.numero}` : ''}
                      </span>
                      <span className={`card-subtitle-${theme}`} style={{ fontSize: '0.85rem' }}>
                        {r.enviados_hoje} / {r.limite_diario} hoje
                        {r.limite_automatico && <span title="Teto calculado pela idade do número (aquecimento)"> · aquecimento</span>}
                        {r.bloqueados_hoje > 0 && <span style={{ color: '#dc3545' }}> · {r.bloqueados_hoje} bloqueado(s)</span>}
                      </span>
                    </div>

                    <div style={{ background: 'var(--border-color-light)', borderRadius: 6, height: 8, marginTop: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: cor, transition: 'width .3s' }} />
                    </div>

                    {emPausa && (
                      <div className="alert alert-danger py-2 px-3 mt-2 mb-0 d-flex align-items-center justify-content-between gap-2" style={{ fontSize: '0.85rem' }}>
                        <span>
                          <i className="bi bi-exclamation-triangle me-2"></i>
                          Envio pausado até {new Date(r.em_pausa_ate).toLocaleTimeString('pt-BR')} — {r.motivo_pausa || 'proteção automática'}
                        </span>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          disabled={salvandoRisco === r.id}
                          onClick={() => configurarRisco(r.id, { retomar: true })}
                        >
                          Retomar agora
                        </button>
                      </div>
                    )}

                    <div className="d-flex align-items-center gap-3 flex-wrap mt-2">
                      <div className="d-flex align-items-center gap-2">
                        <label className={`card-subtitle-${theme}`} style={{ fontSize: '0.8rem' }}>Teto diário</label>
                        <input
                          type="number"
                          min="0"
                          className={`form-control form-control-sm input-${theme}`}
                          style={{ width: 110 }}
                          placeholder="automático"
                          defaultValue={r.limite_automatico ? '' : r.limite_diario}
                          disabled={salvandoRisco === r.id}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            const atual = r.limite_automatico ? '' : String(r.limite_diario);
                            if (v !== atual) configurarRisco(r.id, { limite_diario: v === '' ? null : Number(v) });
                          }}
                          title="Vazio = teto automático pelo aquecimento do número"
                        />
                      </div>

                      <div className="form-check form-switch d-flex align-items-center gap-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`frios-${r.id}`}
                          checked={!!r.bloquear_frios}
                          disabled={salvandoRisco === r.id}
                          onChange={(e) => configurarRisco(r.id, { bloquear_frios: e.target.checked })}
                        />
                        <label className={`form-check-label card-subtitle-${theme}`} htmlFor={`frios-${r.id}`} style={{ fontSize: '0.8rem' }}>
                          Bloquear disparo para quem nunca respondeu
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}

              <small className={`card-subtitle-${theme}`} style={{ fontSize: '0.75rem' }}>
                O teto protege contra bloqueio da conta. Número novo começa baixo e sobe sozinho ao longo de 30 dias.
              </small>
            </div>
          )}

          <div className="table-responsive" style={{ maxHeight: 'calc(100vh - 250px)' }}>
            <table className={`custom-table-${theme} align-middle w-100`}>
              <thead>
                <tr>
                  <th className={`text-start px-3 py-2 header-text-${theme}`}>Nome</th>
                  <th className={`text-start px-3 py-2 header-text-${theme}`}>Telefone</th>
                  <th className={`text-start px-3 py-2 header-text-${theme}`}>Status</th>
                  <th className={`text-start px-3 py-2 header-text-${theme}`}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {contatos.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center px-3 py-2">
                      <span className={`card-subtitle-${theme}`}>Nenhuma conexão cadastrada.</span>
                    </td>
                  </tr>
                ) : (
                  contatos.map((contato) => (
                    <tr key={contato.id}>
                      <td className={`px-3 py-2 card-subtitle-${theme}`}>{displayName(contato.name)}</td>
                      <td className={`px-3 py-2 card-subtitle-${theme}`}>{contato.number}</td>
                      <td className="px-3 py-2"><StatusBadge status={contato.status} /></td>
                      <td className="px-3 py-2">
                        <div className="d-flex flex-wrap gap-2">
                          {contato.status !== 'connected' && (
                            <button
                              type="button"
                              className={`btn btn-sm btn-1-${theme}`}
                              title="Conectar / ver QR Code"
                              onClick={() => abrirQr(contato)}
                            >
                              <i className="bi bi-qr-code"></i>
                            </button>
                          )}

                          <button
                            type="button"
                            className={`btn btn-sm btn-2-${theme}`}
                            title="Filas"
                            onClick={() => handleVerFilas(contato)}
                          >
                            <i className="bi bi-diagram-3"></i>
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm delete-btn"
                            title="Excluir"
                            onClick={() => {
                              setSelectedContato(contato);
                              setShowDeleteModal(true);
                            }}
                          >
                            <i className="bi bi-trash-fill"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Modal.Body>

        <Modal.Footer style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <button type="button" className={`btn btn-2-${theme}`} onClick={onHide}>
            Fechar
          </button>
        </Modal.Footer>
      </Modal>

      {/* QR de reconexão — o QR do WhatsApp expira em segundos e a Evolution emite um novo por socket */}
      <Modal show={!!qrConn} onHide={() => { setQrConn(null); setQrImg(null); setQrErro(''); }} centered style={{ zIndex: 1070 }}>
        <Modal.Header closeButton style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <h5 className={`modal-title header-text-${theme} mb-0`}>
            <i className="bi bi-qr-code me-2"></i>Conectar {qrConn ? displayName(qrConn.name) : ''}
          </h5>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: `var(--bg-color-${theme})`, minHeight: 300 }}>
          <div className="d-flex flex-column align-items-center justify-content-center h-100">
            {qrLoading && <div className={`card-subtitle-${theme}`}>Gerando QR Code…</div>}
            {!qrLoading && qrImg && (
              <>
                <img src={qrImg} alt="QR Code do WhatsApp" style={{ width: 260, height: 260 }} />
                <p className={`card-subtitle-${theme} text-center mt-3 mb-0`}>
                  WhatsApp → <strong>Aparelhos conectados</strong> → <strong>Conectar aparelho</strong>.<br />
                  O código se renova sozinho; a tela avisa quando conectar.
                </p>
              </>
            )}
            {!qrLoading && !qrImg && qrErro && (
              <div className={`text-center card-subtitle-${theme}`}>
                <i className={`bi ${qrErro.includes('sucesso') ? 'bi-check-circle-fill text-success' : 'bi-exclamation-triangle-fill text-warning'} fs-1 d-block mb-2`}></i>
                {qrErro}
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <button type="button" className={`btn btn-2-${theme}`} onClick={() => qrConn && abrirQr(qrConn)} disabled={qrLoading}>
            <i className="bi bi-arrow-repeat me-2"></i>Gerar novo QR
          </button>
          <button type="button" className={`btn btn-1-${theme}`} onClick={() => { setQrConn(null); setQrImg(null); setQrErro(''); loadConns(); }}>
            Fechar
          </button>
        </Modal.Footer>
      </Modal>

      {showNovoContatoModal && (
        <div style={{ zIndex: 1060 }}>
          <WhatsappNovoContatoModal
            theme={theme}
            show={showNovoContatoModal}
            onHide={() => {
              setShowNovoContatoModal(false);
              setSelectedContato(null);
              loadConns();
            }}
            onSave={handleNovoContato}
          />
        </div>
      )}

      {showDeleteModal && selectedContato && (
        <div style={{ zIndex: 1060 }}>
          <WhatsappDeleteModal
            theme={theme}
            show={showDeleteModal}
            onHide={() => {
              setShowDeleteModal(false);
              setSelectedContato(null);
            }}
            contato={selectedContato}
            onDelete={handleDelete}
          />
        </div>
      )}

      {showUsuariosModal && selectedContato && (
        <div style={{ zIndex: 1060 }}>
          <WhatsappFilasModal
            theme={theme}
            show={showUsuariosModal}
            onHide={() => {
              setShowUsuariosModal(false);
              setSelectedContato(null);
            }}
            contato={selectedContato}
            onQueueChange={handleQueueChange}
          />
        </div>
      )}

    </>
  );
}

export default WhatsappModal;
