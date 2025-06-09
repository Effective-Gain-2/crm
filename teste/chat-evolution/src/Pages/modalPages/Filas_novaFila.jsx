import axios from 'axios';
import React, { useState, useEffect } from 'react';

function NewQueueModal({ theme, superUsers = [] }) {
  const [title, setTitle] = useState('');
  const [superUser, setSuperUser] = useState('');
  const [users, setUser] = useState([]);
  const [autoDistribution, setAutoDistribution] = useState(false);
  const userData = JSON.parse(localStorage.getItem('user')); 
  const schema = userData?.schema

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_URL}/api/users/${schema}`);

        setUser(response.data.users || []);
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
      }
    };

    fetchUsuarios();
  }, []);

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
      })
      console.log(response.data)
    }catch(error){
      console.error('Erro ao salvar a fila:', error);
      return;
    }
    console.log({
      title,
      superUser,
      autoDistribution,
    });
    setTitle('');
    setSuperUser('');
    setAutoDistribution(false);
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