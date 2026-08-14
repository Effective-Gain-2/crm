import React, { useState } from 'react';
import { Modal } from 'react-bootstrap';
import axios from 'axios';

// Troca da própria senha — exige a senha atual (o servidor valida).
function AlterarSenhaModal({ theme, show, onHide }) {
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirma, setConfirma] = useState('');
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);
  const [ver, setVer] = useState(false);

  const url = process.env.REACT_APP_URL;

  const tipo = ver ? 'text' : 'password';
  const olho = (
    <button
      type="button"
      className={`input-group-text igt-${theme}`}
      title={ver ? 'Ocultar senhas' : 'Mostrar senhas'}
      aria-label={ver ? 'Ocultar senhas' : 'Mostrar senhas'}
      onClick={() => setVer(v => !v)}
      style={{ cursor: 'pointer' }}
    >
      <i className={`bi ${ver ? 'bi-eye-slash' : 'bi-eye'}`}></i>
    </button>
  );

  const limpar = () => { setAtual(''); setNova(''); setConfirma(''); setErro(''); setOk(''); };
  const fechar = () => { limpar(); onHide(); };

  const salvar = async () => {
    setErro(''); setOk('');
    if (!atual || !nova) return setErro('Preencha a senha atual e a nova senha.');
    if (nova.length < 8) return setErro('A nova senha deve ter ao menos 8 caracteres.');
    if (nova !== confirma) return setErro('A confirmação não confere com a nova senha.');
    if (nova === atual) return setErro('A nova senha deve ser diferente da atual.');

    setLoading(true);
    try {
      await axios.post(`${url}/api/change-password`,
        { currentPassword: atual, newPassword: nova },
        { withCredentials: true });
      setOk('Senha alterada com sucesso.');
      setAtual(''); setNova(''); setConfirma('');
    } catch (e) {
      setErro(e.response?.data?.error || 'Não foi possível alterar a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={fechar} centered>
      <Modal.Header closeButton style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <h5 className={`modal-title header-text-${theme} mb-0`}>
          <i className="bi bi-shield-lock me-2"></i>Alterar minha senha
        </h5>
      </Modal.Header>

      <Modal.Body style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <div className="mb-3">
          <label htmlFor="senhaAtual" className={`form-label card-subtitle-${theme}`}>Senha atual</label>
          <div className="input-group">
            <input type={tipo} id="senhaAtual" className={`form-control input-${theme}`} value={atual}
              onChange={(e) => setAtual(e.target.value)} autoComplete="off" />
            {olho}
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor="senhaNova" className={`form-label card-subtitle-${theme}`}>Nova senha</label>
          <div className="input-group">
            <input type={tipo} id="senhaNova" className={`form-control input-${theme}`} value={nova}
              onChange={(e) => setNova(e.target.value)} autoComplete="off" placeholder="mínimo 8 caracteres" />
            {olho}
          </div>
        </div>

        <div className="mb-2">
          <label htmlFor="senhaConfirma" className={`form-label card-subtitle-${theme}`}>Confirmar nova senha</label>
          <div className="input-group">
            <input type={tipo} id="senhaConfirma" className={`form-control input-${theme}`} value={confirma}
              onChange={(e) => setConfirma(e.target.value)} autoComplete="off"
              onKeyDown={(e) => e.key === 'Enter' && salvar()} />
            {olho}
          </div>
        </div>

        {erro && <div className="alert alert-danger py-2 mb-0 mt-3"><i className="bi bi-exclamation-triangle me-2"></i>{erro}</div>}
        {ok && <div className="alert alert-success py-2 mb-0 mt-3"><i className="bi bi-check-circle me-2"></i>{ok}</div>}
      </Modal.Body>

      <Modal.Footer style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <button type="button" className={`btn btn-2-${theme}`} onClick={fechar}>Fechar</button>
        <button type="button" className={`btn btn-1-${theme}`} onClick={salvar} disabled={loading}>
          {loading ? 'Salvando…' : 'Alterar senha'}
        </button>
      </Modal.Footer>
    </Modal>
  );
}

export default AlterarSenhaModal;
