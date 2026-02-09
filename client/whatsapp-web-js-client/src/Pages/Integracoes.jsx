import React, { useState, useEffect } from 'react';
import { api } from '../utils/axiosConfig';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

function IntegracoesPage({ theme, onOpenWhatsappModal }) {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({ fullName: '', phone: '', integrationName: '', description: '' });
  const [showDeleteApiOfcModal, setShowDeleteApiOfcModal] = useState(false);
  const [apiOfcConnections, setApiOfcConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { showError, showSuccess } = useToast();
  
  const userData = useAuth().userData
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setRequestForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitRequest = (e) => {
    e.preventDefault();
    setShowRequestModal(false);
  };

  useEffect(() => {
    const fetchApiOfcConnections = async () => {
      if (showDeleteApiOfcModal && schema) {
        try {
          const res = await api.get(`/connection/get-all-connections/${schema}`);
          // Filtrar conexões API OFC - assumindo que todas as conexões podem ser API OFC
          // ou você pode adicionar um filtro específico se houver um campo que identifique
          setApiOfcConnections(Array.isArray(res.data) ? res.data : [res.data]);
        } catch (error) {
          console.error('Erro ao buscar conexões:', error);
          showError('Erro ao buscar conexões API OFC');
          setApiOfcConnections([]);
        }
      }
    };
    fetchApiOfcConnections();
  }, [showDeleteApiOfcModal, schema, url, showError]);

  const handleDeleteApiOfcData = async () => {
    if (!selectedConnection) {
      showError('Selecione uma conexão para apagar os dados');
      return;
    }

    setIsDeleting(true);
    try {
      const connection = apiOfcConnections.find(c => c.id === selectedConnection);
      if (!connection) {
        showError('Conexão não encontrada');
        return;
      }

      // Usar phone_id que é o campo phone da conexão
      const phoneId = connection.name || connection.id;
      
      await api.delete(`/connection/delete-api-ofc-data/${phoneId}/${schema}`);

      showSuccess('Dados da API OFC apagados com sucesso!');
      setShowDeleteApiOfcModal(false);
      setSelectedConnection('');
    } catch (error) {
      console.error('Erro ao apagar dados API OFC:', error);
      showError('Erro ao apagar dados da API OFC. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };
  const integrations = [
    {
      id: 'whatsapp-business',
      name: 'WhatsApp Business',
      installed: true,
      actionLabel: 'Configurar',
      onAction: () => {
        if (onOpenWhatsappModal) onOpenWhatsappModal();
      },
      headerStyle: { background: '#113b2d' },
      renderHeader: () => (
        <div className="h-100 w-100 d-flex align-items-center justify-content-start px-3 gap-2">
          <i className="bi bi-whatsapp" style={{ color: '#25D366', fontSize: 22 }}></i>
          <div className="fw-semibold" style={{ color: '#d8f3e9', fontSize: 14 }}>WhatsApp Web</div>
        </div>
      )
    },
    {
      id: 'whatsapp-cloud-api',
      name: 'WhatsApp Cloud API',
      installed: false,
      actionLabel: 'Configurar',
      onAction: () => {},
      headerStyle: { background: 'linear-gradient(45deg,black,gray)' },
      renderHeader: () => (
        <div className="h-100 w-100 d-flex align-items-center justify-content-start px-3 gap-2">
          <i className="bi bi-whatsapp" style={{ color: '#25D366', fontSize: 22 }}></i>
          <div className="fw-semibold" style={{ color: '#e7e7ff', fontSize: 14 }}>WhatsApp<br/>Cloud API</div>
        </div>
      )
    },
    {
      id: 'request-dev',
      name: 'Solicitar desenvolvimento de integração',
      installed: false,
      actionLabel: 'Configurar',
      onAction: () => setShowRequestModal(true),
      headerStyle: { background: '#243447' },
      renderHeader: () => (
        <div className="h-100 w-100 d-flex align-items-center justify-content-start px-3 gap-2">
          <i className="bi bi-tools" style={{ color: 'white', fontSize: 20 }}></i>
          <div className="fw-semibold" style={{ color: '#cfe2ff', fontSize: 14 }}>Solicitar<br/>Integração</div>
        </div>
      )
    }
  ];

  return (
    <div className={`bg-screen-${theme} w-100 h-100`}>
      <div className="container-fluid py-3">
        <div className="row g-3">
          {integrations.map(item => (
            <div key={item.id} className="col-12 col-sm-6 col-md-4 col-lg-3 col-xxl-2">
              <div className={`card border-${theme} card-${theme} h-100`}>
                <div className="w-100" style={{ height: 80, ...item.headerStyle }}>
                  {item.renderHeader()}
                </div>
                <div className="card-body d-flex flex-column py-2">
                  <h6 className="mb-2" style={{ fontSize: 14 }}>{item.name}</h6>
                  <div className="mt-auto d-flex align-items-center justify-content-end gap-2">
                    {item.id === 'whatsapp-cloud-api' && (
                      <button 
                        className={`btn btn-sm btn-outline-danger`} 
                        onClick={() => setShowDeleteApiOfcModal(true)}
                        title="Apagar dados"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    )}
                    <button className={`btn btn-sm btn-2-${theme}`} onClick={item.onAction}>
                      {item.actionLabel || 'Configurar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {showRequestModal && (
          <div className="modal d-block" tabIndex="-1" role="dialog" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className={`modal-content border-${theme} card-${theme}`}>
                <div className="modal-header">
                  <h5 className="modal-title">Solicitar desenvolvimento de integração</h5>
                  <button type="button" className={`btn-close`} onClick={() => setShowRequestModal(false)} aria-label="Close"></button>
                </div>
                <form onSubmit={handleSubmitRequest}>
                  <div className="modal-body">
                    <div className="mb-2">
                      <label className="form-label">Nome completo</label>
                      <input type="text" name="fullName" value={requestForm.fullName} onChange={handleChange} className={`form-control bg-form-${theme}`} required />
                    </div>
                    <div className="mb-2">
                      <label className="form-label">Telefone para contato</label>
                      <input type="tel" name="phone" value={requestForm.phone} onChange={handleChange} className={`form-control bg-form-${theme}`} required />
                    </div>
                    <div className="mb-2">
                      <label className="form-label">Nome da integração solicitada</label>
                      <input type="text" name="integrationName" value={requestForm.integrationName} onChange={handleChange} className={`form-control bg-form-${theme}`} required />
                    </div>
                    <div className="mb-2">
                      <label className="form-label">Descrição completa da requisição</label>
                      <textarea name="description" value={requestForm.description} onChange={handleChange} rows={5} className={`form-control bg-form-${theme}`} placeholder="Descreva detalhadamente a integração desejada, endpoints, eventos, fluxos..." required />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className={`btn btn-2-${theme}`} onClick={() => setShowRequestModal(false)}>Cancelar</button>
                    <button type="submit" className={`btn btn-1-${theme}`}>Enviar</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal para apagar dados API OFC */}
        {showDeleteApiOfcModal && (
          <div className="modal d-block" tabIndex="-1" role="dialog" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className={`modal-content border-${theme} card-${theme}`}>
                <div className="modal-header">
                  <h5 className="modal-title">Apagar dados da API OFC</h5>
                  <button 
                    type="button" 
                    className={`btn-close`} 
                    onClick={() => {
                      setShowDeleteApiOfcModal(false);
                      setSelectedConnection('');
                    }} 
                    aria-label="Close"
                    disabled={isDeleting}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Selecione a conexão para apagar os dados:</label>
                    <select
                      className={`form-select bg-form-${theme}`}
                      value={selectedConnection}
                      onChange={(e) => setSelectedConnection(e.target.value)}
                      disabled={isDeleting}
                    >
                      <option value="">Selecione uma conexão</option>
                      {apiOfcConnections.map((connection) => (
                        <option key={connection.id} value={connection.id}>
                          {connection.name || connection.label || connection.phone || connection.id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="alert alert-warning" role="alert">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    <strong>Atenção:</strong> Esta ação irá apagar todos os dados (chats e mensagens) relacionados a esta conexão API OFC. Esta ação não pode ser desfeita.
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className={`btn btn-2-${theme}`} 
                    onClick={() => {
                      setShowDeleteApiOfcModal(false);
                      setSelectedConnection('');
                    }}
                    disabled={isDeleting}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-danger" 
                    onClick={handleDeleteApiOfcData}
                    disabled={!selectedConnection || isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Apagando...
                      </>
                    ) : (
                      'Apagar Dados'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default IntegracoesPage;


