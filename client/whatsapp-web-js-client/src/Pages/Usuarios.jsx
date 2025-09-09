import NewUserModal from './modalPages/Usuarios_modal';
import DeleteUserModal from './modalPages/Usuarios_delete';
import EditUserModal from './modalPages/User_edit';
import UserFilasModal from './modalPages/Usuarios_gerirFilas';
import { useEffect, useState } from 'react';
import * as bootstrap from 'bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {socket} from '../socket'


// Função para refresh token
// const refreshToken = async () => {
//   try {
//     const response = await axios.post(`${process.env.REACT_APP_URL}/api/refresh-token`, {}, {
//       withCredentials: true
//     });
//     return response.data.success;
//   } catch (error) {
//     console.error('Erro ao renovar token:', error);
//     return false;
//   }
// };

// // Token expirado, tentar refresh
// const success = await refreshToken();
// if (!success) {
//   // Redirecionar para login ou tomar outra ação
// }

// // Configurar refresh automático de token
// const tokenRefreshInterval = setInterval(async () => {
//   const success = await refreshToken();
//   if (!success) {
//     clearInterval(tokenRefreshInterval);
//     // Redirecionar para login ou tomar outra ação
//   }
// }, 8000);
// clearInterval(tokenRefreshInterval);
// localStorage.setItem('tokenRefreshInterval', tokenRefreshInterval);
// clearInterval(tokenRefreshInterval);

function UsuariosPage({ theme }) {
  const userData = JSON.parse(localStorage.getItem('user')); 
  const schema = userData?.schema
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const url = process.env.REACT_APP_URL;
  const [searchTerm, setSearchTerm] = useState('');
  const [modalType, setModalType] = useState('new');
  const navigate = useNavigate();
    const [socketInstance] = useState(socket)  


  // Verificar se o usuário tem permissão para gerenciar usuários
  const canManageUsers = userData?.role === 'admin' || userData?.role === 'tecnico';
  useEffect(() => {
  if(socketInstance){
    socketInstance.emit('join', `schema_${schema}`);
    
    const handleNewUser = (user) => {
      setUsuarios(prevUsers => [...prevUsers, user]);
    };
    
    socketInstance.on('new_user', handleNewUser);
    
    return () => {
      socketInstance.off('new_user', handleNewUser);
    };
  }
}, [socketInstance, schema]);
  const handleUserDeleted = (userId) => {
    setUsuarios(prevUsers => prevUsers.filter(user => user.id !== userId));
  };

  const handleSaveUserFilas = async (selectedFilas, userId) => {
    try {
      await axios.post(`${url}/queue/update-user-queues`, {
        userId: userId,
        queueIds: selectedFilas,
        schema: schema
      }, {
        withCredentials: true
      });
      
      // Recarregar a lista de usuários para atualizar as filas
      const response = await axios.get(`${url}/api/users/${schema}`, {
        withCredentials: true
      });
      const usuariosBase = response.data.users || [];

      const usuariosComFilas = await Promise.all(
        usuariosBase.map(async (usuario) => {
          try {
            const queue = await axios.get(`${url}/queue/get-user-queue/${usuario.id}/${schema}`, {
            withCredentials: true
          });
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
      console.error('Erro ao salvar filas do usuário:', error);
              if (error.response?.status === 401) {
          // Token expirado, tentar refresh
          // const success = await refreshToken();
          // if (!success) {
            // Redirecionar para login ou tomar outra ação
          // }
        }
    }
  };

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

  // Configurar refresh automático de token
  // useEffect(() => {
  //   const tokenRefreshInterval = setInterval(async () => {
  //     const success = await refreshToken();
  //     if (!success) {
  //       clearInterval(tokenRefreshInterval);
  //       // Redirecionar para login ou tomar outra ação
  //     }
  //   }, 8000);

    // return () => {
    //   clearInterval(tokenRefreshInterval);
    // };
  // }, [navigate]);

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const response = await axios.get(`${url}/api/users/${schema}`, {
          withCredentials: true
        });
        setUsuarios(response.data.users || []);
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        if (error.response?.status === 401) {
          // Token expirado, tentar refresh
          // const success = await refreshToken();
          // if (!success) {
            // Redirecionar para login ou tomar outra ação
          // } else {
            // Tentar novamente após refresh
            fetchUsuarios();
          // }
        }
      }
    };
    fetchUsuarios();

  }, [url, schema, navigate]);

  useEffect(() => {
  const fetchUsuarios = async () => {
    try {
      const response = await axios.get(`${url}/api/users/${schema}`, {
        withCredentials: true
      });
      const usuariosBase = response.data.users || [];

      // Busca as filas de todos os usuários em paralelo
      const usuariosComFilas = await Promise.all(
  usuariosBase.map(async (usuario) => {
    try {
      const queue = await axios.get(`${url}/queue/get-user-queue/${usuario.id}/${schema}`, {
        withCredentials: true
      });
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
      if (error.response?.status === 401) {
        // Token expirado, tentar refresh
        // const success = await refreshToken();
        // if (!success) {
          // Redirecionar para login ou tomar outra ação
        // } else {
          // Tentar novamente após refresh
          fetchUsuarios();
        // }
      }
    }
  };
  fetchUsuarios();
}, [url, schema, navigate]);

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
          {canManageUsers && (
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
          )}
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
              {canManageUsers && <th>Ações</th>}
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
                      {canManageUsers && (
                        <button
                          className={`icon-btn btn-2-${theme} btn-user`}
                          data-bs-toggle="tooltip"
                          title="Gerir filas"
                          onClick={() => {
                            setUsuarioSelecionado(usuario);
                            const modal = new bootstrap.Modal(document.getElementById('UserFilasModal'));
                            modal.show();
                          }}
                        >
                          <i className="bi bi-folder"></i>
                        </button>
                      )}
                    </div>
                  </td>

                  {canManageUsers && (
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
                  )}

                </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canManageUsers && (
        <>
          <NewUserModal theme={theme} type={modalType}/>
          <EditUserModal theme={theme} user={usuarioSelecionado}/>
                     <DeleteUserModal theme={theme} usuario={usuarioSelecionado} onUserDeleted={handleUserDeleted}/>
          <UserFilasModal 
            theme={theme}
            userId={usuarioSelecionado?.id}
            userName={usuarioSelecionado?.name}
            onChange={handleSaveUserFilas}
          />
        </>
      )}
    </div>
  );
}

export default UsuariosPage;