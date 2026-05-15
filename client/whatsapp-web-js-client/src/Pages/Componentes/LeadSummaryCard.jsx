import React, { useEffect, useState } from 'react';
import { api } from '../../utils/axiosConfig';
import { socket } from '../../socket';

// Card no Dashboard que mostra os resumos automaticos de leads (gerados
// pelo bot 24h apos a primeira mensagem do cliente).
function LeadSummaryCard({ theme }) {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.get('/lead-summaries/?limit=20');
        if (!cancelled) setSummaries(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch (err) {
        console.error('Falha ao carregar resumos de lead:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!socket) return undefined;
    const handler = (summary) => {
      setSummaries((prev) => {
        const without = prev.filter((s) => s.id !== summary.id && s.chat_id !== summary.chat_id);
        return [summary, ...without];
      });
    };
    socket.on('lead_summary_ready', handler);
    return () => socket.off('lead_summary_ready', handler);
  }, []);

  const markRead = async (id) => {
    try {
      await api.put(`/lead-summaries/${id}/read`);
      setSummaries((prev) => prev.map((s) => (s.id === id ? { ...s, read_at: Date.now() } : s)));
    } catch (err) {
      console.error('Falha ao marcar resumo como lido:', err);
    }
  };

  const toggle = (s) => {
    setExpanded((current) => (current === s.id ? null : s.id));
    if (!s.read_at) markRead(s.id);
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    try { return new Date(Number(ts)).toLocaleString(); } catch (_) { return ''; }
  };

  return (
    <div
      className={`card card-${theme} mx-3 my-2`}
      style={{ overflow: 'hidden' }}
    >
      <div
        className="card-header d-flex justify-content-between align-items-center"
        style={{ background: 'transparent' }}
      >
        <div className={`header-text-${theme} d-flex align-items-center gap-2`} style={{ fontWeight: 600 }}>
          <i className="bi bi-stars" />
          Resumos de Leads (24h)
        </div>
        {summaries.some((s) => !s.read_at) && (
          <span
            className="badge"
            style={{ background: 'var(--primary-color)', color: 'white' }}
          >
            {summaries.filter((s) => !s.read_at).length} novo(s)
          </span>
        )}
      </div>
      <div className="card-body p-0" style={{ maxHeight: 320, overflowY: 'auto' }}>
        {loading && (
          <div className={`p-3 card-subtitle-${theme}`}>Carregando…</div>
        )}
        {!loading && summaries.length === 0 && (
          <div className={`p-3 card-subtitle-${theme}`}>
            Nenhum resumo gerado ainda. O bot escreve um para cada lead 24h após o primeiro contato.
          </div>
        )}
        {!loading && summaries.map((s) => {
          const isOpen = expanded === s.id;
          return (
            <div
              key={s.id}
              className={`border-top border-${theme} px-3 py-2`}
              style={{ cursor: 'pointer' }}
              onClick={() => toggle(s)}
            >
              <div className="d-flex justify-content-between align-items-center">
                <div className={`header-text-${theme}`} style={{ fontWeight: s.read_at ? 400 : 600 }}>
                  {s.contact_name || s.contact_phone || 'Lead'}
                  {!s.read_at && (
                    <span
                      className="ms-2"
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--primary-color)',
                      }}
                    />
                  )}
                </div>
                <small className={`card-subtitle-${theme}`}>{formatDate(s.generated_at)}</small>
              </div>
              {isOpen && (
                <div className={`mt-2 card-subtitle-${theme}`}>
                  {s.summary && (
                    <div className="mb-2">
                      <strong>Resumo:</strong> {s.summary}
                    </div>
                  )}
                  {s.next_step && (
                    <div>
                      <strong>Próxima etapa:</strong> {s.next_step}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LeadSummaryCard;
