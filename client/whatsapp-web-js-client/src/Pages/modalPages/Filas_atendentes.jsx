import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from 'react-bootstrap';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';

// Papéis que efetivamente atendem cliente — os mesmos que o round-robin do ChatService
// considera elegíveis. Técnico, master e visualizador não entram na distribuição, então
// não fazem sentido na lista de atendentes da fila.
const ATENDE = ['user', 'operacional', 'lider'];

function FilasAtendentesModal({ theme, show, onHide, fila, onSave }) {
  const { showError, showSuccess } = useToast();
  const [users, setUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;

  const fetchDados = useCallback(async () => {
    if (!fila?.id || !schema) return;
    setIsLoading(true);
    try {
      const [todos, naFila] = await Promise.all([
        axios.get(`${url}/api/users/${schema}`, { withCredentials: true }),
        axios.get(`${url}/queue/get-users-in-queue/${fila.id}/${schema}`, { withCredentials: true }),
      ]);

      const atendentes = (todos.data.users || []).filter(u =>
        ATENDE.includes(String(u.permission || '').toLowerCase())
      );
      setUsers(atendentes);
      setSelectedIds((naFila.data.data || []).map(row => row.user_id));
    } catch (error) {
      console.error('Erro ao carregar atendentes da fila:', error);
      setUsers([]);
      setSelectedIds([]);
    } finally {
      setIsLoading(false);
    }
  }, [fila?.id, schema, url]);

  useEffect(() => {
    if (show) fetchDados();
  }, [show, fetchDados]);

  const toggle = (userId) => {
    setSelectedIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSave = async () => {
    if (!fila?.id) {
      showError('Nenhuma fila selecionada.');
      return;
    }
    setIsSaving(true);
    try {
      // set-queue-users troca só os membros DESTA fila. O update-user-queues, usado pela
      // tela de Usuários, apagaria as outras filas de cada atendente.
      await axios.put(`${url}/queue/set-queue-users`, {
        queueId: fila.id,
        userIds: selectedIds,
        schema: schema,
      }, { withCredentials: true });

      showSuccess('Atendentes da fila atualizados.');
      if (typeof onSave === 'function') onSave(fila.id, selectedIds.length);
      onHide();
    } catch (error) {
      // O interceptor global do axios já exibe a mensagem devolvida pela API.
      console.error('Erro ao salvar atendentes da fila:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="md"
      centered
      backdrop="static"
      style={{ zIndex: 1070 }}
    >
      <Modal.Header closeButton style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <h5 className={`modal-title header-text-${theme} mb-0`}>Atendentes da fila</h5>
      </Modal.Header>

      <Modal.Body style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <div className="mb-3">
          <label className={`form-label header-text-${theme}`}>
            Fila: <strong>{fila?.name}</strong>
          </label>
        </div>

        {fila?.distribution && (
          <div className={`mb-3 card-subtitle-${theme}`} style={{ fontSize: '0.85rem' }}>
            A distribuição automática está ligada nesta fila. Sem nenhum atendente marcado,
            todo chat que cair aqui vai para <strong>espera</strong>.
          </div>
        )}

        {isLoading ? (
          <div className={`header-text-${theme}`}>
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Carregando...
          </div>
        ) : users.length === 0 ? (
          <div className={`card-subtitle-${theme}`}>
            Nenhum usuário com perfil de atendimento (operacional ou líder) cadastrado nesta empresa.
          </div>
        ) : (
          <div style={{ maxHeight: '45vh', overflowY: 'auto' }}>
            {users.map((user) => (
              <div className="form-check mb-2" key={user.id}>
                <input
                  className={`form-check-input input-${theme}`}
                  type="checkbox"
                  id={`atendente-${user.id}`}
                  checked={selectedIds.includes(user.id)}
                  onChange={() => toggle(user.id)}
                  disabled={isSaving}
                />
                <label className={`form-check-label header-text-${theme}`} htmlFor={`atendente-${user.id}`}>
                  {user.name}
                  <span className={`ms-2 card-subtitle-${theme}`} style={{ fontSize: '0.8rem' }}>
                    {String(user.permission || '').toLowerCase() === 'lider' ? 'líder' : 'operacional'}
                  </span>
                </label>
              </div>
            ))}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <button
          type="button"
          className={`btn btn-2-${theme}`}
          onClick={onHide}
          disabled={isSaving}
        >
          Cancelar
        </button>
        <button
          type="button"
          className={`btn btn-1-${theme}`}
          onClick={handleSave}
          disabled={isSaving || isLoading}
        >
          {isSaving ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Salvando...
            </>
          ) : (
            'Salvar Atendentes'
          )}
        </button>
      </Modal.Footer>
    </Modal>
  );
}

export default FilasAtendentesModal;
