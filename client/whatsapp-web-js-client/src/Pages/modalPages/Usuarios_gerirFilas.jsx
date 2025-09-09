import React, { useState, useEffect } from 'react';
import axios from 'axios';

function UserFilasModal({ theme, userId, userName, onChange }) {
  const [selectedFilas, setSelectedFilas] = useState([]);
  const [allFilas, setAllFilas] = useState([]);
  const [userFilas, setUserFilas] = useState([]);
  const [loading, setLoading] = useState(true);
  const url = process.env.REACT_APP_URL;
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;

  
  const fetchAllFilas = async () => {
    try {
      const response = await axios.get(`${url}/queue/get-all-queues/${schema}`,
        {
      withCredentials: true
    });
      
      setAllFilas(response.data.result || []);
    } catch (error) {
      console.error('Erro ao buscar filas:', error);
      setAllFilas([]);
    }
  };

      const fetchUserFilas = async () => {
      if (!userId) return;
      
      try {
        const response = await axios.get(`${url}/queue/get-user-queue/${userId}/${schema}`,
        {
      withCredentials: true
    });
        
        let userQueueIds = [];
        if (response.data.result) {
          if (Array.isArray(response.data.result)) {
            // A API retorna objetos com id, então extraímos os 
            userQueueIds = response.data.result.map(fila => fila.id);
          } else if (typeof response.data.result === 'object') {
            userQueueIds = [response.data.result.id];
          } else {
            userQueueIds = response.data.result;
          }
        }
        
        setUserFilas(userQueueIds);
        setSelectedFilas(userQueueIds);
      } catch (error) {
        console.error('Erro ao buscar filas do usuário:', error);
        setUserFilas([]);
        setSelectedFilas([]);
      }
    }

  // Carregar dados quando o modal abrir
  useEffect(() => {
    if (userId) {
      setLoading(true);
      Promise.all([fetchAllFilas(), fetchUserFilas()])
        .finally(() => setLoading(false));
    }
  }, [userId, schema]);

  const handleToggleFila = (filaId) => {
    let novasFilas;
    if (selectedFilas.includes(filaId)) {
      novasFilas = selectedFilas.filter(f => f !== filaId);
    } else {
      novasFilas = [...selectedFilas, filaId];
    }
    setSelectedFilas(novasFilas);
  };

  const handleSaveChanges = async () => {
    try {
      const response = await axios.post(`${url}/queue/update-user-queues`, {
        userId: userId,
        queueIds: selectedFilas,
        schema: schema
      },
        {
      withCredentials: true
    });

      if (response.data.success) {
        if (onChange) {
          onChange(selectedFilas, userId);
        }
      } else {
      }
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
    }
  };

  return (
    <div className="modal fade" id="UserFilasModal" tabIndex="-1" aria-labelledby="UserFilasModalLabel" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content" style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <div className="modal-header gap-3">
            <i className={`bi bi-folder header-text-${theme}`}></i>
            <h5 className={`modal-title header-text-${theme}`} id="UserFilasModalLabel">
              Gerir Filas
            </h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>

          <div className="modal-body">
            
            <p className="text-danger-true mb-3">Usuário: 
                <span className={`fw-bold header-text-${theme} ms-1`}>
                {userName || 'Usuário'}
                </span>
            </p>

            {loading ? (
              <div className="text-center py-3">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Carregando...</span>
                </div>
              </div>
            ) : (
              <div className="list-group">
                {allFilas.map((fila) => {
                  const isChecked = selectedFilas.includes(fila.id);
                  
                  return (
                    <label
                      key={fila.id}
                      className={`list-group-item d-flex align-items-center justify-content-between gap-2 input-${theme}`}
                      style={{ cursor: 'pointer' }}
                    >
                    <div>
                        <input
                        className="form-check-input me-2"
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleFila(fila.id)}
                        />
                        {fila.name}
                    </div>
                        <span className='text-unchanged d-none'>
                            Super-usuário
                        </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className={`btn btn-2-${theme}`}
              data-bs-dismiss="modal"
            >
              Fechar
            </button>
            <button
              type="button"
              className={`btn btn-1-${theme}`}
              onClick={handleSaveChanges}
            >
              Salvar Filas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserFilasModal;