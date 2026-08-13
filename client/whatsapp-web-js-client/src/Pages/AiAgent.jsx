import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const url = process.env.REACT_APP_URL;

const MODES = [
  { key: 'disabled', label: 'Desativado', icon: 'bi-power', desc: 'O agente não responde às mensagens.' },
  { key: 'suggestive', label: 'Sugestivo', icon: 'bi-lightbulb', desc: 'Sugere respostas ao atendente (não envia sozinho).' },
  { key: 'autopilot', label: 'Piloto Automático', icon: 'bi-robot', desc: 'Responde automaticamente com base no treino.' },
];

const empty = {
  name: 'Agente',
  status: 'disabled',
  business_name: '',
  persona: '',
  knowledge_base: '',
  wait_seconds: 0,
  max_messages: 10,
  reactivate_seconds: 3600,
};

export default function AiAgent({ theme }) {
  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  const schema = userData?.schema;

  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [integrations, setIntegrations] = useState({ keys: [], usage: null, has_env_fallback: false });
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);

  const load = useCallback(() => {
    if (!schema) return;
    setLoading(true);
    axios
      .get(`${url}/ai-agent/config/${schema}`, { withCredentials: true })
      .then((res) => {
        if (res.data?.config) setForm({ ...empty, ...res.data.config });
      })
      .catch((e) => console.error('Erro ao carregar config do agente:', e))
      .finally(() => setLoading(false));
  }, [schema]);

  const loadDocs = useCallback(() => {
    if (!schema) return;
    axios
      .get(`${url}/ai-agent/documents/${schema}`, { withCredentials: true })
      .then((res) => setDocuments(Array.isArray(res.data?.documents) ? res.data.documents : []))
      .catch((e) => console.error('Erro ao listar documentos:', e));
  }, [schema]);

  const loadIntegrations = useCallback(() => {
    if (!schema) return;
    axios
      .get(`${url}/ai-agent/integrations/${schema}`, { withCredentials: true })
      .then((res) => setIntegrations(res.data || { keys: [], usage: null }))
      .catch((e) => console.error('Erro ao carregar integrações:', e));
  }, [schema]);

  useEffect(() => {
    load();
    loadDocs();
    loadIntegrations();
  }, [load, loadDocs, loadIntegrations]);

  const saveApiKey = async () => {
    if (!apiKeyInput.trim()) return;
    setSavingKey(true);
    try {
      await axios.put(`${url}/ai-agent/integrations`, { key: 'openai_api_key', value: apiKeyInput.trim() }, { withCredentials: true });
      setApiKeyInput('');
      loadIntegrations();
      setSavedMsg('Chave de API salva com sucesso.');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (e) {
      console.error('Erro ao salvar chave:', e);
      setSavedMsg('Erro ao salvar a chave de API.');
    } finally {
      setSavingKey(false);
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const uploadDoc = async (file) => {
    if (!file || !schema) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('schema', schema);
      await axios.post(`${url}/ai-agent/documents`, fd, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      loadDocs();
    } catch (e) {
      console.error('Erro ao enviar documento:', e);
      setSavedMsg('Erro ao enviar documento.');
    } finally {
      setUploading(false);
    }
  };

  const deleteDoc = async (id) => {
    try {
      await axios.delete(`${url}/ai-agent/documents/${id}/${schema}`, { withCredentials: true });
      setDocuments((d) => d.filter((x) => x.id !== id));
    } catch (e) {
      console.error('Erro ao excluir documento:', e);
    }
  };

  const save = async () => {
    setSaving(true);
    setSavedMsg('');
    try {
      const payload = {
        schema,
        name: form.name,
        status: form.status,
        business_name: form.business_name,
        persona: form.persona,
        knowledge_base: form.knowledge_base,
        wait_seconds: Number(form.wait_seconds) || 0,
        max_messages: Number(form.max_messages) || 10,
        reactivate_seconds: Number(form.reactivate_seconds) || 0,
      };
      const res = await axios.put(`${url}/ai-agent/config`, payload, { withCredentials: true });
      if (res.data?.config) setForm({ ...empty, ...res.data.config });
      setSavedMsg('Configuração salva com sucesso.');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (e) {
      console.error('Erro ao salvar config do agente:', e);
      setSavedMsg('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`h-100 p-4 bg-body-${theme || 'light'}`} style={{ overflowY: 'auto' }}>
      <div className="d-flex align-items-center justify-content-between mb-1 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-robot fs-4"></i>
          <h4 className="mb-0 fw-bold">Agente de IA</h4>
          <span
            className={`badge ${
              form.status === 'autopilot'
                ? 'bg-success-subtle text-success-emphasis'
                : form.status === 'suggestive'
                ? 'bg-warning-subtle text-warning-emphasis'
                : 'bg-secondary-subtle text-secondary-emphasis'
            }`}
          >
            {MODES.find((m) => m.key === form.status)?.label}
          </span>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving || loading || !schema}>
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
      <p className="text-muted mb-4">Configure o assistente que responde os leads no WhatsApp.</p>

      {savedMsg && (
        <div className={`alert ${savedMsg.startsWith('Erro') ? 'alert-danger' : 'alert-success'} py-2`}>{savedMsg}</div>
      )}

      <div className="row g-4" style={{ maxWidth: 900 }}>
        {/* Modo de operação */}
        <div className="col-12">
          <label className="form-label fw-semibold">Modo de operação</label>
          <div className="row g-2">
            {MODES.map((m) => (
              <div className="col-md-4" key={m.key}>
                <div
                  role="button"
                  onClick={() => set('status', m.key)}
                  className={`card h-100 ${form.status === m.key ? 'border-primary border-2' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="card-body">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <i className={`bi ${m.icon}`}></i>
                      <strong>{m.label}</strong>
                      {form.status === m.key && <i className="bi bi-check-circle-fill text-primary ms-auto"></i>}
                    </div>
                    <small className="text-muted">{m.desc}</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Identidade */}
        <div className="col-md-6">
          <label className="form-label fw-semibold">Nome do agente</label>
          <input className="form-control" value={form.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="Ex.: Carol" />
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold">Nome comercial</label>
          <input className="form-control" value={form.business_name || ''} onChange={(e) => set('business_name', e.target.value)} placeholder="Ex.: Cartão de Todos" />
        </div>

        {/* Persona */}
        <div className="col-12">
          <label className="form-label fw-semibold">Persona / instruções</label>
          <textarea
            className="form-control"
            rows={4}
            value={form.persona || ''}
            onChange={(e) => set('persona', e.target.value)}
            placeholder="Como o agente deve se comportar, tom de voz, objetivo do atendimento…"
          />
        </div>

        {/* Base de conhecimento */}
        <div className="col-12">
          <label className="form-label fw-semibold">Base de conhecimento</label>
          <textarea
            className="form-control"
            rows={8}
            value={form.knowledge_base || ''}
            onChange={(e) => set('knowledge_base', e.target.value)}
            placeholder="Informações do produto/serviço, preços, perguntas frequentes, políticas… O agente responde com base neste conteúdo."
          />
          <small className="text-muted">O agente é instruído a não inventar informações fora desta base.</small>
        </div>

        {/* Documentos da base de conhecimento */}
        <div className="col-12">
          <label className="form-label fw-semibold">Documentos</label>
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
                <label className="btn btn-outline-primary btn-sm mb-0">
                  <i className="bi bi-upload me-1"></i>
                  {uploading ? 'Enviando…' : 'Enviar documento'}
                  <input
                    type="file"
                    hidden
                    accept=".txt,.md,.csv,.json,.log,.html,.htm,.pdf,.docx"
                    disabled={uploading}
                    onChange={(e) => {
                      if (e.target.files?.[0]) uploadDoc(e.target.files[0]);
                      e.target.value = '';
                    }}
                  />
                </label>
                <small className="text-muted">PDF, DOCX, TXT, MD, CSV, JSON, HTML (até 15 MB)</small>
              </div>

              {documents.length === 0 ? (
                <div className="text-muted small">Nenhum documento. O texto extraído é usado pelo agente nas respostas.</div>
              ) : (
                <ul className="list-group list-group-flush">
                  {documents.map((d) => (
                    <li key={d.id} className="list-group-item d-flex align-items-center justify-content-between px-0">
                      <div className="d-flex align-items-center gap-2 text-truncate">
                        <i className="bi bi-file-earmark-text text-primary"></i>
                        <span className="text-truncate">{d.filename}</span>
                        <span className="badge bg-secondary-subtle text-secondary-emphasis">
                          {(d.char_count || 0).toLocaleString('pt-BR')} chars
                        </span>
                      </div>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => deleteDoc(d.id)} title="Excluir">
                        <i className="bi bi-trash"></i>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Chave de API da empresa (controle de custo por cliente) */}
        <div className="col-12">
          <label className="form-label fw-semibold">Chave de API OpenAI (desta empresa)</label>
          <div className="card">
            <div className="card-body">
              {(() => {
                const hasKey = integrations.keys?.some((k) => k.key === 'openai_api_key');
                return (
                  <div className="d-flex align-items-center gap-2 mb-2">
                    {hasKey ? (
                      <span className="badge bg-success-subtle text-success-emphasis"><i className="bi bi-key-fill me-1"></i>Chave configurada</span>
                    ) : integrations.has_env_fallback ? (
                      <span className="badge bg-warning-subtle text-warning-emphasis"><i className="bi bi-exclamation-triangle me-1"></i>Usando chave global (custo não separado)</span>
                    ) : (
                      <span className="badge bg-danger-subtle text-danger-emphasis"><i className="bi bi-x-circle me-1"></i>Sem chave — agente inativo</span>
                    )}
                  </div>
                );
              })()}
              <div className="d-flex gap-2 flex-wrap">
                <input
                  type="password"
                  className="form-control"
                  style={{ maxWidth: 420 }}
                  placeholder="sk-… (cada empresa usa a própria chave; o valor nunca é reexibido)"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  autoComplete="new-password"
                />
                <button className="btn btn-outline-primary" onClick={saveApiKey} disabled={savingKey || !apiKeyInput.trim()}>
                  {savingKey ? 'Salvando…' : 'Salvar chave'}
                </button>
              </div>
              <small className="text-muted d-block mt-2">
                O custo de automação desta empresa é cobrado na conta OpenAI dela.
              </small>
              {integrations.usage && (
                <div className="d-flex gap-4 mt-3 flex-wrap">
                  <div>
                    <div className="text-muted small">Respostas do agente no mês</div>
                    <div className="fs-5 fw-bold">{integrations.usage.calls}</div>
                  </div>
                  <div>
                    <div className="text-muted small">Tokens de entrada</div>
                    <div className="fs-5 fw-bold">{(integrations.usage.prompt_tokens || 0).toLocaleString('pt-BR')}</div>
                  </div>
                  <div>
                    <div className="text-muted small">Tokens de saída</div>
                    <div className="fs-5 fw-bold">{(integrations.usage.completion_tokens || 0).toLocaleString('pt-BR')}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Parâmetros do piloto automático */}
        <div className="col-12">
          <label className="form-label fw-semibold">Piloto automático</label>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label small text-muted">Espera antes de responder (s)</label>
              <input type="number" min="0" className="form-control" value={form.wait_seconds}
                onChange={(e) => set('wait_seconds', e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label small text-muted">Máx. de mensagens por conversa</label>
              <input type="number" min="1" className="form-control" value={form.max_messages}
                onChange={(e) => set('max_messages', e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label small text-muted">Reativar após handoff (s)</label>
              <input type="number" min="0" className="form-control" value={form.reactivate_seconds}
                onChange={(e) => set('reactivate_seconds', e.target.value)} />
            </div>
          </div>
          <small className="text-muted d-block mt-2">
            Quando um atendente humano responde, o agente hiberna nesse contato pelo tempo de reativação.
          </small>
        </div>

        <div className="col-12 d-flex justify-content-end">
          <button className="btn btn-primary px-4" onClick={save} disabled={saving || loading || !schema}>
            {saving ? 'Salvando…' : 'Salvar configuração'}
          </button>
        </div>
      </div>
    </div>
  );
}
