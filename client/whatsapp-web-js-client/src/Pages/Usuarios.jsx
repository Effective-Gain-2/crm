import NewUserModal from './modalPages/Usuarios_modal';
import DeleteUserModal from './modalPages/Usuarios_delete';
import EditUserModal from './modalPages/User_edit';
import UserFilasModal from './modalPages/Usuarios_gerirFilas';
import { useEffect, useState } from 'react';
import * as bootstrap from 'bootstrap';
import axios from 'axios';

function UsuariosPage({ theme }) {
  const userData = JSON.parse(localStorage.getItem('user')); 
  const schema = userData?.schema
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const url = process.env.REACT_APP_URL;
  const [searchTerm, setSearchTerm] = useState('');
  const [modalType, setModalType] = useState('new');

  useEffect(() => {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach((el) => {
      if (el) {
        new bootstrap.Tooltip(el);
      }
    });

    return () => {
      tooltipTriggerList.forEach((el) => {
        if (el) {
          const tooltip = bootstrap.Tooltip.getInstance(el);
          if (tooltip) tooltip.dispose();
        }
      });
    };
  }, [usuarios]);

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const response = await axios.get(`${url}/api/users/${schema}`);
        setUsuarios(response.data.users || []);
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
      }
    };
    fetchUsuarios();

  }, []);

  useEffect(() => {
  const fetchUsuarios = async () => {
    try {
      const response = await axios.get(`${url}/api/users/${schema}`);
      const usuariosBase = response.data.users || [];

      // Busca as filas de todos os usuários em paralelo
      const usuariosComFilas = await Promise.all(
  usuariosBase.map(async (usuario) => {
    try {
      const queue = await axios.get(`${url}/queue/get-user-queue/${usuario.id}/${schema}`);
      let queueNames = '-';
      if (queue.data?.result) {
        if (Array.isArray(queue.data.result)) {
          queueNames = queue.data.result.map(fila => fila.name).filter(Boolean).join(', ') || '-';
        } else if (typeof queue.data.result === 'object') {
          queueNames = queue.data.result.name || '-';
        } else {
          queueNames = queue.data.result.toString();
        }
      }
      return { ...usuario, queue: queueNames };
    } catch (error) {
      return { ...usuario, queue: '-' };
    }
  })
);

      setUsuarios(usuariosComFilas);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    }
  };
  fetchUsuarios();
}, [url, schema]);

  return (
    <div className="h-100 w-100 mx-2 pt-3">
      <div className="d-flex justify-content-between align-items-center mb-3">

        <h2 className={`mb-0 ms-3 header-text-${theme}`} style={{ fontWeight: 400 }}>Usuários</h2>
        
        <div className="input-group" style={{width: '40%'}}>
          <input
            type="text"
            className={`form-control input-${theme}`}
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button 
            className={`btn btn-1-${theme}`} 
            onClick={() => {
              setModalType('new');
              setTimeout(() => {
                const modalElement = document.getElementById('NewUserModal');
                if (modalElement) {
                  const modal = new bootstrap.Modal(modalElement);
                  modal.show();
                }
              }, 0);
            }}
          >
            Adicionar Usuário
          </button>
        </div>
      </div>

      <div className={`table-responsive custom-table-${theme}`}>
        <table className="table table-bordered table-hover m-0">
          <thead style={{ backgroundColor: 'yellow', color: 'indigo' }}>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Perfil</th>
              <th>Filas</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios
              .filter((usuario) =>
                usuario.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                usuario.email.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((usuario) => (
                <tr key={usuario.id}>
                  <td>{usuario.name}</td>
                  <td>{usuario.email}</td>
                  <td>{usuario.permission}</td>

                  <td>
                    <div className='d-flex justify-content-between'>
                      {usuario.queue}
                      <button
                        className={`icon-btn btn-2-${theme} btn-user`}
                        data-bs-toggle="tooltip"
                        title="Gerir filas"
                        onClick={() => {
                          const modal = new bootstrap.Modal(document.getElementById('UserFilasModal'));
                          modal.show();
                        }}
                      >
                        <i className="bi bi-folder"></i>
                      </button>
                    </div>
                  </td>

                  <td>
                    <button
                      className={`icon-btn btn-2-${theme} btn-user`}
                      data-bs-toggle="tooltip"
                      title="Editar"
                      onClick={() => {
                        setModalType('edit');
                        setUsuarioSelecionado(usuario);
                        const modal = new bootstrap.Modal(document.getElementById('EditUserModal'));
                        modal.show();
                      }}
                    >
                      <i className="bi bi-pencil-fill"></i>
                    </button>

                    <button
                      className="icon-btn text-danger"
                      data-bs-toggle="tooltip"
                      title="Excluir"
                      onClick={() => {
                        setUsuarioSelecionado(usuario);
                        const modal = new bootstrap.Modal(document.getElementById('DeleteUserModal'));
                        modal.show();
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
      <NewUserModal theme={theme} type={modalType}/>
      <EditUserModal theme={theme} user={usuarioSelecionado}/>
      <DeleteUserModal theme={theme} usuario={usuarioSelecionado}/>
      <UserFilasModal theme={theme}/>
    </div>
  );
}

export default UsuariosPage;