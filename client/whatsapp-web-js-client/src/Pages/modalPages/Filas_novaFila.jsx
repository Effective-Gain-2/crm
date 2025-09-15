import axios from 'axios';
import React, { useState, useEffect } from 'react';

function NewQueueModal({ theme, superUsers = [] }) {
  const [title, setTitle] = useState('');
  const [superUser, setSuperUser] = useState('');
  const [users, setUser] = useState([]);
  const [autoDistribution, setAutoDistribution] = useState(false);
  const [funilSelecionado, setFunilSelecionado] = useState('');
  const [funis, setFunis] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [etapaSelecionada, setEtapaSelecionada] = useState('');
  const userData = JSON.parse(localStorage.getItem('user')); 
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
  }, []);

  // Buscar funis do kanban
  useEffect(() => {
    const fetchFunis = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_URL}/kanban/get-funis/${schema}`, {
          withCredentials: true
        });
        // Os funis vêm em response.data.name
        const funisData = response.data.name || [];
        setFunis(funisData);
      } catch (error) {
        console.error('Erro ao buscar funis:', error);
      }
    };

    fetchFunis();
  }, [schema]);

  // Buscar etapas quando funil for selecionado
  useEffect(() => {
    if (!funilSelecionado) {
      setEtapas([]);
      setEtapaSelecionada('');
      return;
    }

    const fetchEtapas = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_URL}/kanban/get-stages/${funilSelecionado}/${schema}`, {
          withCredentials: true
        });
        setEtapas(response.data || []);
        setEtapaSelecionada(''); // Reset etapa selecionada
      } catch (error) {
        console.error('Erro ao buscar etapas:', error);
        setEtapas([]);
      }
    };

    fetchEtapas();
  }, [funilSelecionado, schema]);

  const handleSave = async () => {
    if (!title || !superUser) {
      console.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try{
      const response = await axios.post(`${process.env.REACT_APP_URL}/queue/create-queue`,{
        name: title,
        super_user: superUser,
        schema: schema,
        distribution: autoDistribution,
        stage_id: etapaSelecionada || null,
      },
        {
      withCredentials: true
    })
    }catch(error){
      console.error('Erro ao salvar a fila:', error);
      return;
    }
    setTitle('');
    setSuperUser('');
    setAutoDistribution(false);
    setFunilSelecionado('');
    setEtapaSelecionada('');
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
                <option value="" disabled>
                  Escolha um usuário
                </option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user ? user.name:'...'}
                  </option>
                ))}
              </select>
            </div>

            {/* Funil do Kanban */}
            <div className="mb-3">
              <label htmlFor="funilKanban" className={`form-label card-subtitle-${theme}`}>
                Funil do Kanban
              </label>
              <select
                className={`form-select input-${theme}`}
                id="funilKanban"
                value={funilSelecionado}
                onChange={(e) => setFunilSelecionado(e.target.value)}
              >
                <option value="" disabled>
                  Escolha um funil
                </option>
                {funis.map((funil) => (
                  <option key={funil} value={funil}>
                    {funil}
                  </option>
                ))}
              </select>
            </div>

            {/* Etapa do Kanban */}
            {funilSelecionado && (
              <div className="mb-3">
                <label htmlFor="etapaKanban" className={`form-label card-subtitle-${theme}`}>
                  Etapa do Kanban
                </label>
                <select
                  className={`form-select input-${theme}`}
                  id="etapaKanban"
                  value={etapaSelecionada}
                  onChange={(e) => setEtapaSelecionada(e.target.value)}
                >
                  <option value="" disabled>
                    Escolha uma etapa
                  </option>
                  {etapas.map((etapa) => (
                    <option key={etapa.id} value={etapa.id}>
                      {etapa.etapa}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
            >
              Salvar Fila
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewQueueModal;