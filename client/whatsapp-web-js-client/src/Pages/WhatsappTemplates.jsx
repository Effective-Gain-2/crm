import React, { useState, useEffect } from 'react';
import * as bootstrap from 'bootstrap';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';


function WhatsappTemplates({ theme }) {
  const url = process.env.REACT_APP_URL;
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [funnels, setFunnels] = useState([]);
  const [stages, setStages] = useState([]);
  const [selectedFunnel, setSelectedFunnel] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(
      (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
    );
    return () => tooltipList.forEach((tooltip) => tooltip.dispose());
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const templatesComp = []
    try {
      const response = await axios.get(`${url}/ofc-campaing/get-templates/1355873329598482`, { withCredentials: true })

      response.data.data.map(datas => {
        let header = null
        let body = null
        let footer = null
        datas.components.map(component => {
          if (component.type === 'HEADER') {
            header = component
          } else if (component.type === 'BODY') {
            body = component
          } else if (component.type === 'FOOTER') {
            footer = component
          }
        })
        templatesComp.push({ template: datas, components: { header: header, body: body, footer: footer } })
      })

      setTemplates(Array.isArray(templatesComp) ? templatesComp : [templatesComp])
      console.log(templates)
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
      const funis = await axios.get(`${url}/kanban/get-funis/${schema}`, { withCredentials: true })
      setFunnels(Array.isArray(funis.data.name) ? funis.data.name : [funis.data.name])
    }
    fetchFunisEtapas()

  }, [url, schema])

  useEffect(() => {
    const fetchEtapas = async () => {
      if (!selectedFunnel) return;
      //pegando as etapas
      const etapas = await axios.get(`${url}/kanban/get-stages/${selectedFunnel}/${schema}`, { withCredentials: true })
      setStages(Array.isArray(etapas.data) ? etapas.data : [etapas.data])
    }
    fetchEtapas()
  }, [selectedFunnel || url])

  const handleEditTemplate = (template) => {
    setSelectedTemplate(template);
    setShowModal(true);
  };

  const handleSendTemplate = (template) => {
    setSelectedTemplate(template);
    setShowSendModal(true);
  }
  const handleSendMessage = async (template, stage_id) => {
    try {
      await axios.post(`${url}/ofc-campaing/send-template-message`, {
        phone_id: '722737154266393',
        language: 'pt_BR',
        template_name: template.template.name,
        etapa_id: stage_id,
        schema: schema
      }, { withCredentials: true })

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

        await axios.delete(`${url}/ofc-campaing/delete-template/1355873329598482/${template_name}`, {
          withCredentials: true
        });
        fetchTemplates();
        showSuccess('Template excluído com sucesso!');
      } catch (err) {
        showError('Erro ao excluir template.');
      }
    }
  };

  const handleCreateTemplate = async () => {
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

    const response = await axios.post(`${url}/ofc-campaing/create-template`, {
      wa_id: '1355873329598482',
      name: newTemplate.name,
      language: newTemplate.language,
      category: newTemplate.category,
      components: {
        body: { text: newTemplate.body },
        header: { format: 'text', text: newTemplate.header },
        footer: { text: newTemplate.footer }
      }
    })

    setTemplates(prev => [...prev, { template: newTemplate, components: { header: { text: newTemplate.header }, body: { text: newTemplate.body }, footer: { text: newTemplate.footer } } }]);
    console.log('TEMPLATES', templates);
    setShowModal(false);
    setSelectedTemplate(null);
  };

  const handleUpdateTemplate = async () => {
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
    await axios.put(`${url}/ofc-campaing/edit-template`, {
      template_id: selectedTemplate.template.id,
      wa_id: '1355873329598482',
      name: newTemplate.name,
      language: newTemplate.language,
      category: newTemplate.category,
      components: {
        body: { text: newTemplate.body },
        header: { format: 'text', text: newTemplate.header },
        footer: { text: newTemplate.footer }
      }
    })

    setShowModal(false);
    setSelectedTemplate(null);
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

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="mb-0">
              <i className="bi bi-whatsapp me-2"></i>
              Templates WhatsApp
            </h2>
            <button
              className="btn btn-primary"
              onClick={() => setShowModal(true)}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Novo Template
            </button>
          </div>

          <div className="row">
            {templates.length === 0 ? (
              <div className="col-12">
                <div className="card">
                  <div className="card-body text-center py-5">
                    <i className="bi bi-inbox display-4 text-muted mb-3"></i>
                    <h5 className="text-muted">Nenhum template encontrado</h5>
                    <p className="text-muted">Crie seu primeiro template do WhatsApp</p>
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowModal(true)}
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
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowSendModal(false)}
                >
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary" onClick={() => { handleSendMessage(selectedTemplate, selectedStage) }}>
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
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedTemplate(null);
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
