import React, { useEffect, useState } from 'react';
import axios from 'axios';

function ListaAgendamentosModal({ show, onHide, theme, selectedChat, onAgendarNovaMensagem }) {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [agendamentoParaExcluir, setAgendamentoParaExcluir] = useState(null);
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;

  useEffect(() => {
    if (show && selectedChat) {
      buscarAgendamentos();
    }
  }, [show, selectedChat]);

  const buscarAgendamentos = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${url}/chat/scheduled-messages/${selectedChat.id}/${schema}`, {
        params: {
          chat_id: selectedChat.id,
          schema: schema
        },
      withCredentials: true
      },
      );
      setAgendamentos(response.data.result || []);
    } catch (err) {
      setError('Erro ao buscar agendamentos.');
      setAgendamentos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = (agendamento) => {
    setAgendamentoParaExcluir(agendamento);
    setShowDeleteModal(true);
  };

  const handleConfirmarExclusao = async () => {
    if (!agendamentoParaExcluir) return;
    setLoading(true);
    try {
      await axios.delete(`${url}/chat/scheduled-message/${agendamentoParaExcluir.id}/${schema}`, {
        data: {
          id: agendamentoParaExcluir.id,
          schema: schema
        },
      withCredentials: true

      });
      setShowDeleteModal(false);
      setAgendamentoParaExcluir(null);
      buscarAgendamentos();
    } catch (err) {
      setError('Erro ao excluir agendamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelarExclusao = () => {
    setShowDeleteModal(false);
    setAgendamentoParaExcluir(null);
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
      onClick={onHide}
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
        onClick={e => e.stopPropagation()}
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
            <h5 className={`modal-title header-text-${theme}`}>Mensagens Agendadas</h5>
            <button 
              type="button" 
              className="btn btn-1-light ms-auto"
              onClick={onAgendarNovaMensagem}
            >
              Agendar nova mensagem
            </button>
            <button 
              type="button" 
              className="btn-close ms-2" 
              onClick={onHide}
              aria-label="Fechar"
            ></button>
          </div>

          <div className="modal-body" style={{ overflowY: 'auto', padding: 0 }}>
            {loading && <div>Carregando...</div>}
            {error && <div className="alert alert-danger py-2 px-3 small" role="alert">{error}</div>}
            {!loading && agendamentos.length === 0 && <div>Nenhuma mensagem agendada.</div>}
            {agendamentos.length > 0 && (
              <div style={{overflowX: 'auto'}}>
                <table className="table table-bordered table-hover mb-0" style={{background: 'var(--bg-color-light)', borderRadius: 8, minWidth: 400, marginTop: 18}}>
                  <thead style={{background: '#f8f9fa'}}>
                    <tr>
                      <th style={{fontWeight: 600, color: '#555', fontSize: 15, width: '60%'}}>Mensagem</th>
                      <th style={{fontWeight: 600, color: '#555', fontSize: 15, minWidth: 120, textAlign: 'center'}}>Data</th>
                      <th style={{fontWeight: 600, color: '#555', fontSize: 15, width: 60, textAlign: 'center'}}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agendamentos.map(ag => (
                      <tr key={ag.id} style={{verticalAlign: 'middle'}}>
                        <td style={{maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500}}>{ag.message}</td>
                        <td style={{minWidth: 120, textAlign: 'center', fontSize: 13, color: '#666'}}>
                          {ag.scheduled_date && !isNaN(ag.scheduled_date) ? new Date(ag.scheduled_date * 1000).toLocaleString('pt-BR') : '--'}
                        </td>
                        <td style={{textAlign: 'center'}}>
                          <button className="btn btn-link p-0" style={{color: '#dc3545'}} onClick={() => handleExcluir(ag)} title="Excluir">
                            <i className="bi bi-trash" style={{fontSize: '1.2rem'}}></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal de confirmação de exclusão */}
        {showDeleteModal && (
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
              zIndex: 1100,
            }}
            onClick={handleCancelarExclusao}
          >
            <div className="modal-dialog modal-md" style={{ margin: 0, maxWidth: '400px', width: '98%' }} onClick={e => e.stopPropagation()}>
              <div className="modal-content" style={{ backgroundColor: `var(--bg-color-${theme})`, borderRadius: '16px', padding: '24px' }}>
                <div className="modal-header gap-3" style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                  <i className="bi bi-trash text-danger"></i>
                  <h5 className={`modal-title header-text-${theme}`}>Excluir Agendamento</h5>
                  <button type="button" className="btn-close ms-auto" onClick={handleCancelarExclusao} aria-label="Fechar"></button>
                </div>
                <div className="modal-body">
                  <p>Tem certeza que deseja excluir este agendamento?</p>
                  <div className="mb-2"><b>Mensagem:</b> {agendamentoParaExcluir?.message}</div>
                  <div className="mb-2">
                  <b>Data:</b>{" "}
                  {agendamentoParaExcluir
                    ? (() => {
                        const rawDate = agendamentoParaExcluir.scheduled_date ?? agendamentoParaExcluir.timestamp;
                        if (!rawDate || isNaN(rawDate)) return '';
                        const ms = Number(rawDate) < 20000000000 ? Number(rawDate) * 1000 : Number(rawDate);
                        return new Date(ms).toLocaleString('pt-BR');
                      })()
                    : ''}
                </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-danger" onClick={handleConfirmarExclusao} disabled={loading}>Confirmar</button>
                  <button className="btn btn-2-light ms-2" onClick={handleCancelarExclusao} disabled={loading}>Cancelar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ListaAgendamentosModal; 