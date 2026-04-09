import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../utils/axiosConfig';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

function VoiceTranscriptsPage({ theme }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedModalContent, setSelectedModalContent] = useState(null);
  const { showError } = useToast();
  const { userData } = useAuth();
  const schema = userData?.schema;

  useEffect(() => {
    fetchRows();
  }, [schema]);

  const fetchRows = async () => {
    if (!schema) return;

    try {
      setLoading(true);
      const response = await api.get(`/chat/get-voice-transcripts/${schema}`);
      const data = Array.isArray(response.data?.data) ? response.data.data : (Array.isArray(response.data) ? response.data : []);
      setRows(data);
    } catch (error) {
      console.error('Erro ao buscar transcricoes:', error);
      showError('Erro ao carregar transcricoes');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const textClass = `text-${theme === 'light' ? 'dark' : 'light'}`;
  const compactTextStyle = { fontSize: '0.75rem', lineHeight: 1.2 };
  const compactHeaderStyle = { fontSize: '0.72rem', lineHeight: 1.1, fontWeight: 600 };

  const normalizeTranscript = (rawValue) => {
    if (!rawValue) return '';

    let formatted = String(rawValue).trim();

    // Alguns registros chegam como string JSON escapada: "linha1\nlinha2"
    try {
      if ((formatted.startsWith('"') && formatted.endsWith('"')) || (formatted.startsWith("'") && formatted.endsWith("'"))) {
        formatted = JSON.parse(formatted);
      }
    } catch (error) {
      // Se falhar o parse, segue com tratamento textual simples.
    }

    formatted = formatted
      .replace(/\\n/g, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    const lines = formatted
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    return lines.join('\n\n');
  };

  const normalizeExtractedData = (rawValue) => {
    if (rawValue === null || rawValue === undefined || rawValue === '') return {};
    if (typeof rawValue === 'object' && !Array.isArray(rawValue)) return rawValue;

    const formatted = String(rawValue).trim();
    try {
      const parsed = JSON.parse(formatted);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
      return { valor: parsed };
    } catch (error) {
      return { valor: formatted };
    }
  };

  const formatExtractedValue = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'string') {
      return value
        .replace(/\\n/g, '\n')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .join(' ');
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (error) {
        return String(value);
      }
    }
    return String(value);
  };

  const getTranslatedColumnName = (key) => {
    const translations = {
      summary: 'Resumo',
      next_step: 'Proximo passo',
      nextStep: 'Proximo passo',
      objections: 'Objecoes',
      objection: 'Objecao',
      concern: 'Preocupacao',
      concerns: 'Preocupacoes',
      urgency: 'Urgencia',
      engagement: 'Engajamento',
      score: 'Pontuacao',
      classification: 'Classificacao',
      sentiment: 'Sentimento',
      intent: 'Intencao',
      confidence: 'Confianca',
      budget: 'Orcamento',
      credit_value: 'Valor da carta',
      creditValue: 'Valor da carta',
      timeline: 'Prazo',
      contact_preference: 'Preferencia de contato',
      contactPreference: 'Preferencia de contato',
      city: 'Cidade',
      state: 'Estado',
      notes: 'Observacoes',
      qualifiable: 'Qualificavel',
      budget_range: 'Faixa de orcamento',
      budgetRange: 'Faixa de orcamento',
      call_ended_by: 'Encerrado por',
      callEndedBy: 'Encerrado por',
      interest_level: 'Nivel de interesse',
      interestLevel: 'Nivel de interesse',
      has_down_payment: 'Tem entrada',
      hasDownPayment: 'Tem entrada',
      objections_count: 'Qtd. de objecoes',
      objectionsCount: 'Qtd. de objecoes',
      product_interest: 'Interesse em produto',
      productInterest: 'Interesse em produto',
      down_payment_value: 'Valor da entrada',
      downPaymentValue: 'Valor da entrada'
    };

    if (translations[key]) return translations[key];
    const normalizedKey = key
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/\s+/g, '_')
      .toLowerCase();
    if (translations[normalizedKey]) return translations[normalizedKey];

    const humanized = key
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    const wordMap = {
      summary: 'resumo',
      next: 'proximo',
      step: 'passo',
      objection: 'objecao',
      objections: 'objecoes',
      qualifiable: 'qualificavel',
      budget: 'orcamento',
      range: 'faixa',
      call: 'chamada',
      ended: 'encerrada',
      by: 'por',
      interest: 'interesse',
      level: 'nivel',
      has: 'tem',
      down: 'entrada',
      payment: 'pagamento',
      count: 'quantidade',
      product: 'produto',
      value: 'valor',
      urgency: 'urgencia',
      engagement: 'engajamento',
      classification: 'classificacao',
      confidence: 'confianca',
      intent: 'intencao',
      notes: 'observacoes',
      city: 'cidade',
      state: 'estado'
    };

    const translated = humanized
      .split(' ')
      .map((word) => wordMap[word] || word)
      .join(' ')
      .replace(/^./, (char) => char.toUpperCase());

    return translated;
  };

  const parsedRows = useMemo(() => {
    return rows.map((row, index) => {
      const extractedObject = normalizeExtractedData(row?.extracted_data);

      const transcript = normalizeTranscript(row?.transcript_raw || '');
      const transcriptOneLine = transcript.replace(/\s*\n\s*/g, ' ').trim();
      const transcriptShort = transcriptOneLine.length > 100 ? `${transcriptOneLine.slice(0, 100)}...` : transcriptOneLine || '-';

      return {
        key: row?.id || `${row?.call_id || 'call'}-${index}`,
        phone_dialed: row?.phone_dialed || '-',
        transcript_raw: transcript,
        transcript_short: transcriptShort,
        extracted_data: extractedObject,
        extraction_at: row?.extraction_at ? new Date(row.extraction_at).toLocaleString('pt-BR') : '-'
      };
    });
  }, [rows]);

  const extractedColumns = useMemo(() => {
    const keys = new Set();
    parsedRows.forEach((row) => {
      if (row.extracted_data && typeof row.extracted_data === 'object') {
        Object.keys(row.extracted_data).forEach((key) => keys.add(key));
      }
    });
    return Array.from(keys);
  }, [parsedRows]);

  return (
    <div className={`bg-screen-${theme} w-100 h-100`}>
      <div className="container-fluid py-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className={textClass}>Transcricoes de Voz</h5>
          <button className={`btn btn-2-${theme}`} onClick={fetchRows} disabled={loading}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            Atualizar
          </button>
        </div>

        {loading ? (
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '320px' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
          </div>
        ) : parsedRows.length === 0 ? (
          <div className={`card border-${theme} card-${theme}`}>
            <div className="card-body text-center py-5">
              <i className="bi bi-inbox" style={{ fontSize: '48px', opacity: 0.5 }}></i>
              <p className="mt-3 mb-0">Nenhuma transcricao encontrada</p>
            </div>
          </div>
        ) : (
          <div className={`card border-${theme} card-${theme}`}>
            <div className="card-body p-0">
              <div className="table-responsive" style={{ maxHeight: '70vh' }}>
                <table className="table table-hover table-sm mb-0" style={{ tableLayout: 'fixed' }}>
                  <thead className={`bg-form-${theme}`}>
                    <tr>
                      <th className={textClass} style={{ minWidth: '160px', ...compactHeaderStyle }}>Telefone discado</th>
                      <th className={textClass} style={{ minWidth: '300px', ...compactHeaderStyle }}>Transcricao bruta</th>
                      {extractedColumns.map((column) => (
                        <th key={column} className={textClass} style={{ minWidth: '180px', ...compactHeaderStyle }}>
                          {getTranslatedColumnName(column)}
                        </th>
                      ))}
                      <th className={textClass} style={{ minWidth: '170px', ...compactHeaderStyle }}>Extraido em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row) => (
                      <tr key={row.key} className={`border-${theme}`}>
                        <td className={textClass} style={compactTextStyle}>
                          <span className="d-inline-block text-truncate w-100">{row.phone_dialed}</span>
                        </td>
                        <td className={textClass} style={compactTextStyle}>
                          <div className="d-flex align-items-center gap-2">
                            <span className="text-truncate" style={{ maxWidth: '85%' }}>{row.transcript_short}</span>
                            {row.transcript_raw ? (
                              <button
                                type="button"
                                className={`btn btn-sm btn-2-${theme}`}
                                onClick={() => setSelectedModalContent({ title: 'Transcript Raw Completo', content: row.transcript_raw })}
                              >
                                <i className="bi bi-eye"></i>
                              </button>
                            ) : null}
                          </div>
                        </td>
                        {extractedColumns.map((column) => {
                          const rawValue = row.extracted_data?.[column];
                          const formattedValue = formatExtractedValue(rawValue);
                          const isLong = formattedValue.length > 70;
                          const shortValue = isLong ? `${formattedValue.slice(0, 70)}...` : formattedValue;

                          return (
                            <td key={`${row.key}-${column}`} className={textClass} style={compactTextStyle}>
                              <div className="d-flex align-items-center gap-2">
                                <span
                                  className="text-truncate"
                                  style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '85%' }}
                                  title={formattedValue}
                                >
                                  {shortValue || '-'}
                                </span>
                                {isLong ? (
                                  <button
                                    type="button"
                                    className={`btn btn-sm btn-2-${theme}`}
                                    onClick={() =>
                                      setSelectedModalContent({
                                        title: `${column} - Detalhe`,
                                        content: typeof rawValue === 'object' ? JSON.stringify(rawValue, null, 2) : formattedValue
                                      })
                                    }
                                  >
                                    <i className="bi bi-eye"></i>
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          );
                        })}
                        <td className={textClass} style={compactTextStyle}>{row.extraction_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedModalContent !== null ? (
        <div className="modal d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable" role="document">
            <div className={`modal-content bg-form-${theme}`}>
              <div className="modal-header">
                <h5 className={`modal-title ${textClass}`}>{selectedModalContent.title}</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setSelectedModalContent(null)}
                ></button>
              </div>
              <div className="modal-body">
                <pre className={`mb-0 ${textClass}`} style={{ whiteSpace: 'pre-wrap' }}>
                  {selectedModalContent.content}
                </pre>
              </div>
              <div className="modal-footer">
                <button type="button" className={`btn btn-2-${theme}`} onClick={() => setSelectedModalContent(null)}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default VoiceTranscriptsPage;
