import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../utils/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

function LeadsPage({ theme = 'light' }) {
  const { userData } = useAuth();
  const schema = userData?.schema;
  const { showError, showSuccess } = useToast();

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);

  const canWipeAll = schema === 'effective_gain';

  const fetchLeads = useCallback(() => {
    setLoading(true);
    api.get('/leads/list')
      .then((res) => setLeads(Array.isArray(res.data?.data) ? res.data.data : []))
      .catch((err) => { console.error('Erro ao listar leads:', err); setLeads([]); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return leads.filter((l) =>
      (l.name || '').toLowerCase().includes(q) ||
      (l.number || '').toLowerCase().includes(q) ||
      (l.tags || []).some((t) => (t || '').toLowerCase().includes(q))
    );
  }, [leads, search]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.number));

  const toggleOne = (number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(number)) next.delete(number); else next.add(number);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filtered.forEach((l) => next.delete(l.number));
      } else {
        filtered.forEach((l) => next.add(l.number));
      }
      return next;
    });
  };

  const deleteOne = async (lead) => {
    if (!window.confirm(`Excluir o lead "${lead.name || lead.number}"? Esta ação remove o contato e seus chats/etapas.`)) return;
    setBusy(true);
    try {
      await api.delete(`/leads/contact/${encodeURIComponent(lead.number)}`);
      setLeads((prev) => prev.filter((l) => l.number !== lead.number));
      setSelected((prev) => { const n = new Set(prev); n.delete(lead.number); return n; });
      showSuccess('Lead excluído');
    } catch (err) {
      showError('Falha ao excluir lead');
    } finally {
      setBusy(false);
    }
  };

  const deleteSelected = async () => {
    const numbers = [...selected];
    if (numbers.length === 0) return;
    if (!window.confirm(`Excluir ${numbers.length} lead(s) selecionado(s)? Remove os contatos e seus chats/etapas.`)) return;
    setBusy(true);
    try {
      const res = await api.post('/leads/delete-many', { numbers });
      setLeads((prev) => prev.filter((l) => !selected.has(l.number)));
      setSelected(new Set());
      showSuccess(`${res.data?.deleted ?? numbers.length} lead(s) excluído(s)`);
    } catch (err) {
      showError('Falha ao excluir leads');
    } finally {
      setBusy(false);
    }
  };

  const deleteAll = async () => {
    const phrase = 'EXCLUIR TODOS';
    const typed = window.prompt(`Isto apaga 100% dos leads (contatos e seus chats/etapas) do schema "${schema}". Esta ação é IRREVERSÍVEL.\n\nDigite "${phrase}" para confirmar:`);
    if (typed !== phrase) { if (typed !== null) showError('Confirmação incorreta — nada foi excluído'); return; }
    setBusy(true);
    try {
      const res = await api.post('/leads/delete-all', {});
      showSuccess('Todos os leads foram excluídos');
      console.log('contagens:', res.data?.counts);
      setLeads([]);
      setSelected(new Set());
    } catch (err) {
      showError(err.response?.data?.message || 'Falha ao excluir todos os leads');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-3" style={{ height: '100%', overflowY: 'auto' }}>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <i className={`bi bi-person-lines-fill header-text-${theme}`} style={{ fontSize: 24 }} />
          <h4 className={`header-text-${theme} m-0`}>Leads</h4>
          <span className={`card-subtitle-${theme}`} style={{ fontSize: 13 }}>({filtered.length})</span>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <input
            type="text"
            placeholder="Buscar por nome, número ou tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`input-${theme}`}
            style={{ padding: '6px 10px', borderRadius: 6, minWidth: 240 }}
          />
          <button className="btn btn-sm btn-danger" disabled={busy || selected.size === 0} onClick={deleteSelected}>
            <i className="bi bi-trash me-1" />Excluir selecionados ({selected.size})
          </button>
          {canWipeAll && (
            <button className="btn btn-sm btn-outline-danger" disabled={busy} onClick={deleteAll} title="Apaga 100% dos leads do effective_gain">
              <i className="bi bi-exclamation-octagon me-1" />Excluir todos
            </button>
          )}
        </div>
      </div>

      <div className={`card card-${theme}`}>
        <div className="table-responsive">
          <table className={`custom-table-${theme} align-middle w-100`}>
            <thead>
              <tr>
                <th className="text-center px-2 py-2" style={{ width: 40 }}>
                  <input type="checkbox" className="form-check-input" checked={allVisibleSelected} onChange={toggleAllVisible} title="Selecionar todos" />
                </th>
                <th className={`text-start px-3 py-2 header-text-${theme}`}>Nome</th>
                <th className={`text-start px-3 py-2 header-text-${theme}`}>Número</th>
                <th className={`text-start px-3 py-2 header-text-${theme}`}>Etapa</th>
                <th className={`text-start px-3 py-2 header-text-${theme}`}>Tags</th>
                <th className={`text-end px-3 py-2 header-text-${theme}`}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan="6" className={`text-center py-4 card-subtitle-${theme}`}>Carregando…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan="6" className={`text-center py-4 card-subtitle-${theme}`}>Nenhum lead {search ? 'encontrado.' : 'cadastrado.'}</td></tr>
              )}
              {!loading && filtered.map((l) => (
                <tr key={l.number} className={selected.has(l.number) ? `selected-row-${theme}` : ''}>
                  <td className="text-center px-2 py-2">
                    <input type="checkbox" className="form-check-input" checked={selected.has(l.number)} onChange={() => toggleOne(l.number)} />
                  </td>
                  <td className={`px-3 py-2 card-subtitle-${theme}`}><strong>{l.name || '—'}</strong></td>
                  <td className={`px-3 py-2 card-subtitle-${theme}`} style={{ fontFamily: 'monospace' }}>{l.number}</td>
                  <td className={`px-3 py-2 card-subtitle-${theme}`}>{l.stage || '—'}</td>
                  <td className="px-3 py-2">
                    <div className="d-flex flex-wrap gap-1">
                      {(l.tags || []).length === 0 ? <span className={`card-subtitle-${theme}`}>—</span> :
                        (l.tags || []).map((t) => <span key={t} className="badge bg-secondary">{t}</span>)}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-end">
                    <button className="btn btn-sm delete-btn" title="Excluir lead" disabled={busy} onClick={() => deleteOne(l)}>
                      <i className="bi bi-trash-fill" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default LeadsPage;
