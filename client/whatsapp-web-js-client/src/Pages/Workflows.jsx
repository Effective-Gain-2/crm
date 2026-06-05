import React, { useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { api } from '../utils/axiosConfig';
import { useToast } from '../contexts/ToastContext';
import WorkflowEditorModal from './modalPages/Workflow_editor';
import { initTooltips } from '../utils/tooltips';

const TRIGGER_LABELS = {
  new_message: 'Nova mensagem do cliente',
  first_message: 'Primeira mensagem do cliente',
  kanban_stage_changed: 'Mudança de etapa Kanban',
  tag_added: 'Tag adicionada',
  tag_removed: 'Tag removida',
  no_reply: 'Cliente sem resposta',
  webhook: 'Webhook externo',
  lead_created: 'Lead criado (API)',
};

function Workflows({ theme }) {
  const { showError, showSuccess } = useToast();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [showLeadApi, setShowLeadApi] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/workflow/');
      setWorkflows(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error(err);
      showError('Falha ao carregar workflows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => initTooltips(), [workflows]);

  const toggleEnabled = async (wf) => {
    try {
      await api.put(`/workflow/${wf.id}`, { enabled: !wf.enabled });
      setWorkflows((prev) => prev.map((w) => (w.id === wf.id ? { ...w, enabled: !w.enabled } : w)));
    } catch (err) {
      showError('Falha ao atualizar workflow');
    }
  };

  const remove = async (wf) => {
    if (!window.confirm(`Excluir o workflow "${wf.name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/workflow/${wf.id}`);
      setWorkflows((prev) => prev.filter((w) => w.id !== wf.id));
      showSuccess('Workflow excluído');
    } catch (err) {
      showError('Falha ao excluir workflow');
    }
  };

  const openNew = () => {
    setEditingId(null);
    setShowEditor(true);
  };

  const openEdit = (wf) => {
    setEditingId(wf.id);
    setShowEditor(true);
  };

  const filtered = workflows.filter((w) =>
    (w.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="pt-3 px-3" style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className={`header-text-${theme} m-0`} style={{ fontWeight: 400 }}>Workflows</h2>
        <div className="d-flex gap-2 align-items-center">
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`input-${theme}`}
            style={{ padding: '6px 10px', borderRadius: 6, minWidth: 220 }}
          />
          <button className={`btn btn-2-${theme}`} onClick={() => setShowLeadApi(true)} title="API para criar leads via webhook">
            <i className="bi bi-cloud-arrow-up me-2" />API de Leads
          </button>
          <button className={`btn btn-1-${theme}`} onClick={openNew}>
            <i className="bi bi-plus-lg me-2" />Novo workflow
          </button>
        </div>
      </div>

      <div className={`card card-${theme}`}>
        <div className="table-responsive">
          <table className={`custom-table-${theme} align-middle w-100`}>
            <thead>
              <tr>
                <th className={`text-start px-3 py-2 header-text-${theme}`}>Nome</th>
                <th className={`text-start px-3 py-2 header-text-${theme}`}>Trigger</th>
                <th className={`text-center px-3 py-2 header-text-${theme}`}>Status</th>
                <th className={`text-end px-3 py-2 header-text-${theme}`}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan="4" className={`text-center py-4 card-subtitle-${theme}`}>Carregando…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan="4" className={`text-center py-4 card-subtitle-${theme}`}>
                    Nenhum workflow {search ? 'encontrado para a busca.' : 'criado. Clique em "Novo workflow" para começar.'}
                  </td>
                </tr>
              )}
              {!loading && filtered.map((w) => (
                <tr key={w.id}>
                  <td className={`px-3 py-2 card-subtitle-${theme}`}>
                    <strong>{w.name}</strong>
                    {w.description && <div className="small opacity-75">{w.description}</div>}
                  </td>
                  <td className={`px-3 py-2 card-subtitle-${theme}`}>
                    {TRIGGER_LABELS[w.trigger_type] || w.trigger_type}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      className={`btn btn-sm ${w.enabled ? 'btn-success' : 'btn-secondary'}`}
                      onClick={() => toggleEnabled(w)}
                      title={w.enabled ? 'Desativar' : 'Ativar'}
                      style={{ minWidth: 90 }}
                    >
                      {w.enabled ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-end">
                    <div className="d-flex gap-2 justify-content-end">
                      <button
                        className={`btn btn-sm btn-2-${theme}`}
                        onClick={() => openEdit(w)}
                        data-bs-toggle="tooltip"
                        title="Editar"
                      >
                        <i className="bi bi-pencil-fill" />
                      </button>
                      <button
                        className="btn btn-sm delete-btn"
                        onClick={() => remove(w)}
                        data-bs-toggle="tooltip"
                        title="Excluir"
                      >
                        <i className="bi bi-trash-fill" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showEditor && (
        <WorkflowEditorModal
          theme={theme}
          workflowId={editingId}
          show={showEditor}
          onClose={() => setShowEditor(false)}
          onSaved={() => { setShowEditor(false); load(); }}
        />
      )}

      <LeadApiModal theme={theme} show={showLeadApi} onClose={() => setShowLeadApi(false)} />
    </div>
  );
}

// Modal da API de Leads: mostra URL do webhook, a API key (única por schema,
// regenerável — regenerar invalida a anterior) e o formato do body.
function LeadApiModal({ theme, show, onClose }) {
  const { showError, showSuccess } = useToast();
  const [keyData, setKeyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  const schema = userData?.schema;
  const base = process.env.REACT_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const webhookUrl = `${base}/api/leads/webhook/${schema}`;

  useEffect(() => {
    if (!show) return;
    setLoading(true);
    api.get('/leads/api-key')
      .then((r) => setKeyData(r.data?.data || null))
      .catch(() => setKeyData(null))
      .finally(() => setLoading(false));
  }, [show]);

  const regenerate = async () => {
    if (keyData && !window.confirm('Gerar uma nova API key? A key atual deixará de funcionar imediatamente.')) return;
    setRegenerating(true);
    try {
      const r = await api.post('/leads/api-key/regenerate', {});
      setKeyData(r.data?.data || null);
      showSuccess('Nova API key gerada');
    } catch (err) {
      showError('Falha ao gerar API key');
    } finally {
      setRegenerating(false);
    }
  };

  const copy = (value) => { navigator.clipboard?.writeText(String(value)); showSuccess('Copiado'); };

  const bodyExample = `{
  "number": "5511999999999",   // obrigatório
  "name": "João da Silva",      // opcional
  "tag": "12345678901",          // opcional — id numérico da tag (tela de Tags)
  "kanban": "98765432109"        // opcional — id numérico da etapa (editar etapa no Kanban)
}`;

  return (
    <Modal show={show} onHide={onClose} centered size="lg">
      <Modal.Header closeButton style={{ background: `var(--bg-color-${theme})` }}>
        <Modal.Title className={`header-text-${theme}`} style={{ fontSize: '1.1rem' }}>
          <i className="bi bi-cloud-arrow-up me-2" />API de Leads
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ background: `var(--bg-color-${theme})` }} className={`card-subtitle-${theme}`}>
        <p style={{ fontSize: 13 }}>
          Crie leads de sistemas externos via <strong>POST</strong>. Todo lead criado dispara o gatilho
          <strong> "Lead criado (API)"</strong> e, se vier com tag/kanban, também os gatilhos de tag e de etapa.
        </p>

        <label className={`d-block mb-1`} style={{ fontSize: 12, fontWeight: 600 }}>URL do webhook</label>
        <div className="d-flex align-items-center gap-2 mb-3">
          <code style={{ background: 'rgba(0,0,0,0.25)', padding: '6px 10px', borderRadius: 4, wordBreak: 'break-all', flex: 1 }}>{webhookUrl}</code>
          <button className={`btn btn-sm btn-2-${theme}`} onClick={() => copy(webhookUrl)}><i className="bi bi-clipboard" /></button>
        </div>

        <label className={`d-block mb-1`} style={{ fontSize: 12, fontWeight: 600 }}>API key (header <code>x-lead-api-key</code>)</label>
        <div className="d-flex align-items-center gap-2 mb-1">
          <code style={{ background: 'rgba(0,0,0,0.25)', padding: '6px 10px', borderRadius: 4, wordBreak: 'break-all', flex: 1 }}>
            {loading ? 'carregando…' : (keyData?.token || 'nenhuma key gerada')}
          </code>
          {keyData?.token && (
            <button className={`btn btn-sm btn-2-${theme}`} onClick={() => copy(keyData.token)}><i className="bi bi-clipboard" /></button>
          )}
          <button className={`btn btn-sm btn-1-${theme}`} onClick={regenerate} disabled={regenerating}>
            <i className="bi bi-arrow-repeat me-1" />{keyData ? 'Regenerar' : 'Gerar'}
          </button>
        </div>
        <div style={{ fontSize: 11, opacity: 0.7 }} className="mb-3">
          Regenerar invalida a key anterior. Guarde-a com segurança.
        </div>

        <label className={`d-block mb-1`} style={{ fontSize: 12, fontWeight: 600 }}>Body (JSON)</label>
        <pre style={{ background: 'rgba(0,0,0,0.25)', padding: 10, borderRadius: 6, fontSize: 12, overflowX: 'auto' }}>{bodyExample}</pre>
        <div style={{ fontSize: 12 }}>
          Apenas <code>number</code> é obrigatório. <code>tag</code> e <code>kanban</code> aceitam o id numérico
          (mostrado na tela de Tags e ao editar a etapa no Kanban) ou o uuid.
        </div>
      </Modal.Body>
    </Modal>
  );
}

export default Workflows;
