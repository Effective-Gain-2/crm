import axios from 'axios';
import React, { useState } from 'react';
import * as bootstrap from 'bootstrap';

function DeleteUserModal({ theme, usuario, onUserDeleted }) {
  const [password, setPassword] = useState('');
  const [showError, setShowError] = useState(false);
  const userData = JSON.parse(localStorage.getItem('user')); 
  const url = process.env.REACT_APP_URL;

  const handleDelete=async()=>{
    try{
      const deletion = await axios.delete(`${url}/api/delete-user`, {
        data: { user_id: usuario.id, schema:userData.schema },
      }, {
        withCredentials: true
      });
      
      if (onUserDeleted) {
        onUserDeleted(usuario.id);
      }
      
      // Fechar o modal
      const modal = document.getElementById('DeleteUserModal');
      if (modal) {
        const bootstrapModal = bootstrap.Modal.getInstance(modal);
        if (bootstrapModal) {
          bootstrapModal.hide();
        }
      }
    }catch(error){
      console.error('Erro ao deletar usuário:', error);
    }
  }
    
  return (
    <div className="modal fade" id="DeleteUserModal" tabIndex="-1" aria-labelledby="DeleteUserModalLabel" aria-hidden="true">
      <div className="modal-dialog modal-md">
        <div className="modal-content" style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <div className="modal-header gap-3">
            <i className={`bi bi-trash header-text-${theme}`}></i>
            <h5 className={`modal-title header-text-${theme}`} id="DeleteUserModalLabel">
              Confirmar exclusão
            </h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>

          <div className="modal-body">
            {
              usuario?(
                <>
                <p className={`card-subtitle-${theme} mb-1`}>Tem certeza que deseja excluir este usuário?</p>
                
                <p className="text-danger-true fw-bold mb-1">Nome: 
                    <span className={`fw-bold header-text-${theme} ms-1`}>
                    {usuario.name}
                    </span>
                </p>
                <p className="text-danger-true fw-bold mb-3">Email: 
                    <span className={`fw-bold header-text-${theme} ms-1`}>
                        {usuario.email}
                    </span>
                </p>
    
                <p className={`card-subtitle-${theme}`}>Essa será uma ação irreversível. Para confirmar, preencha sua senha abaixo.</p>
                </>
              ):(
                <p>Carregando...</p>
              )

            }


            <input
              type="password"
              className={`form-control input-${theme} mt-2`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
            />

            {showError && (
              <p className="text-danger mt-2" style={{ display: showError ? 'block' : 'none' }}>
                Senha incorreta, tente novamente.
              </p>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className={`btn btn-2-${theme}`} data-bs-dismiss="modal">
              Cancelar
            </button>
            <button type="button" className={`btn btn-1-${theme}`}
            onClick={()=>
              handleDelete()
            }>
              Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeleteUserModal;
