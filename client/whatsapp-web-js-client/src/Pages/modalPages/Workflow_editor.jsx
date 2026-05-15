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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api } from '../../utils/axiosConfig';
import { useToast } from '../../contexts/ToastContext';

const TRIGGER_TYPES = [
  { value: 'new_message', label: 'Nova mensagem do cliente' },
  { value: 'first_message', label: 'Primeira mensagem do cliente' },
  { value: 'kanban_stage_changed', label: 'Mudança de etapa Kanban' },
  { value: 'tag_added', label: 'Tag adicionada' },
  { value: 'tag_removed', label: 'Tag removida' },
  { value: 'no_reply', label: 'Cliente sem resposta' },
  { value: 'webhook', label: 'Webhook externo' },
];

const ACTION_DEFS = [
  { type: 'send_message', label: 'Enviar mensagem', icon: 'bi-chat-dots',
    defaults: { text: 'Olá {{contact.name}}, ' } },
  { type: 'add_tag', label: 'Adicionar tag', icon: 'bi-tag-fill',
    defaults: { tag_id: '' } },
  { type: 'remove_tag', label: 'Remover tag', icon: 'bi-tag',
    defaults: { tag_id: '' } },
  { type: 'move_kanban', label: 'Mover no Kanban', icon: 'bi-kanban',
    defaults: { stage_id: '' } },
  { type: 'transfer_queue', label: 'Transferir fila', icon: 'bi-diagram-3',
    defaults: { queue_id: '' } },
  { type: 'assign_user', label: 'Atribuir atendente', icon: 'bi-person-check',
    defaults: { user_id: '' } },
  { type: 'toggle_bot', label: 'Ativar/Desativar bot', icon: 'bi-robot',
    defaults: { enabled: false } },
  { type: 'delay', label: 'Esperar', icon: 'bi-clock-history',
    defaults: { minutes: 5 } },
  { type: 'webhook_out', label: 'Webhook (enviar)', icon: 'bi-globe2',
    defaults: { url: '', method: 'POST', body: '{}' } },
];

const ACTION_LABELS = Object.fromEntries(ACTION_DEFS.map((a) => [a.type, a.label]));
const ACTION_ICONS = Object.fromEntries(ACTION_DEFS.map((a) => [a.type, a.icon]));
const ACTION_DEFAULTS = Object.fromEntries(ACTION_DEFS.map((a) => [a.type, a.defaults]));

const initialGraph = (triggerType) => ({
  nodes: [
    {
      id: 'trigger',
      type: 'default',
      data: { label: 'Trigger', action: 'trigger', triggerType },
      position: { x: 50, y: 200 },
      style: nodeStyleFor('trigger'),
      sourcePosition: 'right',
      targetPosition: 'left',
    },
  ],
  edges: [],
});

function nodeStyleFor(type) {
  if (type === 'trigger') {
    return {
      background: '#1f6feb',
      color: 'white',
      borderRadius: 8,
      padding: 8,
      width: 180,
      border: '2px solid #0a3580',
      fontWeight: 600,
    };
  }
  return {
    background: '#1e1e2f',
    color: 'white',
    borderRadius: 8,
    padding: 8,
    width: 220,
    border: '1px solid #444',
  };
}

function actionNodeLabel(action) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
      <i className={`bi ${ACTION_ICONS[action] || 'bi-gear'}`} />
      <span>{ACTION_LABELS[action] || action}</span>
    </div>
  );
}

function WorkflowEditorModal({ theme, workflowId, show, onClose, onSaved }) {
  const { showError, showSuccess } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('new_message');
  const [enabled, setEnabled] = useState(true);
  const [webhookToken, setWebhookToken] = useState(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);

  // Carga inicial
  useEffect(() => {
    if (!show) return;
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
          setNodes((g.nodes || []).map((n) => ({
            ...n,
            style: nodeStyleFor(n.data?.action === 'trigger' ? 'trigger' : 'action'),
            data: {
              ...n.data,
              label: n.data?.action === 'trigger'
                ? 'Trigger'
                : actionNodeLabel(n.data?.action),
            },
          })));
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

  // Atualiza o label do nó de trigger quando muda o trigger_type
  useEffect(() => {
    setNodes((prev) =>
      prev.map((n) => (n.id === 'trigger'
        ? { ...n, data: { ...n.data, triggerType, label: 'Trigger' } }
        : n))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerType]);

  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({ ...params, animated: true }, eds));
  }, [setEdges]);

  const addActionNode = (actionType) => {
    const id = `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const offset = nodes.length * 30;
    const node = {
      id,
      type: 'default',
      position: { x: 300 + offset, y: 100 + offset },
      data: {
        action: actionType,
        config: { ...(ACTION_DEFAULTS[actionType] || {}) },
        label: actionNodeLabel(actionType),
      },
      style: nodeStyleFor('action'),
      sourcePosition: 'right',
      targetPosition: 'left',
    };
    setNodes((prev) => [...prev, node]);
  };

  const updateSelectedConfig = (patch) => {
    if (!selectedNode) return;
    setNodes((prev) => prev.map((n) => {
      if (n.id !== selectedNode.id) return n;
      return { ...n, data: { ...n.data, config: { ...(n.data.config || {}), ...patch } } };
    }));
    setSelectedNode((cur) => cur ? { ...cur, data: { ...cur.data, config: { ...(cur.data.config || {}), ...patch } } } : cur);
  };

  const deleteSelected = () => {
    if (!selectedNode || selectedNode.id === 'trigger') return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedNode.id));
    setEdges((prev) => prev.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  };

  // Serializa o grafo removendo os labels JSX (não persistir React elements)
  const serializeGraph = () => ({
    nodes: nodes.map(({ data, style: _style, ...rest }) => ({
      ...rest,
      data: {
        action: data.action,
        config: data.config || {},
        ...(data.triggerType ? { triggerType: data.triggerType } : {}),
      },
    })),
    edges: edges.map(({ id, source, target, sourceHandle, targetHandle }) => ({
      id, source, target, sourceHandle, targetHandle,
    })),
  });

  const save = async () => {
    if (!name.trim()) return showError('Dê um nome ao workflow');
    const payload = {
      name: name.trim(),
      description,
      enabled,
      trigger_type: triggerType,
      trigger_config: {},
      graph: serializeGraph(),
    };
    try {
      if (workflowId) {
        await api.put(`/workflow/${workflowId}`, payload);
      } else {
        const res = await api.post('/workflow/', payload);
        if (res.data?.data?.webhook_token) setWebhookToken(res.data.data.webhook_token);
      }
      showSuccess('Workflow salvo');
      onSaved && onSaved();
    } catch (err) {
      console.error(err);
      showError(err.response?.data?.message || 'Falha ao salvar');
    }
  };

  const webhookUrl = useMemo(() => {
    if (!webhookToken) return null;
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const schema = userData?.schema;
    if (!schema) return null;
    return `${process.env.REACT_APP_URL || ''}/api/workflow/hook/${schema}/${webhookToken}`;
  }, [webhookToken]);

  return (
    <Modal show={show} onHide={onClose} fullscreen backdrop="static">
      <Modal.Header closeButton style={{ background: `var(--bg-color-${theme})` }}>
        <Modal.Title className={`header-text-${theme}`}>
          {workflowId ? 'Editar workflow' : 'Novo workflow'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ background: `var(--bg-color-${theme})`, padding: 0 }}>
        <div style={{ display: 'flex', height: '100%' }}>
          {/* Sidebar esquerda: actions */}
          <div
            style={{
              width: 220,
              borderRight: `1px solid var(--border-color-${theme})`,
              padding: 12,
              overflowY: 'auto',
            }}
          >
            <div className={`header-text-${theme} mb-2`} style={{ fontWeight: 600 }}>Adicionar ação</div>
            {ACTION_DEFS.map((a) => (
              <button
                key={a.type}
                className={`btn btn-2-${theme} d-flex align-items-center gap-2 w-100 mb-2`}
                style={{ justifyContent: 'flex-start' }}
                onClick={() => addActionNode(a.type)}
              >
                <i className={`bi ${a.icon}`} />
                <span style={{ fontSize: 13 }}>{a.label}</span>
              </button>
            ))}
          </div>

          {/* Canvas central */}
          <div style={{ flex: 1, position: 'relative' }}>
            <div
              style={{
                padding: 10,
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                borderBottom: `1px solid var(--border-color-${theme})`,
              }}
            >
              <input
                value={name}
                placeholder="Nome do workflow"
                onChange={(e) => setName(e.target.value)}
                className={`input-${theme}`}
                style={{ flex: 1, padding: '6px 10px', borderRadius: 6 }}
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
              <button className={`btn btn-1-${theme}`} onClick={save}>Salvar</button>
            </div>
            <div style={{ height: 'calc(100vh - 200px)' }}>
              <ReactFlowProvider>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onNodeClick={(_, node) => setSelectedNode(node)}
                  onPaneClick={() => setSelectedNode(null)}
                  fitView
                >
                  <Background />
                  <Controls />
                  <MiniMap pannable zoomable />
                </ReactFlow>
              </ReactFlowProvider>
            </div>
          </div>

          {/* Sidebar direita: config do nó selecionado */}
          <div
            style={{
              width: 340,
              borderLeft: `1px solid var(--border-color-${theme})`,
              padding: 12,
              overflowY: 'auto',
            }}
          >
            {!selectedNode && (
              <div className={`card-subtitle-${theme}`}>
                Selecione um nó no canvas para configurar.
                <div className="mt-3" style={{ fontSize: 12 }}>
                  Use as setas do trigger para conectar a primeira ação. Cada ação executa em sequência seguindo as conexões.
                </div>
                {triggerType === 'webhook' && webhookToken && (
                  <div className="mt-3 p-2" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 6, wordBreak: 'break-all' }}>
                    <strong>URL do webhook:</strong>
                    <div style={{ fontSize: 11 }}>{webhookUrl}</div>
                    <div className="mt-2" style={{ fontSize: 11, opacity: 0.7 }}>
                      Faça POST com JSON; o body fica disponível em <code>{'{{payload.*}}'}</code>.
                    </div>
                  </div>
                )}
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
                Tipo de gatilho é controlado pelo seletor acima.
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
  const set = (key) => (e) => onChange({ [key]: e.target.value });

  return (
    <div>
      <div className={`header-text-${theme} mb-3 d-flex justify-content-between align-items-center`}>
        <span style={{ fontWeight: 600 }}>{ACTION_LABELS[action] || action}</span>
        <button className="btn btn-sm delete-btn" onClick={onDelete} title="Remover nó">
          <i className="bi bi-trash-fill" />
        </button>
      </div>

      {action === 'send_message' && (
        <Field theme={theme} label="Texto (suporta {{contact.name}}, {{message.body}})">
          <textarea
            className={`input-${theme} w-100`}
            rows={5}
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
              value={config.minutes ?? 0} onChange={set('minutes')}
              style={{ padding: '6px 10px', borderRadius: 6 }} />
          </Field>
          <Field theme={theme} label="Horas">
            <input type="number" min="0" className={`input-${theme} w-100`}
              value={config.hours ?? 0} onChange={set('hours')}
              style={{ padding: '6px 10px', borderRadius: 6 }} />
          </Field>
          <Field theme={theme} label="Dias">
            <input type="number" min="0" className={`input-${theme} w-100`}
              value={config.days ?? 0} onChange={set('days')}
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

export default WorkflowEditorModal;
