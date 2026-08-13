import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { socket } from '../socket';
import LembreteRapido from './modalPages/LembreteRapido';

const url = process.env.REACT_APP_URL;

const formatBRL = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));

// Deriva o "sector" (sufixo da tabela kanban_) a partir do nome do funil (mesma regra do Kanban).
const sectorOf = (funil) => (funil ? funil.charAt(0).toLowerCase() + funil.slice(1) : '');

export default function Opportunities({ theme }) {
  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  const schema = userData?.schema;

  const [socketInstance] = useState(() => socket());
  const [funis, setFunis] = useState([]);
  const [funilSelecionado, setFunilSelecionado] = useState('');
  const [etapas, setEtapas] = useState([]);
  const [oportunidades, setOportunidades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragged, setDragged] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', contact_number: '', source: '', value: '', stage_id: '' });

  const [showRules, setShowRules] = useState(false);
  const [lembreteAlvo, setLembreteAlvo] = useState(null);
  const [rules, setRules] = useState([]);
  const [ruleForm, setRuleForm] = useState({ name: '', field: 'source', operator: 'equals', value: '', points: 10 });

  // ---- Funis ----
  useEffect(() => {
    if (!schema) return;
    axios
      .get(`${url}/kanban/get-funis/${schema}`, { withCredentials: true })
      .then((res) => {
        const list = Array.isArray(res.data.name) ? res.data.name : [];
        setFunis(list);
        if (list.length && !funilSelecionado) setFunilSelecionado(list[0]);
      })
      .catch((e) => console.error('Erro ao buscar funis:', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema]);

  // Sala do schema (realtime)
  useEffect(() => {
    if (schema) socketInstance.emit('join', `schema_${schema}`);
  }, [schema, socketInstance]);

  // ---- Etapas do funil ----
  useEffect(() => {
    if (!funilSelecionado || !schema) {
      setEtapas([]);
      return;
    }
    axios
      .get(`${url}/kanban/get-stages/${sectorOf(funilSelecionado)}/${schema}`, { withCredentials: true })
      .then((res) => setEtapas(Array.isArray(res.data) ? res.data : []))
      .catch((e) => console.error('Erro ao buscar etapas:', e));
  }, [funilSelecionado, schema]);

  // ---- Oportunidades do funil ----
  const fetchOportunidades = useCallback(() => {
    if (!funilSelecionado || !schema) {
      setOportunidades([]);
      return;
    }
    setLoading(true);
    axios
      .get(`${url}/opportunity/by-funnel/${encodeURIComponent(funilSelecionado)}/${schema}`, { withCredentials: true })
      .then((res) => setOportunidades(Array.isArray(res.data.opportunities) ? res.data.opportunities : []))
      .catch((e) => console.error('Erro ao buscar oportunidades:', e))
      .finally(() => setLoading(false));
  }, [funilSelecionado, schema]);

  useEffect(() => {
    fetchOportunidades();
  }, [fetchOportunidades]);

  // Realtime: mover ou criar (ex.: lead do Meta) uma oportunidade
  useEffect(() => {
    const handleMoved = (data) => {
      if (data.schema !== schema || !data.opportunity) return;
      setOportunidades((prev) =>
        prev.map((o) => (o.id === data.opportunity.id ? { ...o, ...data.opportunity } : o))
      );
    };
    const handleCreated = (data) => {
      if (data.schema !== schema || !data.opportunity) return;
      if (data.opportunity.funnel && data.opportunity.funnel !== funilSelecionado) return;
      setOportunidades((prev) =>
        prev.some((o) => o.id === data.opportunity.id) ? prev : [data.opportunity, ...prev]
      );
    };
    socketInstance.on('opportunityMoved', handleMoved);
    socketInstance.on('opportunityCreated', handleCreated);
    return () => {
      socketInstance.off('opportunityMoved', handleMoved);
      socketInstance.off('opportunityCreated', handleCreated);
    };
  }, [schema, socketInstance, funilSelecionado]);

  // ---- Drag & drop (HTML5 nativo, mesmo padrão do Kanban) ----
  const onDrop = async (stageId) => {
    if (!dragged || dragged.stage_id === stageId) return setDragged(null);
    const id = dragged.id;
    setOportunidades((prev) => prev.map((o) => (o.id === id ? { ...o, stage_id: stageId } : o))); // otimista
    setDragged(null);
    try {
      await axios.put(
        `${url}/opportunity/move-stage`,
        { id, stage_id: stageId, schema },
        { withCredentials: true }
      );
      socketInstance.emit('opportunityMoved', { schema, opportunity: { id, stage_id: stageId } });
    } catch (e) {
      console.error('Erro ao mover oportunidade:', e);
      fetchOportunidades(); // reverte em caso de erro
    }
  };

  const oportunidadesDaEtapa = (stageId) => oportunidades.filter((o) => o.stage_id === stageId);
  const totalDaEtapa = (stageId) =>
    oportunidadesDaEtapa(stageId).reduce((acc, o) => acc + Number(o.value || 0), 0);
  const totalGeral = oportunidades.reduce((acc, o) => acc + Number(o.value || 0), 0);

  // ---- Criar oportunidade ----
  const openModal = () => {
    setForm({ title: '', contact_number: '', source: '', value: '', stage_id: etapas[0]?.id || '' });
    setShowModal(true);
  };
  const submitCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${url}/opportunity/create`,
        {
          schema,
          funnel: funilSelecionado,
          stage_id: form.stage_id || etapas[0]?.id || null,
          title: form.title || null,
          contact_number: form.contact_number || null,
          source: form.source || null,
          value: form.value ? Number(form.value) : 0,
        },
        { withCredentials: true }
      );
      setShowModal(false);
      fetchOportunidades();
    } catch (err) {
      console.error('Erro ao criar oportunidade:', err);
    }
  };

  // ---- Lead scoring (regras) ----
  const loadRules = useCallback(() => {
    if (!schema) return;
    axios
      .get(`${url}/opportunity/score-rules/${schema}`, { withCredentials: true })
      .then((res) => setRules(Array.isArray(res.data?.rules) ? res.data.rules : []))
      .catch((e) => console.error('Erro ao listar regras:', e));
  }, [schema]);

  const openRules = () => {
    setShowRules(true);
    loadRules();
  };

  const addRule = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${url}/opportunity/score-rules`,
        { schema, ...ruleForm, points: Number(ruleForm.points) || 0 },
        { withCredentials: true }
      );
      setRuleForm({ name: '', field: 'source', operator: 'equals', value: '', points: 10 });
      loadRules();
    } catch (err) {
      console.error('Erro ao criar regra:', err);
    }
  };

  const removeRule = async (id) => {
    try {
      await axios.delete(`${url}/opportunity/score-rules/${id}/${schema}`, { withCredentials: true });
      setRules((r) => r.filter((x) => x.id !== id));
    } catch (err) {
      console.error('Erro ao excluir regra:', err);
    }
  };

  const recomputeScores = async () => {
    try {
      await axios.post(`${url}/opportunity/recompute-scores`, { schema }, { withCredentials: true });
      fetchOportunidades();
    } catch (err) {
      console.error('Erro ao recalcular scores:', err);
    }
  };

  return (
    <div className={`h-100 d-flex flex-column p-3 bg-body-${theme || 'light'}`} style={{ overflow: 'hidden' }}>
      {/* Cabeçalho */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-3">
          <h4 className="mb-0 fw-bold">Oportunidades</h4>
          <select
            className="form-select form-select-sm"
            style={{ width: 220 }}
            value={funilSelecionado}
            onChange={(e) => setFunilSelecionado(e.target.value)}
          >
            {funis.length === 0 && <option value="">Nenhum funil</option>}
            {funis.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <span className="badge bg-primary-subtle text-primary-emphasis">
            {oportunidades.length} oportunidades · {formatBRL(totalGeral)}
          </span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2" onClick={openRules}>
            <i className="bi bi-star"></i> Pontuação
          </button>
          <button className="btn btn-primary btn-sm d-flex align-items-center gap-2" onClick={openModal} disabled={!funilSelecionado}>
            <i className="bi bi-plus-lg"></i> Adicionar oportunidade
          </button>
        </div>
      </div>

      {/* Colunas (etapas) */}
      <div className="d-flex gap-3 flex-grow-1" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
        {etapas.length === 0 && !loading && (
          <div className="text-muted p-4">Selecione um funil com etapas para ver o pipeline.</div>
        )}
        {etapas.map((etapa) => (
          <div
            key={etapa.id}
            className="d-flex flex-column"
            style={{ minWidth: 300, maxWidth: 320, height: '100%' }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(etapa.id)}
          >
            <div
              className="rounded-top px-3 py-2 d-flex flex-column"
              style={{ borderTop: `3px solid ${etapa.color || '#6c757d'}`, background: 'var(--bs-tertiary-bg, #f1f3f5)' }}
            >
              <div className="d-flex align-items-center justify-content-between">
                <span className="fw-semibold text-truncate">{etapa.etapa}</span>
                <span className="badge bg-secondary-subtle text-secondary-emphasis">
                  {oportunidadesDaEtapa(etapa.id).length}
                </span>
              </div>
              <small className="text-muted">{formatBRL(totalDaEtapa(etapa.id))}</small>
            </div>

            <div className="flex-grow-1 p-2 rounded-bottom" style={{ overflowY: 'auto', background: 'var(--bs-secondary-bg, #f8f9fa)' }}>
              {oportunidadesDaEtapa(etapa.id).map((o) => (
                <div
                  key={o.id}
                  className="card shadow-sm mb-2"
                  draggable
                  onDragStart={() => setDragged(o)}
                  style={{ cursor: 'grab' }}
                >
                  <div className="card-body p-2">
                    <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
                      <span className="fw-semibold text-truncate">
                        {o.title || o.contact_name || o.contact_number || 'Sem título'}
                      </span>
                      {Number(o.score) > 0 && (
                        <span className="badge bg-warning-subtle text-warning-emphasis flex-shrink-0" title="Lead score">
                          <i className="bi bi-star-fill me-1"></i>{o.score}
                        </span>
                      )}
                    </div>
                    <div className="d-flex justify-content-between small text-muted">
                      <span>Fonte</span>
                      <span className="text-truncate ms-2" style={{ maxWidth: 160 }}>{o.source || '—'}</span>
                    </div>
                    <div className="d-flex justify-content-between small">
                      <span className="text-muted">Valor</span>
                      <span className="fw-semibold text-success">{formatBRL(o.value)}</span>
                    </div>
                    {o.owner_name && (
                      <div className="d-flex align-items-center gap-1 mt-1">
                        <i className="bi bi-person-circle text-muted"></i>
                        <small className="text-muted text-truncate">{o.owner_name}</small>
                      </div>
                    )}
                    <div className="d-flex justify-content-end mt-1">
                      <button
                        className="btn btn-sm btn-outline-warning py-0 px-1"
                        title="Criar lembrete de retorno"
                        onClick={(e) => { e.stopPropagation(); setLembreteAlvo(o); }}
                      >
                        <i className="bi bi-bell"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal criar oportunidade */}
      {showModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: 'rgba(0,0,0,0.4)', zIndex: 1050 }}
          onClick={() => setShowModal(false)}
        >
          <div className="card shadow" style={{ width: 420, maxWidth: '90%' }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={submitCreate}>
              <div className="card-header d-flex justify-content-between align-items-center">
                <strong>Nova oportunidade</strong>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="card-body d-flex flex-column gap-2">
                <input className="form-control" placeholder="Título" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <input className="form-control" placeholder="Telefone do contato (opcional)" value={form.contact_number}
                  onChange={(e) => setForm({ ...form, contact_number: e.target.value })} />
                <input className="form-control" placeholder="Fonte (ex.: Meta ADs)" value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })} />
                <input className="form-control" type="number" step="0.01" placeholder="Valor (R$)" value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })} />
                <select className="form-select" value={form.stage_id}
                  onChange={(e) => setForm({ ...form, stage_id: e.target.value })}>
                  {etapas.map((et) => (
                    <option key={et.id} value={et.id}>{et.etapa}</option>
                  ))}
                </select>
              </div>
              <div className="card-footer d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary btn-sm">Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {lembreteAlvo && (
        <LembreteRapido
          theme={theme}
          show={!!lembreteAlvo}
          onHide={() => setLembreteAlvo(null)}
          contactNumber={lembreteAlvo.contact_number}
          contactName={lembreteAlvo.contact_name || lembreteAlvo.title}
          opportunityId={lembreteAlvo.id}
        />
      )}

      {/* Modal regras de pontuação (lead scoring) */}
      {showRules && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: 'rgba(0,0,0,0.4)', zIndex: 1050 }}
          onClick={() => setShowRules(false)}
        >
          <div className="card shadow" style={{ width: 640, maxWidth: '95%', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="card-header d-flex justify-content-between align-items-center">
              <strong>Regras de pontuação (Lead Scoring)</strong>
              <button type="button" className="btn-close" onClick={() => setShowRules(false)}></button>
            </div>
            <div className="card-body" style={{ overflowY: 'auto' }}>
              {rules.length === 0 ? (
                <div className="text-muted small mb-3">Nenhuma regra. Some pontos por atributo da oportunidade (ex.: Fonte = Meta ADs → +20).</div>
              ) : (
                <ul className="list-group list-group-flush mb-3">
                  {rules.map((r) => (
                    <li key={r.id} className="list-group-item d-flex align-items-center justify-content-between px-0">
                      <div className="small">
                        <strong>{r.name}</strong>{' '}
                        <span className="text-muted">
                          ({r.field} {r.operator} {r.value ?? ''})
                        </span>{' '}
                        <span className="badge bg-warning-subtle text-warning-emphasis">+{r.points}</span>
                      </div>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => removeRule(r.id)} title="Excluir">
                        <i className="bi bi-trash"></i>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <form onSubmit={addRule} className="border-top pt-3">
                <div className="row g-2">
                  <div className="col-12">
                    <input className="form-control form-control-sm" placeholder="Nome da regra" value={ruleForm.name}
                      onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} required />
                  </div>
                  <div className="col-md-3">
                    <select className="form-select form-select-sm" value={ruleForm.field}
                      onChange={(e) => setRuleForm({ ...ruleForm, field: e.target.value })}>
                      <option value="source">Fonte</option>
                      <option value="value">Valor</option>
                      <option value="stage_id">Etapa</option>
                      <option value="has_phone">Tem telefone</option>
                      <option value="title">Título</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <select className="form-select form-select-sm" value={ruleForm.operator}
                      onChange={(e) => setRuleForm({ ...ruleForm, operator: e.target.value })}>
                      <option value="equals">igual a</option>
                      <option value="contains">contém</option>
                      <option value="gt">maior que</option>
                      <option value="gte">maior/igual</option>
                      <option value="exists">existe</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <input className="form-control form-control-sm" placeholder="Valor" value={ruleForm.value}
                      onChange={(e) => setRuleForm({ ...ruleForm, value: e.target.value })} />
                  </div>
                  <div className="col-md-2">
                    <input className="form-control form-control-sm" type="number" placeholder="Pts" value={ruleForm.points}
                      onChange={(e) => setRuleForm({ ...ruleForm, points: e.target.value })} />
                  </div>
                </div>
                <div className="d-flex justify-content-between mt-3">
                  <button type="button" className="btn btn-outline-primary btn-sm" onClick={recomputeScores}>
                    <i className="bi bi-arrow-repeat me-1"></i> Recalcular scores
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm">Adicionar regra</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
