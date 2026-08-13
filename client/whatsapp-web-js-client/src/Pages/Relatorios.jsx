import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Relatórios de atendimento (gerados por IA no fechamento do chat).
// Escopo por papel é aplicado NO SERVIDOR: operacional vê os seus,
// líder vê os das filas que lidera, master/técnico veem todos.
function RelatorioPage({ theme }) {
  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  const load = useCallback(() => {
    if (!schema) return;
    setLoading(true);
    axios
      .get(`${url}/report/get-reports/${schema}`, { withCredentials: true })
      .then((res) => setReports(Array.isArray(res.data?.result) ? res.data.result : []))
      .catch((e) => console.error('Erro ao buscar relatórios:', e))
      .finally(() => setLoading(false));
  }, [schema, url]);

  useEffect(() => { load(); }, [load]);

  const categorias = [...new Set(reports.map((r) => r.categoria).filter(Boolean))];
  const statuses = [...new Set(reports.map((r) => r.status).filter(Boolean))];

  const filtrados = reports.filter((r) =>
    (!filtroCategoria || r.categoria === filtroCategoria) &&
    (!filtroStatus || r.status === filtroStatus)
  );

  const exportCsv = () => {
    const header = ['Categoria', 'Resumo', 'Assertividade', 'Status', 'Próxima etapa'];
    const rows = filtrados.map((r) => [r.categoria, r.resumo, r.assertividade, r.status, r.proxima_etapa]
      .map((v) => `"${String(v || '').replace(/"/g, '""')}"`).join(';'));
    const blob = new Blob(['﻿' + [header.join(';'), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `relatorios-${schema}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className={`h-100 p-4 bg-body-${theme || 'light'}`} style={{ overflowY: 'auto' }}>
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-bar-chart-line fs-4"></i>
          <h4 className="mb-0 fw-bold">Relatórios de Atendimento</h4>
          <span className="badge bg-primary-subtle text-primary-emphasis">{filtrados.length}</span>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <select className="form-select form-select-sm" style={{ width: 180 }} value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
            <option value="">Todas as categorias</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="form-select form-select-sm" style={{ width: 160 }} value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn btn-outline-secondary btn-sm" onClick={load} title="Atualizar">
            <i className="bi bi-arrow-repeat"></i>
          </button>
          <button className="btn btn-outline-primary btn-sm" onClick={exportCsv} disabled={filtrados.length === 0}>
            <i className="bi bi-download me-1"></i>Exportar CSV
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr className="text-muted small">
                <th>Categoria</th>
                <th style={{ minWidth: 280 }}>Resumo</th>
                <th>Assertividade</th>
                <th>Status</th>
                <th>Próxima etapa</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="text-center py-4 text-muted">Carregando…</td></tr>
              )}
              {!loading && filtrados.length === 0 && (
                <tr><td colSpan={5} className="text-center py-4 text-muted">
                  Nenhum relatório ainda. Eles são gerados automaticamente quando um atendimento é finalizado.
                </td></tr>
              )}
              {filtrados.map((r) => (
                <tr key={r.id}>
                  <td><span className="badge bg-secondary-subtle text-secondary-emphasis">{r.categoria}</span></td>
                  <td className="small">{r.resumo}</td>
                  <td className="small">{r.assertividade}</td>
                  <td><span className="badge bg-info-subtle text-info-emphasis">{r.status}</span></td>
                  <td className="small">{r.proxima_etapa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default RelatorioPage;
