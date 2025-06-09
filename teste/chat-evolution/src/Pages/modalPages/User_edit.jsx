import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as bootstrap from 'bootstrap';

function EditUserModal({ theme, user }) {
  const [userName, setUserName] = useState(user?.name || '');
  const [userEmail, setUserEmail] = useState(user?.email || '');
  const [userRole, setUserRole] = useState(user?.role || '');
  const userData = JSON.parse(localStorage.getItem('user')); 
  const schema = userData?.schema

    const url = process.env.REACT_APP_URL;

  useEffect(() => {
  setUserName(user?.name || '');
  setUserEmail(user?.email || '');
  setUserRole(
  user?.role === 'admin' || user?.role === 'user'
    ? user.role
    : user?.permission === 'admin' || user?.permission === 'user'
      ? user.permission
      : ''
);
}, [user]);

  const handleSave = async () => {
    if (!userName || !userEmail || !userRole) {
      console.error('Preencha todos os campos.');
      return;
    }

    try {
      const response = await axios.put(
        `${url}/api/update-user`,
        {
          userId: user.id,
          userName: userName,
          userEmail: userEmail,
          userRole: userRole,
          schema: schema
        }
      );
      console.log('Usuário editado:', response.data);
      // Aqui você pode fechar o modal ou atualizar a lista de usuários, se necessário
    } catch (error) {
      console.error('Erro ao editar usuário:', error);
    }
  };

  return (
    <div className="modal fade" id="EditUserModal" tabIndex="-1" aria-labelledby="EditUserModalLabel" aria-hidden="true">
      <div className="modal-dialog modal-sm">
        <div className="modal-content" style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <div className="modal-header">
            <h5 className={`modal-title header-text-${theme}`} id="EditUserModalLabel">
              Editar Usuário
            </h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>

          <div className="modal-body pb-0">
            {/* Nome */}
            <div className="mb-3">
              <label htmlFor="userName" className={`form-label card-subtitle-${theme}`}>Nome</label>
              <input
                type="text"
                className={`form-control input-${theme}`}
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Digite o nome"
              />
            </div>

            {/* Email */}
            <div className="mb-3">
              <label htmlFor="userEmail" className={`form-label card-subtitle-${theme}`}>Email</label>
              <input
                type="email"
                className={`form-control input-${theme}`}
                id="userEmail"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="Digite o email"
              />
            </div>

            {/* Perfil */}
            <div className="mb-3">
              <label htmlFor="userRole" className={`form-label card-subtitle-${theme}`}>Perfil</label>
              <select
                className={`form-select input-${theme}`}
                id="userRole"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                >
                <option value="" disabled>Selecione um perfil</option>
                <option value="user">Usuário</option>
                <option value="admin">Administrador</option>
            </select>
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
              Editar usuário
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditUserModal;