import React, { useState } from 'react';
import axios from 'axios';
import { useEffect } from 'react';
import * as bootstrap from 'bootstrap';

function NewUserModal({ theme, type }) {
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const userData = JSON.parse(localStorage.getItem('user')); 
  const schema = userData?.schema
  const url = process.env.REACT_APP_URL;

  const handleConfirmPasswordBlur = () => {
    if (confirmPassword && confirmPassword !== password) {
      console.error('As senhas não coincidem.');
    }
  };

  const handleSave = async () => {
    if (!userName || !userEmail || !userRole || (type === 'edit' && !verifyPassword)) {
      console.error('Preencha todos os campos.');
      return;
    }

    if (password !== confirmPassword) {
      console.error('As senhas não coincidem.');
      return;
    }

    try {
      const response = await axios.post(`${url}/api/users`, {
        name: userName,
        email: userEmail,
        role: userRole,
        password: password,
        schema: schema
      });

      console.log('Usuário criado:', response.data);

      setUserName('');
      setUserEmail('');
      setUserRole('');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
    }
  };

  useEffect(() => {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(el => new bootstrap.Tooltip(el));

    return () => tooltipList.forEach(tooltip => tooltip.dispose());
  }, []);


  return (
    <div className="modal fade" id="NewUserModal" tabIndex="-1" aria-labelledby="NewUserModalLabel" aria-hidden="true">
      <div className="modal-dialog modal-sm">
        <div className="modal-content" style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <div className="modal-header gap-3">
            <i className={`bi bi-people header-text-${theme}`}></i>
            <h5 className={`modal-title header-text-${theme}`} id="NewUserModalLabel">
              Dados do Usuário
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

            {type === 'edit' && (
              <div className="mb-3 d-flex align-items-center justify-content-start">
                <button
                  type="button"
                  className={`btn btn-2-${theme}`}
                  data-bs-toggle="tooltip"
                  data-bs-placement="right"
                  title="Envia um email para alteração da senha."
                  onClick={() => console.log('Verificar senha')}
                  disabled
                >
                  <i className='bi bi-envelope'></i>
                  <span className='ms-2'>Alterar senha</span>
                </button>
              </div>
            )}

            {type === 'new' && (
              <div>
                <div className="mb-3">
                  <label htmlFor="userPassword" className={`form-label card-subtitle-${theme}`}>Senha</label>
                  <input
                    type="password"
                    className={`form-control input-${theme}`}
                    id="userPassword"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite a senha"
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="confirmPassword" className={`form-label card-subtitle-${theme}`}>Confirmar Senha</label>
                  <input
                    type="password"
                    className={`form-control input-${theme}`}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={handleConfirmPasswordBlur}
                    placeholder="Confirme a senha"
                  />
                </div>
              </div>
            )}

          </div>
            

          {password !== confirmPassword && confirmPassword && (
            <div className="alert alert-danger py-1 px-2 mx-5 small d-flex justify-content-center" role="alert">
              As senhas não coincidem.
            </div>
          )}

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
              Criar Usuário
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewUserModal;