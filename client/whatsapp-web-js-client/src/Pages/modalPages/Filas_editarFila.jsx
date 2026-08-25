import axios from 'axios';
import React, { useState, useEffect } from 'react';
import * as bootstrap from 'bootstrap';
import { useToast } from '../../contexts/ToastContext';
import CamposConexoes from './Filas_camposConexoes';

function EditQueueModal({ theme, fila, onQueueUpdated }) {
  const [title, setTitle] = useState('');
  const [superUser, setSuperUser] = useState('');
  const [users, setUser] = useState([]);
  const [autoDistribution, setAutoDistribution] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [conexoesIds, setConexoesIds] = useState([]);
  const { showError, showSuccess } = useToast();
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;

  useEffect(() => {
    if (fila) {
      setTitle(fila.name || '');
      setSuperUser(fila.superuser || '');
      setAutoDistribution(fila.distribution || false);
    }
  }, [fila]);

  // Números vinculados hoje. Vem do servidor (connections.queue_id) e não do objeto da
  // fila, que não carrega essa informação.
  useEffect(() => {
    const buscarConexoes = async () => {
      if (!fila?.id || !schema) { setConexoesIds([]); return; }
      try {
        const r = await axios.get(
          `${process.env.REACT_APP_URL}/queue/get-queue-connections/${fila.id}/${schema}`,
          { withCredentials: true }
        );
        setConexoesIds((r.data.connections || []).map(c => c.id));
      } catch (error) {
        console.error('Erro ao buscar números da fila:', error);
        setConexoesIds([]);
      }
    };
    buscarConexoes();
  }, [fila?.id, schema]);

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_URL}/api/users/${schema}`, {
          withCredentials: true
        });
        setUser(response.data.users || []);
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
      }
    };

    fetchUsuarios();
  }, [schema]);

  const handleSave = async () => {
    // Só o título é obrigatório: superuser é nullable (ON DELETE SET NULL), então uma fila
    // cujo líder foi removido volta com o select vazio e precisa continuar editável.
    if (!title.trim()) {
      showError('Informe o título da fila.');
      return;
    }
    if (!fila?.id) {
      showError('Nenhuma fila selecionada.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await axios.put(`${process.env.REACT_APP_URL}/queue/update-queue`, {
        queueId: fila.id,
        name: title.trim(),
        super_user: superUser || null,
        distribution: autoDistribution,
        schema: schema,
      }, {
        withCredentials: true
      });

      // Números primeiro: se este passo falhar, o interceptor mostra o erro e a fila
      // não é dada como salva com um vínculo que não gravou.
      await axios.put(`${process.env.REACT_APP_URL}/queue/set-queue-connections`, {
        queueId: fila.id,
        connectionIds: conexoesIds,
        schema: schema,
      }, { withCredentials: true });

      if (response.data?.success) {
        showSuccess('Fila atualizada com sucesso.');
        if (typeof onQueueUpdated === 'function') {
          onQueueUpdated(response.data.result);
        }
        bootstrap.Modal.getInstance(document.getElementById('EditQueueModal'))?.hide();
      }
    } catch (error) {
      // O interceptor global do axios já exibe o toast com a mensagem devolvida pela API.
      console.error('Erro ao atualizar a fila:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal fade" id="EditQueueModal" tabIndex="-1" aria-labelledby="EditQueueModalLabel" aria-hidden="true">
      <div className="modal-dialog modal-sm">
        <div className="modal-content" style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <div className="modal-header gap-3">
            <i className={`bi bi-pencil-square header-text-${theme}`}></i>
            <h5 className={`modal-title header-text-${theme}`} id="EditQueueModalLabel">
              Editar Fila
            </h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            {/* Título */}
            <div className="mb-3">
              <label htmlFor="queueTitle" className={`form-label card-subtitle-${theme}`}>
                Título
              </label>
              <input
                type="text"
                className={`form-control input-${theme}`}
                id="queueTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Digite o título da fila"
              />
            </div>

            {/* Super-usuário */}
            <div className="mb-3">
              <label htmlFor="superUser" className={`form-label card-subtitle-${theme}`}>
                Super-usuário
              </label>
              <select
                className={`form-select input-${theme}`}
                id="superUser"
                value={superUser}
                onChange={(e) => setSuperUser(e.target.value)}
              >
                <option value="">
                  Nenhum
                </option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user ? user.name : '...'}
                  </option>
                ))}
              </select>
            </div>

            {/* Números (conexões) que atendem a fila */}
            <CamposConexoes
              theme={theme}
              value={conexoesIds}
              onChange={setConexoesIds}
              disabled={isSaving}
            />

            {/* Distribuição automática */}
            <div className="mb-3 form-check form-switch">
              <input
                className={`form-check-input input-${theme}`}
                type="checkbox"
                id="autoDistribution"
                checked={autoDistribution}
                onChange={() => setAutoDistribution((prev) => !prev)}
              />
              <label className={`form-check-label card-subtitle-${theme}`} htmlFor="autoDistribution">
                Distribuição automática
              </label>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className={`btn btn-2-${theme}`}
              data-bs-dismiss="modal"
            >
              Cancelar
            </button>
            <button
              type="button"
              className={`btn btn-1-${theme}`}
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Salvando...' : 'Atualizar Fila'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditQueueModal;
