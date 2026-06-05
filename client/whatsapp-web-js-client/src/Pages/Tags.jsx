import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../utils/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const DEFAULT_COLORS = ['#0d6efd', '#198754', '#dc3545', '#fd7e14', '#6f42c1', '#20c997', '#ffc107', '#0dcaf0', '#6c757d', '#d63384'];

function TagsPage({ theme = 'light' }) {
  const { userData } = useAuth();
  const schema = userData?.schema;
  const { showError, showSuccess } = useToast();

  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const fetchTags = useCallback(() => {
    if (!schema) return;
    setLoading(true);
    api.get(`/tag/${schema}`)
      .then((res) => setTags(Array.isArray(res.data) ? res.data : []))
      .catch((err) => { console.error('Erro ao buscar tags:', err); setTags([]); })
      .finally(() => setLoading(false));
  }, [schema]);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  const createTag = async (e) => {
    e.preventDefault();
    if (!name.trim()) { showError('Dê um nome à tag'); return; }
    setSaving(true);
    try {
      await api.post('/tag/create', { name: name.trim(), color, schema });
      setName('');
      showSuccess('Tag criada');
      fetchTags();
    } catch (err) {
      console.error(err);
      showError(err.response?.data?.error || 'Falha ao criar tag');
    } finally {
      setSaving(false);
    }
  };

  const deleteTag = async (tag) => {
    if (!window.confirm(`Excluir a tag "${tag.name}"?`)) return;
    try {
      await api.delete(`/tag/${schema}/${tag.id}`);
      showSuccess('Tag excluída');
      setTags((prev) => prev.filter((t) => t.id !== tag.id));
    } catch (err) {
      console.error(err);
      showError('Falha ao excluir tag');
    }
  };

  const copy = (value) => {
    navigator.clipboard?.writeText(String(value));
    showSuccess('ID copiado');
  };

  return (
    <div className="p-3" style={{ height: '100%', overflowY: 'auto' }}>
      <div className="d-flex align-items-center gap-2 mb-4">
        <i className={`bi bi-tags header-text-${theme}`} style={{ fontSize: 24 }} />
        <h4 className={`header-text-${theme} m-0`}>Tags</h4>
      </div>

      {/* Form de criação */}
      <form onSubmit={createTag} className={`card-${theme} p-3 rounded mb-4`} style={{ maxWidth: 720 }}>
        <div className="d-flex flex-wrap align-items-end gap-3">
          <div style={{ flex: '1 1 240px' }}>
            <label className={`card-subtitle-${theme} d-block mb-1`} style={{ fontSize: 12 }}>Nome da tag</label>
            <input
              className={`input-${theme} w-100`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Cliente clínica"
              style={{ padding: '8px 10px', borderRadius: 6 }}
            />
          </div>
          <div>
            <label className={`card-subtitle-${theme} d-block mb-1`} style={{ fontSize: 12 }}>Cor</label>
            <div className="d-flex align-items-center gap-1">
              {DEFAULT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  title={c}
                  style={{
                    width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: color === c ? '3px solid #fff' : '1px solid rgba(0,0,0,0.2)',
                    boxShadow: color === c ? `0 0 0 2px ${c}` : 'none',
                  }}
                />
              ))}
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                style={{ width: 30, height: 28, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }} />
            </div>
          </div>
          <button type="submit" className={`btn btn-1-${theme}`} disabled={saving}>
            <i className="bi bi-plus-lg me-1" />{saving ? 'Salvando…' : 'Criar tag'}
          </button>
        </div>
      </form>

      {/* Lista */}
      {loading ? (
        <div className={`header-text-${theme}`}>Carregando tags…</div>
      ) : tags.length === 0 ? (
        <div className={`card-subtitle-${theme}`}>Nenhuma tag cadastrada ainda.</div>
      ) : (
        <div className="d-flex flex-column gap-2" style={{ maxWidth: 720 }}>
          {tags.map((tag) => (
            <div key={tag.id} className={`card-${theme} d-flex align-items-center justify-content-between rounded px-3 py-2`}>
              <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: tag.color || '#6c757d', flexShrink: 0 }} />
                <span className={`header-text-${theme} fw-medium`} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tag.name}</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className={`btn btn-sm btn-2-${theme} d-flex align-items-center gap-1`}
                  title="Copiar ID (use na API de leads / workflows)"
                  onClick={() => copy(tag.numeric_id || tag.id)}
                  style={{ fontFamily: 'monospace' }}
                >
                  <i className="bi bi-clipboard" />
                  {tag.numeric_id || '—'}
                </button>
                <button type="button" className="btn btn-sm btn-danger" title="Excluir" onClick={() => deleteTag(tag)}>
                  <i className="bi bi-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TagsPage;
