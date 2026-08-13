import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const url = process.env.REACT_APP_URL;

const formatBRL = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));

const DIMENSIONS = [
  { key: 'source', label: 'Fonte' },
  { key: 'campaign', label: 'Campanha (UTM)' },
  { key: 'campaign_name', label: 'Campanha (nome)' },
  { key: 'utm_source', label: 'UTM Source' },
  { key: 'ad', label: 'Anúncio (ad_id)' },
];

export default function Attribution({ theme }) {
  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  const schema = userData?.schema;

  const [funis, setFunis] = useState([]);
  const [funil, setFunil] = useState('');
  const [dimension, setDimension] = useState('source');
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!schema) return;
    axios
      .get(`${url}/kanban/get-funis/${schema}`, { withCredentials: true })
      .then((res) => setFunis(Array.isArray(res.data?.name) ? res.data.name : []))
      .catch((e) => console.error('Erro ao buscar funis:', e));
  }, [schema]);

  const load = useCallback(() => {
    if (!schema) return;
    setLoading(true);
    const funnelQ = funil ? `&funnel=${encodeURIComponent(funil)}` : '';
    Promise.all([
      axios.get(`${url}/attribution/report/${schema}?dimension=${dimension}${funnelQ}`, { withCredentials: true }),
      axios.get(`${url}/attribution/summary/${schema}?${funnelQ.slice(1)}`, { withCredentials: true }),
    ])
      .then(([rep, sum]) => {
        setRows(Array.isArray(rep.data?.rows) ? rep.data.rows : []);
        setSummary(sum.data?.summary || null);
      })
      .catch((e) => console.error('Erro no relatório de atribuição:', e))
      .finally(() => setLoading(false));
  }, [schema, dimension, funil]);

  useEffect(() => {
    load();
  }, [load]);

  const maxLeads = rows.reduce((m, r) => Math.max(m, Number(r.leads) || 0), 0) || 1;

  const Tile = ({ label, value, icon }) => (
    <div className="col-6 col-md-3">
      <div className="card h-100">
        <div className="card-body py-3">
          <div className="d-flex align-items-center gap-2 text-muted small mb-1">
            <i className={`bi ${icon}`}></i> {label}
          </div>
          <div className="fs-4 fw-bold">{value}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`h-100 p-4 bg-body-${theme || 'light'}`} style={{ overflowY: 'auto' }}>
      <div className="d-flex align-items-center justify-content-between mb-1 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-graph-up-arrow fs-4"></i>
          <h4 className="mb-0 fw-bold">Atribuição</h4>
        </div>
        <div className="d-flex align-items-center gap-2">
          <select className="form-select form-select-sm" style={{ width: 170 }} value={funil} onChange={(e) => setFunil(e.target.value)}>
            <option value="">Todos os funis</option>
            {funis.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <select className="form-select form-select-sm" style={{ width: 180 }} value={dimension} onChange={(e) => setDimension(e.target.value)}>
            {DIMENSIONS.map((d) => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </select>
          <button className="btn btn-outline-secondary btn-sm" onClick={load} title="Atualizar">
            <i className="bi bi-arrow-repeat"></i>
          </button>
        </div>
      </div>
      <p className="text-muted mb-4">De onde vêm seus leads e quanto cada origem gera.</p>

      {/* Resumo */}
      <div className="row g-3 mb-4">
        <Tile label="Leads" value={summary?.leads ?? '—'} icon="bi-people" />
        <Tile label="Valor em pipeline" value={summary ? formatBRL(summary.total_value) : '—'} icon="bi-cash-stack" />
        <Tile label="Ganhos" value={summary ? formatBRL(summary.won_value) : '—'} icon="bi-trophy" />
        <Tile label="Conversão" value={summary ? `${summary.conversion_rate}%` : '—'} icon="bi-percent" />
      </div>

      {/* Tabela por dimensão */}
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr className="text-muted small">
                <th style={{ minWidth: 220 }}>{DIMENSIONS.find((d) => d.key === dimension)?.label}</th>
                <th className="text-end">Leads</th>
                <th className="text-end">Valor total</th>
                <th className="text-end">Ganhos</th>
                <th className="text-end">Conversão</th>
                <th className="text-end">Score médio</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    {loading ? 'Carregando…' : 'Sem dados de atribuição ainda.'}
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.key}>
                  <td>
                    <div className="fw-semibold text-truncate">{r.key}</div>
                    <div className="progress mt-1" style={{ height: 4 }}>
                      <div className="progress-bar" style={{ width: `${(r.leads / maxLeads) * 100}%` }}></div>
                    </div>
                  </td>
                  <td className="text-end">{r.leads}</td>
                  <td className="text-end">{formatBRL(r.total_value)}</td>
                  <td className="text-end text-success">{formatBRL(r.won_value)}</td>
                  <td className="text-end">{r.conversion_rate}%</td>
                  <td className="text-end">
                    {Number(r.avg_score) > 0 ? (
                      <span className="badge bg-warning-subtle text-warning-emphasis">
                        <i className="bi bi-star-fill me-1"></i>{r.avg_score}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <small className="text-muted d-block mt-3">
        Leads do Meta são atribuídos automaticamente (fonte, campanha e ad_id). Ganhos consideram oportunidades com status "won".
      </small>
    </div>
  );
}
