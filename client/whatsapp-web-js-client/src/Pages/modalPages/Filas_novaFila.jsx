import axios from 'axios';
import React, { useState, useEffect } from 'react';
import * as bootstrap from 'bootstrap';
import { useToast } from '../../contexts/ToastContext';
import CamposConexoes from './Filas_camposConexoes';

function NewQueueModal({ theme, superUsers = [] }) {
  const [title, setTitle] = useState('');
  const [superUser, setSuperUser] = useState('');
  const [users, setUser] = useState([]);
  const [autoDistribution, setAutoDistribution] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [conexoesIds, setConexoesIds] = useState([]);
  const { showError, showSuccess } = useToast();
  const userData = JSON.parse(localStorage.getItem('user'));
  // Líder não escolhe o superusuário: o servidor grava ele mesmo como dono da fila.
  const escolheSuperUsuario = ['tecnico', 'master', 'admin']
    .includes(String(userData?.role || '').toLowerCase()); 
  const schema = userData?.schema

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
    // pode nascer sem líder e ganhar um depois.
    if (!title.trim()) {
      showError('Informe o título da fila.');
      return;
    }

    setIsSaving(true);
    try{
      const resposta = await axios.post(`${process.env.REACT_APP_URL}/queue/create-queue`,{
        name: title.trim(),
        super_user: superUser || null,
        schema: schema,
        distribution: autoDistribution,
      },
        {
      withCredentials: true
    })

      // O vínculo número->fila mora em connections.queue_id, então só dá para gravar
      // depois que a fila existe e tem id.
      const novaFilaId = resposta.data?.result?.id;
      if (novaFilaId && conexoesIds.length > 0) {
        await axios.put(`${process.env.REACT_APP_URL}/queue/set-queue-connections`, {
          queueId: novaFilaId,
          connectionIds: conexoesIds,
          schema: schema,
        }, { withCredentials: true });
      }
    }catch(error){
      // O interceptor global do axios já exibe o toast com a mensagem devolvida pela API
      // (nome duplicado vira 409 "Já existe uma fila com esse nome").
      console.error('Erro ao salvar a fila:', error);
      return;
    }finally{
      setIsSaving(false);
    }
    showSuccess('Fila criada com sucesso.');
    setTitle('');
    setSuperUser('');
    setAutoDistribution(false);
    setConexoesIds([]);
    bootstrap.Modal.getInstance(document.getElementById('NewQueueModal'))?.hide();
  };

  return (
    <div className="modal fade" id="NewQueueModal" tabIndex="-1" aria-labelledby="NewQueueModalLabel" aria-hidden="true">
      <div className="modal-dialog modal-sm">
        <div className="modal-content" style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <div className="modal-header gap-3">
            <i className={`bi bi-diagram-3 header-text-${theme}`}></i>
            <h5 className={`modal-title header-text-${theme}`} id="NewQueueModalLabel">
                Dados da Fila
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

            {/* Super-usuário — só para quem escolhe o dono da fila */}
            {escolheSuperUsuario && (
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
                      {user ? user.name:'...'}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                value={autoDistribution ? 'true' : 'false'}
                onChange={() => setAutoDistribution((prev) => !prev)}
              />
              <label className={`form-check-label card-subtitle-${theme}`} htmlFor="autoDistribution">
                Distribuição automática
              </label>
            </div>
            {autoDistribution && (
              <small className={`d-block header-text-${theme}`} style={{ opacity: 0.75 }}>
                Os leads são distribuídos em rodízio entre os membros da fila que estão
                de jornada no dia e não foram inativados. Depois de salvar, adicione os
                atendentes em <strong>Gerir filas</strong> — sem membros, ninguém recebe.
              </small>
            )}
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
              {isSaving ? 'Salvando...' : 'Salvar Fila'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewQueueModal;