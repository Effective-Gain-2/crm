import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';

function KanbanDeletarFunilModal({ show, onHide, funil, theme }) {
  const { showError: showToastError } = useToast();
  const [password, setPassword] = useState('');
  const [showError, setShowError] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;
  
  const canAccess = ['admin', 'tecnico', 'master'].includes(userData?.role);

  useEffect(() => {
    if (show) {
      setCountdown(5);
      setCanDelete(false);
      setPassword('');
      setShowError(false);
      
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setCanDelete(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [show]);

  const handleDelete = async () => {
    if (!canDelete) return;

    // Senha da conta é SEMPRE exigida (o servidor valida papel via token)
    if (!password) {
      setShowError(true);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.delete(`${url}/kanban/delete-funil/${funil}/${schema}`, {
        data: {
          password
        },
        headers: {
          'user-data': JSON.stringify({
            id: userData.id
          })
        }
      },
        {
      withCredentials: true
    });
      
      if (response.data.success) {
        window.location.reload();
      } else {
        showToastError(response.data.message || 'Erro ao deletar funil');
      }
    } catch (error) {
      console.error('Erro ao deletar funil:', error);
      if (error.response?.data?.message) {
        showToastError(error.response.data.message);
      } else {
        showToastError('Erro ao deletar funil. Tente novamente.');
      }
    } finally {
      setLoading(false);
      onHide();
    }
  };

  if (!show || !canAccess) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-md modal-dialog-centered">
        <div className="modal-content" style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <div className="modal-header gap-3">
            <i className={`bi bi-trash header-text-${theme}`}></i>
            <h5 className={`modal-title header-text-${theme}`}>
              Confirmar exclusão do funil
            </h5>
            <button type="button" className="btn-close" onClick={onHide}></button>
          </div>

          <div className="modal-body">
            <div className="mb-3">
              <p className={`card-subtitle-${theme} mb-2`}>
                Tem certeza que deseja excluir este funil?
              </p>
              
              <p className="text-danger-true fw-bold mb-2">
                Funil: 
                <span className={`fw-bold header-text-${theme} ms-1`}>
                  {funil ? funil.charAt(0).toUpperCase() + funil.slice(1) : ''}
                </span>
              </p>
              
              <div className="alert alert-danger" role="alert">
                <i className="bi bi-exclamation-triangle me-2"></i>
                <strong>Atenção!</strong> Esta ação é <strong>irreversível</strong> e resultará na perda de todos os dados:
                <ul className="mb-0 mt-2">
                  <li>Todas as etapas do funil</li>
                  <li>Configurações personalizadas</li>
                </ul>
              </div>
            </div>

            {canAccess && (
              <div className="mb-3">
                <label className={`form-label card-subtitle-${theme}`}>
                  Para confirmar a exclusão, digite sua senha:
                </label>
                <input
                  type="password"
                  className={`form-control input-${theme}`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setShowError(false);
                  }}
                  placeholder="Digite sua senha"
                  disabled={!canDelete}
                />
                {showError && (
                  <p className="text-danger mt-2 mb-0">
                    Senha é obrigatória para administradores.
                  </p>
                )}
              </div>
            )}

            {!canDelete && (
              <div className="alert alert-warning" role="alert">
                <i className="bi bi-clock me-2"></i>
                Por favor, leia todas as informações acima. O botão de exclusão será habilitado em <strong>{countdown} segundos</strong>.
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className={`btn btn-2-${theme}`}
              onClick={onHide}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn delete-btn"
              onClick={handleDelete}
              disabled={!canDelete || loading || (canAccess && !password)}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Excluindo...
                </>
              ) : (
                <>
                  <i className="bi bi-trash me-2"></i>
                  Excluir Funil
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default KanbanDeletarFunilModal; 