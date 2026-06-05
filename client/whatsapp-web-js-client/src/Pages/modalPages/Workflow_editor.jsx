import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal } from 'react-bootstrap';
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api } from '../../utils/axiosConfig';
import { useToast } from '../../contexts/ToastContext';

// --- catalogos (modulo scope -> referencia estavel) -------------------------
const TRIGGER_TYPES = [
  { value: 'new_message', label: 'Nova mensagem do cliente', icon: 'bi-chat-dots', color: '#0d6efd' },
  { value: 'first_message', label: 'Primeira mensagem do cliente', icon: 'bi-chat-heart', color: '#0d6efd' },
  { value: 'kanban_stage_changed', label: 'Mudança de etapa Kanban', icon: 'bi-kanban', color: '#6f42c1' },
  { value: 'tag_added', label: 'Tag adicionada', icon: 'bi-tag-fill', color: '#198754' },
  { value: 'tag_removed', label: 'Tag removida', icon: 'bi-tag', color: '#dc3545' },
  { value: 'no_reply', label: 'Cliente sem resposta', icon: 'bi-hourglass-split', color: '#ffc107' },
  { value: 'webhook', label: 'Webhook externo', icon: 'bi-cloud-arrow-up', color: '#0dcaf0' },
  { value: 'lead_created', label: 'Lead criado (API)', icon: 'bi-person-plus', color: '#198754' },
];

const ACTION_DEFS = [
  { type: 'send_message',  label: 'Enviar mensagem',   icon: 'bi-send',           color: '#0d6efd', defaults: { text: 'Olá {{contact.name}}, ' } },
  { type: 'add_tag',       label: 'Adicionar tag',     icon: 'bi-tag-fill',       color: '#198754', defaults: { tag_id: '' } },
  { type: 'remove_tag',    label: 'Remover tag',       icon: 'bi-tag',            color: '#dc3545', defaults: { tag_id: '' } },
  { type: 'move_kanban',   label: 'Mover no Kanban',   icon: 'bi-kanban',         color: '#6f42c1', defaults: { stage_id: '' } },
  { type: 'transfer_queue',label: 'Transferir fila',   icon: 'bi-diagram-3',      color: '#fd7e14', defaults: { queue_id: '' } },
  { type: 'assign_user',   label: 'Atribuir atendente',icon: 'bi-person-check',   color: '#20c997', defaults: { user_id: '' } },
  { type: 'toggle_bot',    label: 'Ativar/Desativar bot',icon: 'bi-robot',        color: '#6c757d', defaults: { enabled: false } },
  { type: 'delay',         label: 'Esperar',           icon: 'bi-clock-history',  color: '#f59e0b', defaults: { minutes: 5 } },
  { type: 'webhook_out',   label: 'Webhook (enviar)',  icon: 'bi-globe2',         color: '#0dcaf0', defaults: { url: '', method: 'POST', body: '{}' } },
];

const ACTION_BY_TYPE = Object.fromEntries(ACTION_DEFS.map((a) => [a.type, a]));
const TRIGGER_BY_VALUE = Object.fromEntries(TRIGGER_TYPES.map((t) => [t.value, t]));

// --- node visual estilo n8n/manychat ----------------------------------------
// React.memo: durante o arraste só muda `position` (data mantém referência),
// então os nós não re-renderizam a cada frame — elimina o lag do drag.
const ActionBlock = React.memo(function ActionBlock({ data, selected }) {
  const meta = ACTION_BY_TYPE[data?.action] || { label: data?.action || '?', icon: 'bi-gear', color: '#888' };
  const summary = summarizeConfig(data?.action, data?.config || {});
  return (
    <div
      style={{
        background: '#1c2433',
        border: `2px solid ${selected ? '#fff' : meta.color}`,
        borderRadius: 10,
        boxShadow: selected ? `0 0 0 3px ${meta.color}55` : '0 2px 6px rgba(0,0,0,0.35)',
        color: '#e9ecef',
        width: 220,
        overflow: 'hidden',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: meta.color, width: 10, height: 10 }} />
      <div style={{
        padding: '8px 12px',
        background: meta.color,
        color: '#fff',
        fontWeight: 600,
        fontSize: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <i className={`bi ${meta.icon}`} />
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta.label}</span>
      </div>
      <div style={{ padding: '8px 12px', fontSize: 12, minHeight: 32 }}>
        {summary ? (
          <span style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-word',
            opacity: 0.85,
          }}>{summary}</span>
        ) : (
          <span style={{ opacity: 0.4 }}>clique para configurar</span>
        )}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: meta.color, width: 10, height: 10 }} />
    </div>
  );
});

const TriggerBlock = React.memo(function TriggerBlock({ data, selected }) {
  const meta = TRIGGER_BY_VALUE[data?.triggerType] || { label: 'Gatilho', icon: 'bi-lightning', color: '#0d6efd' };
  return (
    <div
      style={{
        background: '#1c2433',
        border: `2px solid ${selected ? '#fff' : meta.color}`,
        borderRadius: 10,
        boxShadow: selected ? `0 0 0 3px ${meta.color}55` : '0 2px 6px rgba(0,0,0,0.35)',
        color: '#e9ecef',
        width: 220,
        overflow: 'hidden',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{
        padding: '8px 12px',
        background: meta.color,
        color: '#fff',
        fontWeight: 600,
        fontSize: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <i className={`bi ${meta.icon}`} />
        <span>Gatilho</span>
      </div>
      <div style={{ padding: '8px 12px', fontSize: 12, opacity: 0.9 }}>
        {meta.label}
        {data?.configSummary && (
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2, wordBreak: 'break-word' }}>
            <i className="bi bi-funnel me-1" />{data.configSummary}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: meta.color, width: 10, height: 10 }} />
    </div>
  );
});

// Module-scope: referencia ESTAVEL evita o lag classico do React Flow.
// Inline {{ action: ActionBlock }} recompilaria a cada render do parent.
const NODE_TYPES = { action: ActionBlock, trigger: TriggerBlock };
const DEFAULT_EDGE_OPTIONS = {
  type: 'smoothstep',
  animated: false,
  style: { stroke: '#6c757d', strokeWidth: 2 },
};

function summarizeConfig(action, cfg) {
  switch (action) {
    case 'send_message': return cfg.text ? `"${cfg.text.slice(0, 60)}${cfg.text.length > 60 ? '…' : ''}"` : '';
    case 'add_tag':
    case 'remove_tag': return cfg.tag_label ? `tag: ${cfg.tag_label}` : (cfg.tag_id ? `tag: ${String(cfg.tag_id).slice(0, 10)}…` : '');
    case 'move_kanban': return cfg.stage_label ? `etapa: ${cfg.stage_label}` : (cfg.stage_id ? `etapa: ${String(cfg.stage_id).slice(0, 10)}…` : '');
    case 'transfer_queue': return cfg.queue_label ? `fila: ${cfg.queue_label}` : (cfg.queue_id ? `fila: ${String(cfg.queue_id).slice(0, 10)}…` : '');
    case 'assign_user': return cfg.user_label ? `atend.: ${cfg.user_label}` : (cfg.user_id ? `user: ${String(cfg.user_id).slice(0, 10)}…` : '');
    case 'toggle_bot': return cfg.enabled ? 'ligar bot' : 'desligar bot';
    case 'delay': {
      const p = [];
      if (cfg.days) p.push(`${cfg.days}d`);
      if (cfg.hours) p.push(`${cfg.hours}h`);
      if (cfg.minutes) p.push(`${cfg.minutes}m`);
      if (cfg.seconds) p.push(`${cfg.seconds}s`);
      return p.join(' ') || 'sem espera';
    }
    case 'webhook_out': return cfg.url ? `${cfg.method || 'POST'} ${cfg.url.slice(0, 30)}…` : '';
    default: return '';
  }
}

// Resumo legível dos filtros do gatilho (mostrado no nó e na lista).
function summarizeTrigger(type, cfg) {
  cfg = cfg || {};
  switch (type) {
    case 'tag_added':
    case 'tag_removed': return cfg.tag_label ? `tag: ${cfg.tag_label}` : 'qualquer tag';
    case 'kanban_stage_changed': {
      const parts = [];
      if (cfg.from_label) parts.push(`de "${cfg.from_label}"`);
      if (cfg.to_label) parts.push(`para "${cfg.to_label}"`);
      return parts.join(' ') || 'qualquer mudança';
    }
    case 'new_message':
    case 'first_message': return cfg.queue_label ? `fila: ${cfg.queue_label}` : 'qualquer fila';
    case 'no_reply': return cfg.hours ? `${cfg.hours}h sem resposta` : 'sem resposta';
    case 'lead_created': {
      const parts = [];
      if (cfg.tag_label) parts.push(`tag "${cfg.tag_label}"`);
      if (cfg.stage_label) parts.push(`etapa "${cfg.stage_label}"`);
      return parts.join(' + ') || 'qualquer lead';
    }
    default: return '';
  }
}

const initialGraph = (triggerType) => ({
  nodes: [
    {
      id: 'trigger',
      type: 'trigger',
      position: { x: 80, y: 200 },
      data: { triggerType },
    },
  ],
  edges: [],
});

// --- main component ---------------------------------------------------------
function WorkflowEditorModal({ theme, workflowId, show, onClose, onSaved }) {
  const { showError, showSuccess } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('new_message');
  const [triggerConfig, setTriggerConfig] = useState({});
  const [enabled, setEnabled] = useState(true);
  const [webhookToken, setWebhookToken] = useState(null);
  const [currentId, setCurrentId] = useState(workflowId || null);
  const [testing, setTesting] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [resources, setResources] = useState({ tags: [], queues: [], users: [], stages: [] });

  // Recursos do schema p/ os dropdowns (tags/filas/atendentes/etapas)
  useEffect(() => {
    if (!show) return;
    api.get('/workflow/resources')
      .then((r) => setResources(r.data?.data || { tags: [], queues: [], users: [], stages: [] }))
      .catch((err) => console.error('Falha ao carregar recursos do workflow:', err));
  }, [show]);

  // Carga inicial
  useEffect(() => {
    if (!show) return;
    setCurrentId(workflowId || null);
    if (workflowId) {
      (async () => {
        try {
          const res = await api.get(`/workflow/${workflowId}`);
          const wf = res.data?.data;
          if (!wf) return;
          setName(wf.name || '');
          setDescription(wf.description || '');
          setTriggerType(wf.trigger_type);
          const tcfg = wf.trigger_config || {};
          setTriggerConfig(tcfg);
          setEnabled(!!wf.enabled);
          setWebhookToken(wf.webhook_token || null);
          const g = wf.graph || initialGraph(wf.trigger_type);
          setNodes((g.nodes || []).map((n) => {
            if (n.id === 'trigger' || n.type === 'trigger') {
              return { ...n, type: 'trigger', data: { triggerType: n.data?.triggerType || wf.trigger_type, configSummary: summarizeTrigger(wf.trigger_type, tcfg) } };
            }
            return { ...n, type: 'action', data: { action: n.data?.action, config: n.data?.config || {} } };
          }));
          setEdges(g.edges || []);
        } catch (err) {
          console.error(err);
          showError('Falha ao carregar workflow');
        }
      })();
    } else {
      const g = initialGraph('new_message');
      setName('');
      setDescription('');
      setTriggerType('new_message');
      setTriggerConfig({});
      setEnabled(true);
      setWebhookToken(null);
      setNodes(g.nodes);
      setEdges(g.edges);
    }
    setSelectedNode(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, workflowId]);

  // sincroniza label + resumo dos filtros no trigger node quando type/config mudam
  useEffect(() => {
    setNodes((prev) =>
      prev.map((n) => (n.id === 'trigger' ? { ...n, data: { ...n.data, triggerType, configSummary: summarizeTrigger(triggerType, triggerConfig) } } : n))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerType, triggerConfig]);

  const updateTriggerConfig = useCallback((patch) => {
    setTriggerConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: false }, eds));
  }, [setEdges]);

  const onSelectionChange = useCallback(({ nodes: sel }) => {
    setSelectedNode(sel?.[0] || null);
  }, []);

  const onPaneClick = useCallback(() => setSelectedNode(null), []);

  const addActionNode = useCallback((actionType) => {
    setNodes((prev) => {
      const id = `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const lastX = prev.reduce((mx, n) => Math.max(mx, n.position?.x ?? 0), 0);
      const defaults = ACTION_BY_TYPE[actionType]?.defaults || {};
      return [
        ...prev,
        {
          id,
          type: 'action',
          position: { x: lastX + 280, y: 200 },
          data: { action: actionType, config: { ...defaults } },
        },
      ];
    });
  }, [setNodes]);

  const updateSelectedConfig = useCallback((patch) => {
    setSelectedNode((curSel) => {
      if (!curSel) return curSel;
      setNodes((prev) => prev.map((n) => {
        if (n.id !== curSel.id) return n;
        return { ...n, data: { ...n.data, config: { ...(n.data.config || {}), ...patch } } };
      }));
      return { ...curSel, data: { ...curSel.data, config: { ...(curSel.data.config || {}), ...patch } } };
    });
  }, [setNodes]);

  const deleteSelected = useCallback(() => {
    if (!selectedNode || selectedNode.id === 'trigger') return;
    const id = selectedNode.id;
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
    setSelectedNode(null);
  }, [selectedNode, setNodes, setEdges]);

  const serializeGraph = () => ({
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.id === 'trigger'
        ? { triggerType: n.data?.triggerType || triggerType }
        : { action: n.data?.action, config: n.data?.config || {} },
    })),
    edges: edges.map(({ id, source, target, sourceHandle, targetHandle }) => ({
      id, source, target, sourceHandle, targetHandle,
    })),
  });

  const save = async ({ closeAfter = true } = {}) => {
    if (!name.trim()) { showError('Dê um nome ao workflow'); return null; }
    const payload = {
      name: name.trim(),
      description,
      enabled,
      trigger_type: triggerType,
      trigger_config: triggerConfig || {},
      graph: serializeGraph(),
    };
    try {
      let saved;
      if (currentId) {
        const r = await api.put(`/workflow/${currentId}`, payload);
        saved = r.data?.data;
      } else {
        const r = await api.post('/workflow/', payload);
        saved = r.data?.data;
        if (saved?.id) setCurrentId(saved.id);
        if (saved?.webhook_token) setWebhookToken(saved.webhook_token);
      }
      showSuccess('Workflow salvo');
      if (closeAfter) onSaved && onSaved();
      return saved;
    } catch (err) {
      console.error(err);
      showError(err.response?.data?.message || 'Falha ao salvar');
      return null;
    }
  };

  const fireTestRun = async () => {
    setTesting(true);
    try {
      let id = currentId;
      if (!id) {
        const saved = await save({ closeAfter: false });
        id = saved?.id;
        if (!id) return;
      } else {
        // garante que mudanças locais foram persistidas
        await save({ closeAfter: false });
      }
      await api.post(`/workflow/${id}/trigger`, {
        payload: { trigger: 'manual_test' },
        context: { trigger: 'manual_test' },
      });
      showSuccess('Disparo de teste enviado — acompanhe nos logs do backend');
    } catch (err) {
      console.error(err);
      showError(err.response?.data?.message || 'Falha ao disparar teste');
    } finally {
      setTesting(false);
    }
  };

  const webhookUrl = useMemo(() => {
    if (!webhookToken) return null;
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const schema = userData?.schema;
    if (!schema) return null;
    const base = process.env.REACT_APP_URL || 'http://localhost:3002';
    return `${base}/api/workflow/hook/${schema}/${webhookToken}`;
  }, [webhookToken]);

  const copyWebhookUrl = () => {
    if (!webhookUrl) return;
    navigator.clipboard?.writeText(webhookUrl);
    showSuccess('URL copiada');
  };

  return (
    <Modal show={show} onHide={onClose} fullscreen backdrop="static">
      <Modal.Header closeButton style={{ background: `var(--bg-color-${theme})` }}>
        <Modal.Title className={`header-text-${theme}`}>
          {currentId ? 'Editar workflow' : 'Novo workflow'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ background: `var(--bg-color-${theme})`, padding: 0 }}>
        {/* Toolbar superior */}
        <div
          style={{
            padding: 10,
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            borderBottom: `1px solid var(--border-color-${theme})`,
            flexWrap: 'wrap',
          }}
        >
          <input
            value={name}
            placeholder="Nome do workflow"
            onChange={(e) => setName(e.target.value)}
            className={`input-${theme}`}
            style={{ flex: '1 1 220px', padding: '6px 10px', borderRadius: 6, minWidth: 0 }}
          />
          <select
            value={triggerType}
            onChange={(e) => { setTriggerType(e.target.value); setTriggerConfig({}); }}
            className={`input-${theme}`}
            style={{ padding: '6px 10px', borderRadius: 6 }}
          >
            {TRIGGER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <label className={`d-flex align-items-center gap-2 card-subtitle-${theme}`}>
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Ativo
          </label>
          <button
            className={`btn btn-2-${theme}`}
            onClick={fireTestRun}
            disabled={testing}
            title="Salva e dispara uma execução manual"
          >
            <i className="bi bi-play-fill me-1" />
            {testing ? 'Testando…' : 'Testar agora'}
          </button>
          <button className={`btn btn-1-${theme}`} onClick={() => save({ closeAfter: true })}>
            <i className="bi bi-check2 me-1" /> Salvar
          </button>
        </div>

        {/* Banner de webhook */}
        {triggerType === 'webhook' && (
          <div
            style={{
              padding: 10,
              background: 'rgba(13,202,240,0.12)',
              borderBottom: '1px solid rgba(13,202,240,0.3)',
              fontSize: 12,
            }}
            className={`card-subtitle-${theme}`}
          >
            {webhookUrl ? (
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <i className="bi bi-link-45deg" style={{ color: '#0dcaf0', fontSize: 18 }} />
                <strong>URL do webhook:</strong>
                <code style={{ background: 'rgba(0,0,0,0.25)', padding: '2px 8px', borderRadius: 4, wordBreak: 'break-all', flex: '1 1 320px' }}>
                  {webhookUrl}
                </code>
                <button className={`btn btn-sm btn-2-${theme}`} onClick={copyWebhookUrl}>
                  <i className="bi bi-clipboard me-1" />Copiar
                </button>
                <span style={{ opacity: 0.7 }}>
                  POST com JSON; o body fica disponível em <code>{'{{payload.*}}'}</code>.
                </span>
              </div>
            ) : (
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-info-circle" />
                Salve o workflow para gerar a URL pública do webhook.
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', height: 'calc(100vh - 56px - 56px - ' + (triggerType === 'webhook' ? '48px' : '0px') + ')' }}>
          {/* Sidebar esquerda: actions */}
          <div
            style={{
              width: 220,
              borderRight: `1px solid var(--border-color-${theme})`,
              padding: 12,
              overflowY: 'auto',
              flexShrink: 0,
            }}
          >
            <div className={`header-text-${theme} mb-2`} style={{ fontWeight: 600, fontSize: 13 }}>
              <i className="bi bi-plus-square me-2" />Adicionar ação
            </div>
            {ACTION_DEFS.map((a) => (
              <button
                key={a.type}
                className={`btn btn-2-${theme} d-flex align-items-center gap-2 w-100 mb-2`}
                style={{
                  justifyContent: 'flex-start',
                  borderLeft: `4px solid ${a.color}`,
                  paddingLeft: 10,
                }}
                onClick={() => addActionNode(a.type)}
              >
                <i className={`bi ${a.icon}`} style={{ color: a.color }} />
                <span style={{ fontSize: 13 }}>{a.label}</span>
              </button>
            ))}
          </div>

          {/* Canvas central */}
          <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onSelectionChange={onSelectionChange}
              onPaneClick={onPaneClick}
              nodeTypes={NODE_TYPES}
              defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              proOptions={{ hideAttribution: true }}
              minZoom={0.3}
              maxZoom={1.5}
              snapToGrid
              snapGrid={[16, 16]}
              elevateNodesOnSelect
              nodesDraggable
              elementsSelectable
            >
              <Background gap={16} color="#374151" />
              <Controls showInteractive={false} />
              <MiniMap
                pannable
                zoomable
                nodeColor={(n) => {
                  if (n.type === 'trigger') {
                    return TRIGGER_BY_VALUE[n.data?.triggerType]?.color || '#0d6efd';
                  }
                  return ACTION_BY_TYPE[n.data?.action]?.color || '#6c757d';
                }}
                maskColor="rgba(0,0,0,0.6)"
                style={{ background: '#0f172a' }}
              />
            </ReactFlow>
          </div>

          {/* Sidebar direita: config do nó selecionado */}
          <div
            style={{
              width: 340,
              borderLeft: `1px solid var(--border-color-${theme})`,
              padding: 12,
              overflowY: 'auto',
              flexShrink: 0,
            }}
          >
            {!selectedNode && (
              <div className={`card-subtitle-${theme}`}>
                <strong className={`header-text-${theme}`}>Como usar</strong>
                <div className="mt-2" style={{ fontSize: 13, lineHeight: 1.5 }}>
                  • Selecione o gatilho acima.<br />
                  • Adicione ações pela barra à esquerda.<br />
                  • Conecte o ponto da direita de um nó ao ponto da esquerda do próximo.<br />
                  • Selecione um nó para configurar aqui.<br />
                  • Use <code>{'{{contact.name}}'}</code>, <code>{'{{message.body}}'}</code>, <code>{'{{payload.*}}'}</code>.
                </div>
              </div>
            )}
            {selectedNode && selectedNode.id !== 'trigger' && (
              <NodeConfigForm
                theme={theme}
                node={selectedNode}
                onChange={updateSelectedConfig}
                onDelete={deleteSelected}
                resources={resources}
              />
            )}
            {selectedNode && selectedNode.id === 'trigger' && (
              <TriggerConfigForm
                theme={theme}
                triggerType={triggerType}
                config={triggerConfig}
                onChange={updateTriggerConfig}
                resources={resources}
              />
            )}
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}

// Dropdown que popula a partir dos recursos do schema. Mantém o valor atual
// visível mesmo que ele não esteja na lista (ex.: workflow antigo). Suporta
// agrupamento por `group` (usado p/ etapas por funil).
function ResourceSelect({ theme, value, label, placeholder, options, onPick }) {
  const exists = options.some((o) => o.value === value);
  const groups = [...new Set(options.filter((o) => o.group).map((o) => o.group))];
  return (
    <select
      className={`input-${theme} w-100`}
      value={value || ''}
      onChange={(e) => {
        const opt = options.find((o) => o.value === e.target.value);
        onPick(e.target.value, opt ? opt.label : '');
      }}
      style={{ padding: '6px 10px', borderRadius: 6 }}
    >
      <option value="">{placeholder}</option>
      {value && !exists && <option value={value}>{label || value}</option>}
      {groups.length > 0
        ? groups.map((g) => (
            <optgroup key={g} label={g}>
              {options.filter((o) => o.group === g).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </optgroup>
          ))
        : options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function NodeConfigForm({ theme, node, onChange, onDelete, resources }) {
  const action = node.data?.action;
  const config = node.data?.config || {};
  const meta = ACTION_BY_TYPE[action];
  const set = (key) => (e) => onChange({ [key]: e.target.value });
  const setNum = (key) => (e) => onChange({ [key]: Number(e.target.value) });
  const res = resources || { tags: [], queues: [], users: [], stages: [] };

  const tagOptions = (res.tags || []).map((t) => ({ value: t.id, label: t.numeric_id ? `${t.name} — #${t.numeric_id}` : t.name }));
  const queueOptions = (res.queues || []).map((q) => ({ value: q.id, label: q.name }));
  const userOptions = (res.users || []).map((u) => ({ value: u.id, label: u.name }));
  const stageOptions = (res.stages || []).map((s) => ({ value: s.id, label: s.numeric_id ? `${s.etapa} — #${s.numeric_id}` : s.etapa, group: s.funil }));
  const connectionOptions = (res.connections || []).map((c) => ({ value: c.id, label: c.number ? `${c.name} (${c.number})` : c.name }));

  return (
    <div>
      <div className={`mb-3 d-flex justify-content-between align-items-center`}>
        <span style={{ fontWeight: 600, color: meta?.color }} className="d-flex align-items-center gap-2">
          <i className={`bi ${meta?.icon}`} />
          {meta?.label || action}
        </span>
        <button className="btn btn-sm delete-btn" onClick={onDelete} title="Remover nó">
          <i className="bi bi-trash-fill" />
        </button>
      </div>

      {action === 'send_message' && (
        <>
          <Field theme={theme} label="Conexão (número que envia)">
            <ResourceSelect theme={theme} value={config.connection_id} label={config.connection_label}
              placeholder={connectionOptions.length ? 'Usar a conexão do chat' : 'Nenhuma conexão cadastrada'}
              options={connectionOptions}
              onPick={(id, label) => onChange({ connection_id: id, connection_label: label })} />
          </Field>
          <Field theme={theme} label="Texto (suporta {{contact.name}}, {{message.body}})">
            <textarea
              className={`input-${theme} w-100`}
              rows={6}
              value={config.text || ''}
              onChange={set('text')}
              style={{ padding: '6px 10px', borderRadius: 6 }}
            />
          </Field>
        </>
      )}

      {(action === 'add_tag' || action === 'remove_tag') && (
        <Field theme={theme} label="Tag">
          <ResourceSelect theme={theme} value={config.tag_id} label={config.tag_label}
            placeholder={tagOptions.length ? 'Selecione uma tag…' : 'Nenhuma tag cadastrada'}
            options={tagOptions}
            onPick={(id, label) => onChange({ tag_id: id, tag_label: label })} />
        </Field>
      )}

      {action === 'move_kanban' && (
        <Field theme={theme} label="Etapa do Kanban">
          <ResourceSelect theme={theme} value={config.stage_id} label={config.stage_label}
            placeholder={stageOptions.length ? 'Selecione uma etapa…' : 'Nenhuma etapa cadastrada'}
            options={stageOptions}
            onPick={(id, label) => onChange({ stage_id: id, stage_label: label })} />
        </Field>
      )}

      {action === 'transfer_queue' && (
        <Field theme={theme} label="Fila">
          <ResourceSelect theme={theme} value={config.queue_id} label={config.queue_label}
            placeholder={queueOptions.length ? 'Selecione uma fila…' : 'Nenhuma fila cadastrada'}
            options={queueOptions}
            onPick={(id, label) => onChange({ queue_id: id, queue_label: label })} />
        </Field>
      )}

      {action === 'assign_user' && (
        <Field theme={theme} label="Atendente">
          <ResourceSelect theme={theme} value={config.user_id} label={config.user_label}
            placeholder={userOptions.length ? 'Selecione um atendente…' : 'Nenhum atendente'}
            options={userOptions}
            onPick={(id, label) => onChange({ user_id: id, user_label: label })} />
        </Field>
      )}

      {action === 'toggle_bot' && (
        <Field theme={theme} label="Estado">
          <select
            className={`input-${theme} w-100`}
            value={config.enabled ? 'true' : 'false'}
            onChange={(e) => onChange({ enabled: e.target.value === 'true' })}
            style={{ padding: '6px 10px', borderRadius: 6 }}
          >
            <option value="true">Ativar bot</option>
            <option value="false">Desativar bot</option>
          </select>
        </Field>
      )}

      {action === 'delay' && (
        <>
          <Field theme={theme} label="Minutos">
            <input type="number" min="0" className={`input-${theme} w-100`}
              value={config.minutes ?? 0} onChange={setNum('minutes')}
              style={{ padding: '6px 10px', borderRadius: 6 }} />
          </Field>
          <Field theme={theme} label="Horas">
            <input type="number" min="0" className={`input-${theme} w-100`}
              value={config.hours ?? 0} onChange={setNum('hours')}
              style={{ padding: '6px 10px', borderRadius: 6 }} />
          </Field>
          <Field theme={theme} label="Dias">
            <input type="number" min="0" className={`input-${theme} w-100`}
              value={config.days ?? 0} onChange={setNum('days')}
              style={{ padding: '6px 10px', borderRadius: 6 }} />
          </Field>
        </>
      )}

      {action === 'webhook_out' && (
        <>
          <Field theme={theme} label="URL">
            <input className={`input-${theme} w-100`} value={config.url || ''}
              onChange={set('url')} placeholder="https://..."
              style={{ padding: '6px 10px', borderRadius: 6 }} />
          </Field>
          <Field theme={theme} label="Método">
            <select className={`input-${theme} w-100`} value={config.method || 'POST'}
              onChange={set('method')} style={{ padding: '6px 10px', borderRadius: 6 }}>
              <option>POST</option><option>GET</option><option>PUT</option><option>DELETE</option>
            </select>
          </Field>
          <Field theme={theme} label="Body (JSON, suporta {{vars}})">
            <textarea className={`input-${theme} w-100`} rows={5}
              value={config.body || ''} onChange={set('body')}
              style={{ padding: '6px 10px', borderRadius: 6 }} />
          </Field>
        </>
      )}
    </div>
  );
}

// Configuração dos FILTROS do gatilho (estilo ManyChat): "dispara quando a tag
// X é adicionada", "quando muda para a etapa Y", etc. Salvo em trigger_config e
// aplicado no backend por matchTriggerFilters (services/WorkflowTrigger.js).
function TriggerConfigForm({ theme, triggerType, config, onChange, resources }) {
  const meta = TRIGGER_BY_VALUE[triggerType] || {};
  const res = resources || { tags: [], queues: [], users: [], stages: [] };
  const cfg = config || {};

  const tagOptions = (res.tags || []).map((t) => ({ value: t.id, label: t.numeric_id ? `${t.name} — #${t.numeric_id}` : t.name }));
  const queueOptions = (res.queues || []).map((q) => ({ value: q.id, label: q.name }));
  const stageOptions = (res.stages || []).map((s) => ({ value: s.id, label: s.numeric_id ? `${s.etapa} — #${s.numeric_id}` : s.etapa, group: s.funil }));

  return (
    <div>
      <div className="mb-2 d-flex align-items-center gap-2">
        <i className={`bi ${meta.icon}`} style={{ color: meta.color }} />
        <span style={{ fontWeight: 600 }} className={`header-text-${theme}`}>{meta.label || 'Gatilho'}</span>
      </div>
      <div className={`card-subtitle-${theme} mb-3`} style={{ fontSize: 12, opacity: 0.8 }}>
        Defina <strong>quando</strong> este gatilho dispara. Em branco = qualquer.
      </div>

      {(triggerType === 'tag_added' || triggerType === 'tag_removed') && (
        <Field theme={theme} label={triggerType === 'tag_added' ? 'Disparar quando adicionar a tag' : 'Disparar quando remover a tag'}>
          <ResourceSelect theme={theme} value={cfg.tag_id} label={cfg.tag_label}
            placeholder={tagOptions.length ? 'Qualquer tag' : 'Nenhuma tag cadastrada'} options={tagOptions}
            onPick={(id, label) => onChange({ tag_id: id, tag_label: label })} />
        </Field>
      )}

      {triggerType === 'kanban_stage_changed' && (
        <>
          <Field theme={theme} label="Etapa de origem (opcional)">
            <ResourceSelect theme={theme} value={cfg.from_stage_id} label={cfg.from_label}
              placeholder="Qualquer origem" options={stageOptions}
              onPick={(id, label) => onChange({ from_stage_id: id, from_label: label })} />
          </Field>
          <Field theme={theme} label="Etapa de destino (opcional)">
            <ResourceSelect theme={theme} value={cfg.to_stage_id} label={cfg.to_label}
              placeholder="Qualquer destino" options={stageOptions}
              onPick={(id, label) => onChange({ to_stage_id: id, to_label: label })} />
          </Field>
        </>
      )}

      {(triggerType === 'new_message' || triggerType === 'first_message') && (
        <Field theme={theme} label="Fila (opcional)">
          <ResourceSelect theme={theme} value={cfg.queue_id} label={cfg.queue_label}
            placeholder={queueOptions.length ? 'Qualquer fila' : 'Nenhuma fila cadastrada'} options={queueOptions}
            onPick={(id, label) => onChange({ queue_id: id, queue_label: label })} />
        </Field>
      )}

      {triggerType === 'no_reply' && (
        <Field theme={theme} label="Horas sem resposta do cliente">
          <input type="number" min="1" className={`input-${theme} w-100`}
            value={cfg.hours ?? 24} onChange={(e) => onChange({ hours: Number(e.target.value) })}
            style={{ padding: '6px 10px', borderRadius: 6 }} />
        </Field>
      )}

      {triggerType === 'lead_created' && (
        <>
          <Field theme={theme} label="Só quando o lead nascer com a tag (opcional)">
            <ResourceSelect theme={theme} value={cfg.tag_id} label={cfg.tag_label}
              placeholder={tagOptions.length ? 'Qualquer tag' : 'Nenhuma tag cadastrada'} options={tagOptions}
              onPick={(id, label) => onChange({ tag_id: id, tag_label: label })} />
          </Field>
          <Field theme={theme} label="Só quando cair na etapa (opcional)">
            <ResourceSelect theme={theme} value={cfg.stage_id} label={cfg.stage_label}
              placeholder="Qualquer etapa" options={stageOptions}
              onPick={(id, label) => onChange({ stage_id: id, stage_label: label })} />
          </Field>
        </>
      )}

      {triggerType === 'webhook' && (
        <div className={`card-subtitle-${theme}`} style={{ fontSize: 12 }}>
          Sem filtros: qualquer POST na URL do webhook dispara o fluxo.
        </div>
      )}
    </div>
  );
}

function Field({ theme, label, children }) {
  return (
    <div className="mb-3">
      <label className={`card-subtitle-${theme} d-block mb-1`} style={{ fontSize: 12 }}>{label}</label>
      {children}
    </div>
  );
}

// Wrapper: ReactFlowProvider FORA do componente que usa state evita re-mount
// do React Flow context em cada render do Modal — outra fonte de lag.
function WorkflowEditorWithProvider(props) {
  return (
    <ReactFlowProvider>
      <WorkflowEditorModal {...props} />
    </ReactFlowProvider>
  );
}

export default WorkflowEditorWithProvider;
