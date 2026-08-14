import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as bootstrap from 'bootstrap';

function EditUserModal({ theme, user }) {
  const [userName, setUserName] = useState(user?.name || '');
  const [userEmail, setUserEmail] = useState(user?.email || '');
  const [userRole, setUserRole] = useState(user?.role || '');
  const [novaSenha, setNovaSenha] = useState('');
  const [feedback, setFeedback] = useState('');
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema

    const url = process.env.REACT_APP_URL;

  useEffect(() => {
  setUserName(user?.name || '');
  setUserEmail(user?.email || '');
  // Normaliza papéis legados (admin→master, user→operacional) para o select atual
  const normalizeRole = (r) => {
    if (r === 'admin') return 'master';
    if (r === 'user') return 'operacional';
    return ['master', 'lider', 'operacional'].includes(r) ? r : '';
  };
  setUserRole(normalizeRole(user?.role) || normalizeRole(user?.permission));
  setNovaSenha('');
  setFeedback('');
}, [user]);

  const handleSave = async () => {
    setFeedback('');
    if (!userName || !userEmail || !userRole) {
      setFeedback('Preencha nome, email e perfil.');
      return;
    }
    if (novaSenha && novaSenha.length < 8) {
      setFeedback('A nova senha deve ter ao menos 8 caracteres.');
      return;
    }

    try {
      await axios.put(
        `${url}/api/update-user`,
        {
          userId: user.id,
          userName,
          userEmail,
          userRole,
          schema,
          ...(novaSenha ? { newPassword: novaSenha } : {}),
        },
        { withCredentials: true }
      );
      setFeedback(novaSenha ? 'Usuário atualizado e senha redefinida.' : 'Usuário atualizado.');
      setNovaSenha('');
    } catch (error) {
      setFeedback(error.response?.data?.error || 'Erro ao editar usuário.');
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
                <option value="operacional">Operacional</option>
                <option value="lider">Líder</option>
                <option value="master">Master</option>
            </select>
            </div>

            {/* Reset de senha (o master define uma senha temporária; o usuário troca depois em "Alterar minha senha") */}
            <div className="mb-3">
              <label htmlFor="novaSenha" className={`form-label card-subtitle-${theme}`}>Redefinir senha (opcional)</label>
              <input
                type="password"
                className={`form-control input-${theme}`}
                id="novaSenha"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="deixe em branco para não alterar"
                autoComplete="new-password"
              />
              <small className={`card-subtitle-${theme}`}>Mínimo 8 caracteres. Peça ao usuário para trocá-la no primeiro acesso.</small>
            </div>

            {feedback && (
              <div className={`alert py-2 ${feedback.includes('Erro') || feedback.includes('Preencha') || feedback.includes('deve ter') ? 'alert-danger' : 'alert-success'}`}>
                {feedback}
              </div>
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