import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button } from 'react-bootstrap';
import axios from 'axios';

const formatarDataHora = (timestamp) => {
  if (!timestamp) return '—';
  let ts = Number(timestamp);
  if (ts < 1000000000000) ts = ts * 1000;
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
};

const formatarIntervalo = (campaing) => {
  const min = Number(campaing?.min) || 0;
  const max = Number(campaing?.max) || 0;
  if (min > 0 || max > 0) return `${min}s a ${max}s (aleatório)`;
  const fixo = Number(campaing?.timer) || 0;
  return `${fixo}s (fixo)`;
};

const ROTULO_STATUS = {
  enviado: { texto: 'Enviado', cor: 'success' },
  falha: { texto: 'Falha', cor: 'danger' },
  pendente: { texto: 'Pendente', cor: 'secondary' },
};

function DetalhesDisparoModal({ theme, show, onHide, disparoId }) {
  const [detalhes, setDetalhes] = useState(null);
  const [metricas, setMetricas] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;

  const carregar = useCallback(async () => {
    if (!disparoId) return;
    setCarregando(true);
    setErro('');
    try {
      const [resDetalhes, resMetricas] = await Promise.all([
        axios.get(`${url}/campaing/details/${disparoId}/${schema}`, { withCredentials: true }),
        axios.get(`${url}/campaing/metrics/${disparoId}/${schema}`, { withCredentials: true }),
      ]);
      setDetalhes(resDetalhes.data);
      setMetricas(resMetricas.data);
    } catch (error) {
      console.error('Erro ao carregar detalhes do disparo:', error);
      setErro('Não foi possível carregar os dados deste disparo.');
    } finally {
      setCarregando(false);
    }
  }, [disparoId, schema, url]);

  useEffect(() => {
    if (show) carregar();
  }, [show, carregar]);

  const campaing = detalhes?.campaing;
  // Um disparo só sai do papel com canal e mensagem — avisar aqui evita
  // descobrir que nada foi enviado só depois da hora marcada.
  const semCanal = detalhes && detalhes.canais.length === 0;
  const semMensagem = detalhes && detalhes.mensagens.length === 0;
  const semContato = detalhes && detalhes.total_contatos_alvo === 0;

  const Metrica = ({ rotulo, valor, cor }) => (
    <div className={`card-${theme} border-${theme} rounded p-3 text-center flex-grow-1`} style={{ minWidth: 120 }}>
      <div className={`h3 mb-0 text-${cor || 'body'}`} style={{ fontWeight: 600 }}>{valor}</div>
      <div className={`card-subtitle-${theme} small`}>{rotulo}</div>
    </div>
  );

  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable>
      <Modal.Header closeButton className={`bg-form-${theme}`}>
        <Modal.Title className={`header-text-${theme}`}>
          {campaing ? campaing.campaing_name : 'Detalhes do Disparo'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className={`bg-form-${theme}`}>
        {carregando && (
          <div className={`text-center py-4 card-subtitle-${theme}`}>Carregando…</div>
        )}

        {erro && !carregando && (
          <div className="alert alert-danger" role="alert">{erro}</div>
        )}

        {!carregando && !erro && detalhes && (
          <>
            {(semCanal || semMensagem || semContato) && (
              <div className="alert alert-warning" role="alert">
                <i className="bi bi-exclamation-triangle me-2"></i>
                <strong>Este disparo não vai enviar nada como está:</strong>
                <ul className="mb-0 mt-2">
                  {semCanal && <li>Nenhum canal selecionado.</li>}
                  {semMensagem && <li>Nenhum modelo de mensagem cadastrado.</li>}
                  {semContato && <li>Nenhum contato na etapa alvo.</li>}
                </ul>
              </div>
            )}

            {/* ---- Configuração ---- */}
            <h6 className={`header-text-${theme} mb-3`}>Configuração</h6>
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <div className={`card-subtitle-${theme} small`}>Início programado</div>
                <div className={`header-text-${theme}`}>{formatarDataHora(campaing?.start_date)}</div>
              </div>
              <div className="col-md-6">
                <div className={`card-subtitle-${theme} small`}>Intervalo entre envios</div>
                <div className={`header-text-${theme}`}>{formatarIntervalo(campaing)}</div>
              </div>
              <div className="col-md-6">
                <div className={`card-subtitle-${theme} small`}>Funil / Etapa alvo</div>
                <div className={`header-text-${theme}`}>
                  {campaing?.sector || '—'}
                  {detalhes.etapa ? ` › ${detalhes.etapa.etapa}` : ' › (etapa não encontrada)'}
                </div>
              </div>
              <div className="col-md-6">
                <div className={`card-subtitle-${theme} small`}>Contatos na etapa</div>
                <div className={`header-text-${theme}`}>{detalhes.total_contatos_alvo}</div>
              </div>
              <div className="col-12">
                <div className={`card-subtitle-${theme} small`}>Canais</div>
                <div className={`header-text-${theme}`}>
                  {detalhes.canais.length > 0
                    ? detalhes.canais.map((c) => `${c.name} (${c.number})`).join(' · ')
                    : 'Nenhum canal'}
                </div>
              </div>
            </div>

            {/* ---- Mensagens ---- */}
            <h6 className={`header-text-${theme} mb-3`}>
              Modelos de mensagem ({detalhes.mensagens.length})
            </h6>
            <div className="d-flex flex-column gap-2 mb-4">
              {detalhes.mensagens.map((m, i) => (
                <div key={m.id} className={`card-${theme} border-${theme} rounded p-3`}>
                  <div className={`card-subtitle-${theme} small mb-1`}>
                    Modelo {i + 1}{m.image ? ' · com imagem' : ''}
                  </div>
                  <div className={`header-text-${theme}`} style={{ whiteSpace: 'pre-wrap' }}>{m.value}</div>
                </div>
              ))}
              {detalhes.mensagens.length === 0 && (
                <div className={`card-subtitle-${theme}`}>Nenhum modelo cadastrado.</div>
              )}
            </div>

            {/* ---- Métricas ---- */}
            <h6 className={`header-text-${theme} mb-3`}>Métricas</h6>
            {metricas && metricas.total === 0 ? (
              <div className={`card-subtitle-${theme} mb-3`}>
                Nenhum envio registrado ainda. Os números aparecem aqui assim que o disparo é agendado e começa a rodar.
              </div>
            ) : metricas && (
              <>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  <Metrica rotulo="Enviados" valor={metricas.enviados} cor="success" />
                  <Metrica rotulo="Pendentes" valor={metricas.pendentes} />
                  <Metrica rotulo="Falhas" valor={metricas.falhas} cor="danger" />
                  <Metrica rotulo="Respostas" valor={metricas.respostas} cor="primary" />
                  <Metrica rotulo="Taxa de resposta" valor={`${metricas.taxa_resposta}%`} cor="primary" />
                </div>

                <div className={`card-subtitle-${theme} small mb-3`}>
                  Primeiro envio: {formatarDataHora(metricas.primeiro_envio)} · Último envio: {formatarDataHora(metricas.ultimo_envio)}
                </div>

                <div className={`table-responsive custom-table-${theme}`} style={{ maxHeight: 320, overflowY: 'auto' }}>
                  <table className="table table-bordered table-hover m-0">
                    <thead>
                      <tr>
                        <th className={`header-text-${theme}`} style={{ position: 'sticky', top: 0, zIndex: 2 }}>Contato</th>
                        <th className={`header-text-${theme}`} style={{ position: 'sticky', top: 0, zIndex: 2 }}>Canal</th>
                        <th className={`header-text-${theme}`} style={{ position: 'sticky', top: 0, zIndex: 2 }}>Status</th>
                        <th className={`header-text-${theme}`} style={{ position: 'sticky', top: 0, zIndex: 2 }}>Enviado em</th>
                        <th className={`header-text-${theme}`} style={{ position: 'sticky', top: 0, zIndex: 2 }}>Respondeu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metricas.contatos.map((c) => {
                        const rotulo = ROTULO_STATUS[c.status] || { texto: c.status, cor: 'secondary' };
                        return (
                          <tr key={c.contact_number}>
                            <td className={`card-subtitle-${theme}`}>
                              {c.contact_name || '—'}
                              <div className="small opacity-75">{c.contact_number}</div>
                            </td>
                            <td className={`card-subtitle-${theme}`}>{c.canal || '—'}</td>
                            <td className={`card-subtitle-${theme}`}>
                              <span className={`badge bg-${rotulo.cor}`}>{rotulo.texto}</span>
                              {c.error && <div className="small text-danger mt-1">{c.error}</div>}
                            </td>
                            <td className={`card-subtitle-${theme}`}>{formatarDataHora(c.sent_at)}</td>
                            <td className={`card-subtitle-${theme}`}>{c.respondeu ? 'Sim' : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </Modal.Body>

      <Modal.Footer className={`bg-form-${theme} d-flex justify-content-between`}>
        <Button onClick={carregar} className={`btn-2-${theme}`} disabled={carregando}>
          <i className="bi bi-arrow-clockwise me-2"></i>Atualizar
        </Button>
        <Button onClick={onHide} className={`btn-1-${theme}`}>Fechar</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default DetalhesDisparoModal;
