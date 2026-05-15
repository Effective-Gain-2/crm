import React, { useEffect, useState } from 'react';
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
};

function Workflows({ theme }) {
  const { showError, showSuccess } = useToast();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');

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
    </div>
  );
}

export default Workflows;
