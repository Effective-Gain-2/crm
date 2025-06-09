import React, { useState, useEffect } from 'react';
import * as bootstrap from 'bootstrap';
import axios from 'axios';
import NewQueueModal from './modalPages/Filas_novaFila';
import DeleteQueueModal from './modalPages/Filas_delete';

function FilaPage({ theme }) {
  const [filas, setFilas] = useState([]);
  const [fila, setFila] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;

  useEffect(() => {
  const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  const tooltipList = [...tooltipTriggerList].map(el => {
    if (el) {
      return new bootstrap.Tooltip(el);
    }
    return null;
  });

  return () => {
    tooltipList.forEach(t => {
      if (t && t._element && t._element.closest) {
        t.dispose();
      }
    });
  };
}, [filas]);


  useEffect(() => {
  const fetchFilas = async () => {
    try {
      const response = await axios.get(`${url}/queue/get-all-queues/${schema}`);
      setFilas(response.data.result || []);
    } catch (error) {
      console.error('Erro ao buscar filas:', error);
    }
  };
  fetchFilas();
}, [url, schema]);

const filasFiltradas = filas.filter(fila => {
  const nome = fila?.nome || '';
  return nome.toLowerCase().includes(searchTerm.toLowerCase());
});

  return (
    <div className="h-100 w-100 mx-2 pt-3">
      <div className="d-flex justify-content-between align-items-center mb-3">

        <h2 className={`mb-0 ms-3 header-text-${theme}`} style={{ fontWeight: 400 }}>Filas</h2>

        <div className="input-group" style={{ width: '40%' }}>
          <input
            type="text"
            className={`form-control input-${theme}`}
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button 
          className={`btn btn-1-${theme} d-flex gap-2`}
          data-bs-toggle="modal"
          data-bs-target="#NewQueueModal"
          >
            <i className="bi-plus-lg"></i>
            Nova Fila
          </button>        
        </div>
      </div>

      <div className={`table-responsive custom-table-${theme}`}>
        <table className="table table-bordered table-hover m-0">
          <thead style={{ backgroundColor: 'yellow', color: 'indigo' }}>
            <tr>
              <th>Nome</th>
              <th>Cor</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filasFiltradas.map((fila) => (
              <tr key={fila.id}>

                <td>{fila.name}</td>

                <td>
                <i className="bi bi-square-fill me-2" style={{ color: fila.color }}></i>
                <span>{fila.color}</span>
                </td>

                <td>
                  <button
                    className={`icon-btn btn-2-${theme} me-1 btn-user`}
                    data-bs-toggle="tooltip"
                    title="Editar"
                    onClick={() => {}}
                  >
                    <i className="bi bi-pencil-fill"></i>
                  </button>

                  <button
                    className="icon-btn text-danger"
                    data-bs-toggle="tooltip"
                    title="Excluir"
                    onClick={() => {
                      const modal = new bootstrap.Modal(document.getElementById('DeleteQueueModal'));
                      modal.show();
                      setFila(fila)
                    }}
                  >
                    <i className="bi bi-trash-fill"></i>
                  </button>

                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
        <div>
          <NewQueueModal theme={theme}/>
          <DeleteQueueModal theme={theme} fila={fila}/>
        </div>
    </div>
  );
}

export default FilaPage;