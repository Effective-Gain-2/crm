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
function ActionBlock({ data, selected }) {
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
}

function TriggerBlock({ data, selected }) {
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
      </div>
      <Handle type="source" position={Position.Right} style={{ background: meta.color, width: 10, height: 10 }} />
    </div>
  );
}

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
    case 'remove_tag': return cfg.tag_id ? `tag: ${String(cfg.tag_id).slice(0, 10)}…` : '';
    case 'move_kanban': return cfg.stage_id ? `etapa: ${String(cfg.stage_id).slice(0, 10)}…` : '';
    case 'transfer_queue': return cfg.queue_id ? `fila: ${String(cfg.queue_id).slice(0, 10)}…` : '';
    case 'assign_user': return cfg.user_id ? `user: ${String(cfg.user_id).slice(0, 10)}…` : '';
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
  const [enabled, setEnabled] = useState(true);
  const [webhookToken, setWebhookToken] = useState(null);
  const [currentId, setCurrentId] = useState(workflowId || null);
  const [testing, setTesting] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);

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
          setEnabled(!!wf.enabled);
          setWebhookToken(wf.webhook_token || null);
          const g = wf.graph || initialGraph(wf.trigger_type);
          setNodes((g.nodes || []).map((n) => {
            if (n.id === 'trigger' || n.type === 'trigger') {
              return { ...n, type: 'trigger', data: { triggerType: n.data?.triggerType || wf.trigger_type } };
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
      setEnabled(true);
      setWebhookToken(null);
      setNodes(g.nodes);
      setEdges(g.edges);
    }
    setSelectedNode(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, workflowId]);

  // sincroniza label visual do trigger node quando o type muda
  useEffect(() => {
    setNodes((prev) =>
      prev.map((n) => (n.id === 'trigger' ? { ...n, data: { ...n.data, triggerType } } : n))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerType]);

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
      trigger_config: {},
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
            onChange={(e) => setTriggerType(e.target.value)}
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
              />
            )}
            {selectedNode && selectedNode.id === 'trigger' && (
              <div className={`card-subtitle-${theme}`}>
                <strong className={`header-text-${theme}`}>Gatilho selecionado</strong>
                <div className="mt-2" style={{ fontSize: 13 }}>
                  Tipo: <strong>{TRIGGER_BY_VALUE[triggerType]?.label}</strong>
                </div>
                <div className="mt-1" style={{ fontSize: 12, opacity: 0.7 }}>
                  Mude o tipo de gatilho no seletor da toolbar.
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}

function NodeConfigForm({ theme, node, onChange, onDelete }) {
  const action = node.data?.action;
  const config = node.data?.config || {};
  const meta = ACTION_BY_TYPE[action];
  const set = (key) => (e) => onChange({ [key]: e.target.value });
  const setNum = (key) => (e) => onChange({ [key]: Number(e.target.value) });

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
        <Field theme={theme} label="Texto (suporta {{contact.name}}, {{message.body}})">
          <textarea
            className={`input-${theme} w-100`}
            rows={6}
            value={config.text || ''}
            onChange={set('text')}
            style={{ padding: '6px 10px', borderRadius: 6 }}
          />
        </Field>
      )}

      {(action === 'add_tag' || action === 'remove_tag') && (
        <Field theme={theme} label="ID da tag">
          <input className={`input-${theme} w-100`} value={config.tag_id || ''}
            onChange={set('tag_id')} placeholder="uuid da tag"
            style={{ padding: '6px 10px', borderRadius: 6 }} />
        </Field>
      )}

      {action === 'move_kanban' && (
        <Field theme={theme} label="ID da etapa">
          <input className={`input-${theme} w-100`} value={config.stage_id || ''}
            onChange={set('stage_id')} placeholder="uuid da etapa"
            style={{ padding: '6px 10px', borderRadius: 6 }} />
        </Field>
      )}

      {action === 'transfer_queue' && (
        <Field theme={theme} label="ID da fila">
          <input className={`input-${theme} w-100`} value={config.queue_id || ''}
            onChange={set('queue_id')} placeholder="uuid da fila"
            style={{ padding: '6px 10px', borderRadius: 6 }} />
        </Field>
      )}

      {action === 'assign_user' && (
        <Field theme={theme} label="ID do atendente">
          <input className={`input-${theme} w-100`} value={config.user_id || ''}
            onChange={set('user_id')} placeholder="uuid do atendente"
            style={{ padding: '6px 10px', borderRadius: 6 }} />
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
