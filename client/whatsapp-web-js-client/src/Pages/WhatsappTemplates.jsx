import React, { useState, useEffect } from 'react';
import * as bootstrap from 'bootstrap';
import { api } from '../utils/axiosConfig';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { initTooltips } from '../utils/tooltips';


function WhatsappTemplates({ theme }) {
  const url = process.env.REACT_APP_URL;
  const userData = useAuth().userData
  const schema = userData?.schema;

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [funnels, setFunnels] = useState([]);
  const [stages, setStages] = useState([]);
  const [selectedFunnel, setSelectedFunnel] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [buttons, setButtons] = useState([]);
  const [examples, setExamples] = useState([]);
  const [confirmVariables, setConfirmVariables] = useState(false);
  const [customFields, setCustomFields] = useState([]);
  const [detectedVars, setDetectedVars] = useState([]);
  const [varMappings, setVarMappings] = useState({});
  const [selectedPhoneId, setSelectedPhoneId] = useState('');
  const [connections, setConnections] = useState([]);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [connectionsError, setConnectionsError] = useState(null);
  const { showError, showSuccess } = useToast();

  useEffect(() => initTooltips(), []);

  useEffect(() => {
    const fetchConnections = async () => {
      if (!schema) {
        setConnections([]);
        setConnectionsLoading(false);
        return;
      }
      setConnectionsLoading(true);
      setConnectionsError(null);
      try {
        const res = await api.get(`/connection/get-all-api-ofc-connections/${schema}`);
        const raw = Array.isArray(res.data) ? res.data : [res.data];
        // api_connections: id, phone_id, name, number, token
        const normalized = raw.filter(Boolean).filter((conn) => conn && conn.phone_id);
        setConnections(normalized);
        if (!selectedPhoneId && normalized.length === 1) {
          setSelectedPhoneId(normalized[0].phone_id);
        }
      } catch (err) {
        console.error('Erro ao buscar números oficiais:', err);
        setConnections([]);
        setConnectionsError('Erro ao carregar números oficiais do WhatsApp');
      } finally {
        setConnectionsLoading(false);
      }
    };

    fetchConnections();
  }, [schema, url]);

  useEffect(() => {
    if (selectedPhoneId) {
      fetchTemplates(selectedPhoneId);
    }
  }, [selectedPhoneId]);

  const fetchTemplates = async (phoneId) => {
    if (!phoneId) return;
    setLoading(true);
    setError(null);
    const templatesComp = [];
    try {
      const response = await api.get(`/ofc-campaing/get-templates/${phoneId}/${schema}`);

      response.data.data.map((datas) => {
        let header = null;
        let body = null;
        let footer = null;
        let buttons = [];
        datas.components.map((component) => {
          if (component.type === 'HEADER') {
            header = component;
          } else if (component.type === 'BODY') {
            body = component;
          } else if (component.type === 'FOOTER') {
            footer = component;
          } else if (component.type === 'BUTTONS') {
            buttons = component.buttons || [];
          }
        });
        templatesComp.push({ template: datas, components: { header: header, body: body, footer: footer, buttons: buttons } });
      });

      setTemplates(Array.isArray(templatesComp) ? templatesComp : [templatesComp]);
      console.log(templates);
    } catch (err) {
      setError('Erro ao carregar templates');
      console.error('Erro ao buscar templates:', err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const fetchFunisEtapas = async () => {
      //pegando os funis
      const funis = await api.get(`/kanban/get-funis/${schema}`)
      setFunnels(Array.isArray(funis.data.name) ? funis.data.name : [funis.data.name])
    }
    fetchFunisEtapas()

  }, [schema])

  useEffect(() => {
    const fetchEtapas = async () => {
      if (!selectedFunnel) return;
      //pegando as etapas
      const etapas = await api.get(`/kanban/get-stages/${selectedFunnel}/${schema}`)
      setStages(Array.isArray(etapas.data) ? etapas.data : [etapas.data])
    }
    fetchEtapas()
  }, [selectedFunnel || schema])

  const handleEditTemplate = (template) => {
    setSelectedTemplate(template);
    setButtons(template.components.buttons || []);
    const namedParams = template.components.body?.example?.body_text_named_params;
    setExamples(Array.isArray(namedParams) ? namedParams : []);
    setShowModal(true);
  };

  const handleAddButton = () => {
    if (buttons.length < 2) {
      setButtons([...buttons, { sub_type: '', text: '', value: '', index: '' }]);
    }
  };

  const handleRemoveButton = (index) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const handleButtonChange = (index, field, value) => {
    const newButtons = [...buttons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    setButtons(newButtons);
  };

  const handleSendTemplate = (template) => {
    setSelectedTemplate(template);
    setConfirmVariables(false);
    // Detectar variáveis do corpo (via named params ou {{var}})
    try {
      const bodyText = template?.components?.body?.text || '';
      const namedParams = template?.components?.body?.example?.body_text_named_params;
      let vars = [];
      if (Array.isArray(namedParams) && namedParams.length > 0) {
        vars = namedParams
          .map(v => (typeof v === 'string' ? v : v?.param_name))
          .filter(Boolean);
      } else {
        const regex = /\{\{\s*([^}]+?)\s*\}\}/g;
        let match;
        while ((match = regex.exec(bodyText)) !== null) {
          vars.push(match[1]);
        }
      }
      // Unificar e remover duplicadas
      const uniqueVars = Array.from(new Set(vars));
      setDetectedVars(uniqueVars);
      // Inicializar mapeamentos vazios
      const initMap = {};
      uniqueVars.forEach(v => { initMap[v] = ''; });
      setVarMappings(initMap);
    } catch (e) {
      console.error('Falha ao detectar variáveis:', e);
      setDetectedVars([]);
      setVarMappings({});
    }
    // Buscar campos personalizados
    (async () => {
      try {
        const resp = await api.get(`/kanban/get-custom-fields/${schema}`);
        const data = resp?.data;
        const normalized = Array.isArray(data)
          ? data.map(item => {
              if (typeof item === 'string') return { id: null, label: item };
              const label = item?.label || item?.field || item?.column_name || item?.key || '';
              const id = item?.id ?? item?.value ?? item?.key ?? item?.column_id ?? null;
              return label ? { id, label } : null;
            }).filter(Boolean)
          : [];
        setCustomFields(normalized);
      } catch (err) {
        console.error('Erro ao buscar campos personalizados:', err);
        setCustomFields([]);
      }
    })();
    setShowSendModal(true);
  }
  const handleAddExample = () => {
    setExamples((prev) => [...prev, { param_name: '', example: '' }]);
  }
  const handleChangeExampleField = (index, field, value) => {
    const next = [...examples];
    next[index] = { ...next[index], [field]: value };
    setExamples(next);
  }
  const handleRemoveExample = (index) => {
    setExamples((prev) => prev.filter((_, i) => i !== index));
  }
  const handleSendMessage = async (template, stage_id) => {
    try {
      if (!selectedPhoneId) {
        showError('Selecione um número oficial de WhatsApp antes de enviar o template.');
        return;
      }
      const variables = (detectedVars || []).map(label => {
        const chosen = (varMappings[label] || '').trim();
        if (!chosen) return null;
        // se for custom field, incluir id
        const cf = customFields.find(c => c.label === chosen);
        if (cf) {
          return { label, value: chosen, id: cf.id };
        }
        return { label, value: chosen };
      }).filter(Boolean);
      await api.post(`/ofc-campaing/send-template-message`, {
        phone_id: selectedPhoneId,
        language: 'pt_BR',
        template_name: template.template.name,
        etapa_id: stage_id,
        schema: schema,
        variables
      })

      setShowSendModal(false);
      showSuccess('Template enviado com sucesso!');
      setSelectedStage(null);
      setSelectedStage(null)

    } catch (error) {
      setShowSendModal(false);
      console.error('Erro ao enviar template:', error);
      showError('Erro ao enviar template.');
    }
  }
  const handleDeleteTemplate = async (template_name) => {
    if (window.confirm('Tem certeza que deseja excluir este template?')) {
      try {
        setTemplates(prev => prev.filter(template => template.name !== template_name));

        if (!selectedPhoneId) {
          showError('Selecione um número oficial de WhatsApp antes de excluir um template.');
          return;
        }

        await api.delete(`/ofc-campaing/delete-template/${selectedPhoneId}/${template_name}`);
        fetchTemplates(selectedPhoneId);
        showSuccess('Template excluído com sucesso!');
      } catch (err) {
        showError('Erro ao excluir template.');
      }
    }
  };

  const handleCreateTemplate = async () => {
    if (!selectedPhoneId) {
      showError('Selecione um número oficial de WhatsApp antes de criar um template.');
      return;
    }
    const formData = {
      name: document.querySelector('input[placeholder="Digite o nome do template"]').value,
      category: document.querySelector('select').value,
      body: document.querySelector('textarea').value,
      header: document.querySelector('input[placeholder="Cabeçalho do template"]').value,
      footer: document.querySelector('input[placeholder="Rodapé do template"]').value
    };

    if (!formData.name || !formData.category || !formData.body) {
      alert('Preencha os campos obrigatórios: Nome, Categoria e Conteúdo');
      return;
    }

    const newTemplate = {
      id: Math.max(...templates.map(t => t.id)) + 1,
      name: formData.name,
      category: formData.category,
      language: 'pt_BR',
      status: 'DRAFT',
      body: formData.body,
      header: formData.header || null,
      footer: formData.footer || null
    };

    const formattedButtons = buttons.map((btn, idx) => ({
      type: 'button',
      sub_type: btn.sub_type,
      index: String(idx),
      text: btn.text,
      url: btn.sub_type === 'url' ? btn.value : undefined,
      phone_number: btn.sub_type === 'phone_number' ? btn.value : undefined,
      payload: btn.sub_type === 'quick_reply' ? btn.value : undefined
    }));

    const response = await api.post(`/ofc-campaing/create-template`, {
      wa_id: selectedPhoneId,
      name: newTemplate.name,
      language: newTemplate.language,
      category: newTemplate.category,
      components: {
        body: { text: newTemplate.body, example: { body_text_named_params: examples } },
        header: { format: 'text', text: newTemplate.header },
        footer: { text: newTemplate.footer },
        buttons: formattedButtons
      }
    })

    setTemplates(prev => [...prev, { template: newTemplate, components: { header: { text: newTemplate.header }, body: { text: newTemplate.body }, footer: { text: newTemplate.footer } } }]);
    console.log('TEMPLATES', templates);
    setShowModal(false);
    setSelectedTemplate(null);
    setButtons([]);
    setExamples([]);
  };

  const handleUpdateTemplate = async () => {
    if (!selectedPhoneId) {
      showError('Selecione um número oficial de WhatsApp antes de atualizar um template.');
      return;
    }
    const formData = {
      name: document.querySelector('input[placeholder="Digite o nome do template"]').value,
      category: document.querySelector('select').value,
      body: document.querySelector('textarea').value,
      header: document.querySelector('input[placeholder="Cabeçalho do template"]').value,
      footer: document.querySelector('input[placeholder="Rodapé do template"]').value,
    };

    if (!formData.name || !formData.category || !formData.body) {
      alert('Preencha os campos obrigatórios: Nome, Categoria e Conteúdo');
      return;
    }

    setTemplates(prev => prev.map(template =>
      template.id === selectedTemplate.id
        ? { ...template, ...formData }
        : template
    ));
    const newTemplate = {
      id: Math.max(...templates.map(t => t.id)) + 1,
      name: formData.name,
      category: formData.category,
      language: 'pt_BR',
      status: 'DRAFT',
      body: formData.body,
      header: formData.header || null,
      footer: formData.footer || null
    };

    const formattedButtons = buttons.map((btn, idx) => ({
      type: 'button',
      sub_type: btn.sub_type,
      index: String(idx),
      text: btn.text,
      url: btn.sub_type === 'url' ? btn.value : undefined,
      phone_number: btn.sub_type === 'phone_number' ? btn.value : undefined,
      payload: btn.sub_type === 'quick_reply' ? btn.value : undefined
    }));

    await api.put(`/ofc-campaing/edit-template`, {
      template_id: selectedTemplate.template.id,
      wa_id: selectedPhoneId,
      name: newTemplate.name,
      language: newTemplate.language,
      category: newTemplate.category,
      components: {
        body: { text: newTemplate.body, example: { body_text_named_params: examples } },
        header: { format: 'text', text: newTemplate.header },
        footer: { text: newTemplate.footer },
        buttons: formattedButtons
      }
    })

    setShowModal(false);
    setSelectedTemplate(null);
    setButtons([]);
    setExamples([]);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-success';
      case 'PENDING':
        return 'bg-warning';
      case 'REJECTED':
        return 'bg-danger';
      case 'DRAFT':
        return 'bg-secondary';
      default:
        return 'bg-info';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'Aprovado';
      case 'PENDING':
        return 'Pendente';
      case 'REJECTED':
        return 'Rejeitado';
      case 'DRAFT':
        return 'Rascunho';
      default:
        return status;
    }
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="mb-0">
                <i className="bi bi-whatsapp me-2"></i>
                Templates WhatsApp
              </h2>
              <small className="text-muted">
                Selecione o número oficial antes de carregar ou gerenciar templates.
              </small>
            </div>
            <div className="d-flex flex-column flex-lg-row align-items-lg-center gap-3 w-100 justify-content-end">
              <div className="flex-grow-1 flex-lg-grow-0" style={{ minWidth: '280px' }}>
                <label className="form-label mb-1 fw-semibold">Número oficial (phone_id)</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-telephone"></i>
                  </span>
                  <select
                    className="form-select"
                    value={selectedPhoneId}
                    onChange={(e) => {
                      setSelectedPhoneId(e.target.value);
                      setTemplates([]);
                      setError(null);
                    }}
                    disabled={connectionsLoading || connections.length === 0}
                  >
                    <option value="">Selecione um número oficial</option>
                    {connections.map((connection) => (
                      <option key={connection.id} value={connection.phone_id}>
                        {connection.number || connection.phone_id}
                      </option>
                    ))}
                  </select>
                </div>
                {connectionsError && (
                  <small className="text-danger d-block mt-1">{connectionsError}</small>
                )}
              </div>
              <div className="d-flex gap-2 justify-content-end">
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => fetchTemplates(selectedPhoneId)}
                  disabled={!selectedPhoneId || loading}
                >
                  <i className="bi bi-arrow-repeat me-2"></i>
                  Recarregar
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setButtons([]);
                    setExamples([]);
                    setShowModal(true);
                  }}
                  disabled={!selectedPhoneId}
                >
                  <i className="bi bi-plus-circle me-2"></i>
                  Novo Template
                </button>
              </div>
            </div>
          </div>

          <div className="row">
            {connectionsLoading ? (
              <div className="col-12 d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Carregando números...</span>
                </div>
              </div>
            ) : connections.length === 0 ? (
              <div className="col-12">
                <div className="alert alert-warning" role="alert">
                  Nenhum número oficial foi encontrado. Cadastre uma conexão oficial para continuar.
                </div>
              </div>
            ) : !selectedPhoneId ? (
              <div className="col-12">
                <div className="alert alert-info" role="alert">
                  Selecione um número oficial do WhatsApp para visualizar os templates disponíveis.
                </div>
              </div>
            ) : loading ? (
              <div className="col-12 d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Carregando...</span>
                </div>
              </div>
            ) : error ? (
              <div className="col-12">
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              </div>
            ) : templates.length === 0 ? (
              <div className="col-12">
                <div className="card">
                  <div className="card-body text-center py-5">
                    <i className="bi bi-inbox display-4 text-muted mb-3"></i>
                    <h5 className="text-muted">Nenhum template encontrado</h5>
                    <p className="text-muted">Crie seu primeiro template do WhatsApp para o número selecionado.</p>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        setButtons([]);
                        setExamples([]);
                        setShowModal(true);
                      }}
                      disabled={!selectedPhoneId}
                    >
                      <i className="bi bi-plus-circle me-2"></i>
                      Criar Template
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              templates.map((template) => (
                <div key={template.template.id} className="col-md-6 col-lg-4 mb-4">
                  <div className="card h-100 shadow-sm">
                    {/* Header */}
                    <div className="card-header bg-white border-bottom">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <h6 className="card-title mb-1 fw-bold text-truncate" title={template.template.name}>
                            {template.template.name}
                          </h6>
                          <small className="text-muted">
                            {template.template.category} • {template.template.language}
                          </small>
                        </div>
                        <span className={`badge ${getStatusBadgeClass(template.template.status)} ms-2`}>
                          {getStatusText(template.template.status)}
                        </span>
                      </div>
                    </div>

                    {/* Body */}


                    <div className="card-body">

                      {template.components.header && (
                        <div className="mb-2">
                          <small className="text-muted d-block mb-1">Cabeçalho:</small>
                          <small className="text-break">{template.components.header?.text}</small>
                        </div>
                      )}

                      <div className="mb-3">
                        <small className="text-muted d-block mb-1">Conteúdo:</small>
                        <p className="card-text small mb-0 text-break">
                          {template.components.body?.text.substring(0, 150)}
                          {template.components.body?.text.length > 150 && '...'}
                        </p>
                      </div>



                      {template.components.footer && (
                        <div className="mb-2">
                          <small className="text-muted d-block mb-1">Rodapé:</small>
                          <small className="text-break">{template.components.footer.text}</small>
                        </div>
                      )}

                      {template.components.buttons && template.components.buttons.length > 0 && (
                        <div className="mb-2">
                          <small className="text-muted d-block mb-1">Botões:</small>
                          <div className="d-flex flex-wrap gap-2">
                            {template.components.buttons.map((button, idx) => (
                              <span key={idx} className="badge bg-info">
                                {button.text}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="card-footer bg-white border-top">
                      <div className="d-flex gap-2 flex-wrap">
                        <button
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => handleEditTemplate(template)}
                          data-bs-toggle="tooltip"
                          title="Editar template"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>

                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleDeleteTemplate(template.template.name)}
                          data-bs-toggle="tooltip"
                          title="Excluir template"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                        <button
                          className="btn btn-outline-info btn-sm"
                          onClick={() => {
                            handleSendTemplate(template)
                          }}
                          data-bs-toggle="tooltip"
                          title="Enviar template"
                        >
                          <i class="bi bi-send"></i>
                        </button>
                      </div>

                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showSendModal && (
        // Modal de envio de template
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-send me-2"></i>
                  Enviar Template
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowSendModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {/* Seleção de Funil */}
                <div className="mb-3">
                  <label className="form-label">Funil do Kanban</label>
                  <select className="form-select" onChange={e => setSelectedFunnel(e.target.value)}>
                    <option value="">Selecione um funil</option>
                    {funnels.map(funnel => (
                      <option value={funnel}>{funnel}</option>
                    ))}
                  </select>
                </div>

                {/* Seleção de Etapa */}
                <div className="mb-3">
                  <label className="form-label">Etapa do Kanban</label>
                  <select className="form-select" onChange={e => setSelectedStage(e.target.value)}>
                    <option value="">Selecione uma etapa</option>
                    {stages.map(stage => (
                      <option value={stage.id}>{stage.etapa}</option>
                    ))}
                  </select>
                </div>

                {/* Confirmação de variáveis */}
                {(() => {
                  const bodyText = selectedTemplate?.components.body?.text || '';
                  const namedParams = selectedTemplate?.components.body?.example?.body_text_named_params || [];
                  const hasVars = (Array.isArray(namedParams) && namedParams.length > 0) || /\{\{[^}]+\}\}/.test(bodyText);
                  if (!hasVars) return null;
                  return (
                    <div className="alert alert-warning">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="confirmVariablesCheck"
                          checked={confirmVariables}
                          onChange={(e) => setConfirmVariables(e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="confirmVariablesCheck">
                          Este template possui variáveis. Confirmo que os valores/exemplos estão corretos para o envio.
                        </label>
                      </div>
                    </div>
                  );
                })()}

                {/* Mapeamento de variáveis para campos */}
                {detectedVars && detectedVars.length > 0 && (
                  <div className="mb-3">
                    <label className="form-label">Mapeamento de variáveis</label>
                    {detectedVars.map((v) => (
                      <div key={v} className="row g-2 align-items-center mb-2">
                        <div className="col-md-6">
                          <input type="text" className="form-control" value={v} disabled />
                        </div>
                        <div className="col-md-6">
                          <select
                            className="form-select"
                            value={varMappings[v] || ''}
                            onChange={(e) => setVarMappings(prev => ({ ...prev, [v]: e.target.value }))}
                          >
                            <option value="">Selecione um campo</option>
                            <option value="nome">Nome</option>
                            <option value="numero">Número</option>
                            {customFields.map(cf => (
                              <option key={`${v}-${cf.label}`} value={cf.label}>{cf.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowSendModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => { handleSendMessage(selectedTemplate, selectedStage) }}
                  disabled={(() => {
                    const bodyText = selectedTemplate?.components.body?.text || '';
                    const namedParams = selectedTemplate?.components.body?.example?.body_text_named_params || [];
                    const hasVars = (Array.isArray(namedParams) && namedParams.length > 0) || /\{\{[^}]+\}\}/.test(bodyText);
                    const needMap = detectedVars && detectedVars.length > 0;
                    const allMapped = needMap ? detectedVars.every(v => (varMappings[v] || '').trim() !== '') : true;
                    return (hasVars && !confirmVariables) || (needMap && !allMapped) || !selectedStage;
                  })()}
                >
                  <i className="bi bi-send me-2"></i>
                  Enviar Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal para criar/editar template */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {selectedTemplate ? 'Editar Template' : 'Novo Template'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedTemplate(null);
                    setButtons([]);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Nome do Template</label>
                  <input
                    type="text"
                    className="form-control"
                    defaultValue={selectedTemplate?.template.name || ''}
                    placeholder="Digite o nome do template"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Categoria</label>
                  <select className="form-select" defaultValue={selectedTemplate?.template.category || ''}>
                    <option value="">Selecione uma categoria</option>
                    <option value="AUTHENTICATION">Autenticação</option>
                    <option value="MARKETING">Marketing</option>
                    <option value="UTILITY">Utilitário</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Conteúdo</label>
                  <textarea
                    className="form-control"
                    rows="6"
                    defaultValue={selectedTemplate?.components.body.text || ''}
                    placeholder="Digite o conteúdo do template"
                  ></textarea>
                </div>
                <div className="mb-3">
                  <label className="form-label">Exemplos nomeados</label>
                  {examples.map((ex, idx) => (
                    <div key={idx} className="row g-2 align-items-center mb-2">
                      <div className="col-md-5">
                        <input
                          type="text"
                          className="form-control"
                          value={ex.param_name}
                          onChange={(e) => handleChangeExampleField(idx, 'param_name', e.target.value)}
                          placeholder="Nome do parâmetro (ex.: nome, codigo, dia)"
                        />
                      </div>
                      <div className="col-md-5">
                        <input
                          type="text"
                          className="form-control"
                          value={ex.example}
                          onChange={(e) => handleChangeExampleField(idx, 'example', e.target.value)}
                          placeholder="Exemplo (ex.: Arthur)"
                        />
                      </div>
                      <div className="col-md-2 d-grid">
                        <button
                          type="button"
                          className="btn btn-outline-danger"
                          onClick={() => handleRemoveExample(idx)}
                          title="Remover exemplo"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                  <button type="button" className="btn btn-outline-secondary" onClick={handleAddExample}>
                    <i className="bi bi-plus-circle me-2"></i>
                    Adicionar Exemplo
                  </button>
                </div>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Cabeçalho (opcional)</label>
                      <input
                        type="text"
                        className="form-control"
                        defaultValue={selectedTemplate?.components.header?.text || ''}
                        placeholder="Cabeçalho do template"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Rodapé (opcional)</label>
                      <input
                        type="text"
                        className="form-control"
                        defaultValue={selectedTemplate?.components.footer?.text || ''}
                        placeholder="Rodapé do template"
                      />
                    </div>
                  </div>
                </div>
                {/* Área de Botões */}
                <div className="mb-3">
                  <label className="form-label">Botões (máximo 2)</label>
                  {buttons.map((button, index) => (
                    <div key={index} className="border p-3 mb-3 rounded">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong>Botão {index + 1}</strong>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleRemoveButton(index)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                      <div className="mb-2">
                        <label className="form-label">Texto do Botão</label>
                        <input
                          type="text"
                          className="form-control"
                          value={button.text || ''}
                          onChange={(e) => handleButtonChange(index, 'text', e.target.value)}
                          placeholder="Digite o texto do botão"
                        />
                      </div>
                      <div className="mb-2">
                        <label className="form-label">Tipo</label>
                        <select
                          className="form-select"
                          value={button.sub_type || ''}
                          onChange={(e) => handleButtonChange(index, 'sub_type', e.target.value)}
                        >
                          <option value="">Selecione o tipo</option>
                          <option value="url">URL</option>
                          <option value="phone_number">Número</option>
                          <option value="quick_reply">Resposta Rápida</option>
                        </select>
                      </div>
                      {button.sub_type === 'url' && (
                            <div className="mb-2">
                              <label className="form-label">URL</label>
                              <input
                                type="text"
                                className="form-control"
                                value={button.value || ''}
                                onChange={(e) => handleButtonChange(index, 'value', e.target.value)}
                                placeholder="https://exemplo.com"
                              />
                            </div>
                          )}
                          {button.sub_type === 'phone_number' && (
                            <div className="mb-2">
                              <label className="form-label">Número</label>
                              <input
                                type="text"
                                className="form-control"
                                value={button.value || ''}
                                onChange={(e) => handleButtonChange(index, 'value', e.target.value)}
                                placeholder="+5511999999999"
                              />
                            </div>
                          )}
                          {button.sub_type === 'quick_reply' && (
                            <div className="mb-2">
                              <label className="form-label">Texto da Resposta</label>
                              <input
                                type="text"
                                className="form-control"
                                value={button.value || ''}
                                onChange={(e) => handleButtonChange(index, 'value', e.target.value)}
                                placeholder="Digite o texto da resposta rápida"
                              />
                            </div>
                          )}
                    </div>
                  ))}
                  {buttons.length < 2 && (
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={handleAddButton}
                      style={{width:'20%', height:'40px', fontSize:'14px'}}
                    >
                      <i className="bi bi-plus-circle me-2"></i>
                      Adicionar Botão
                    </button>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedTemplate(null);
                    setButtons([]);
                    setExamples([]);
                  }}
                >
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary" onClick={selectedTemplate ? handleUpdateTemplate : handleCreateTemplate}>
                  {selectedTemplate ? 'Atualizar' : 'Criar'} Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WhatsappTemplates;
