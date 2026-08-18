import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as bootstrap from 'bootstrap';

function EditUserModal({ theme, user }) {
  const [userName, setUserName] = useState(user?.name || '');
  const [userEmail, setUserEmail] = useState(user?.email || '');
  const [userRole, setUserRole] = useState(user?.role || '');
  const [novaSenha, setNovaSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [feedback, setFeedback] = useState('');
  // Jornada de trabalho: e ela que decide quem recebe lead (nao "estar com o CRM aberto")
  const DIAS = [
    { n: 1, rotulo: 'Seg' }, { n: 2, rotulo: 'Ter' }, { n: 3, rotulo: 'Qua' },
    { n: 4, rotulo: 'Qui' }, { n: 5, rotulo: 'Sex' }, { n: 6, rotulo: 'Sáb' }, { n: 0, rotulo: 'Dom' },
  ];
  const [jornada, setJornada] = useState({});
  const [salvandoJornada, setSalvandoJornada] = useState(false);
  const [ausencia, setAusencia] = useState('4h');
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema

    const url = process.env.REACT_APP_URL;

  useEffect(() => {
    if (!user?.id) return;
    axios.get(`${url}/users/schedule/${schema}/${user.id}`, { withCredentials: true })
      .then((res) => {
        const mapa = {};
        (res.data?.schedule || []).forEach((f) => {
          mapa[f.dia_semana] = { ativo: true, inicio: f.hora_inicio, fim: f.hora_fim };
        });
        setJornada(mapa);
      })
      .catch(() => setJornada({}));
  }, [user?.id, schema, url]);

  const salvarJornada = async () => {
    setSalvandoJornada(true);
    try {
      const schedule = Object.entries(jornada)
        .filter(([, v]) => v.ativo && v.inicio && v.fim)
        .map(([dia, v]) => ({ dia_semana: Number(dia), hora_inicio: v.inicio, hora_fim: v.fim }));
      await axios.put(`${url}/users/schedule`, { user_id: user.id, schedule }, { withCredentials: true });
      setFeedback('Jornada salva.');
      setTimeout(() => setFeedback(''), 3000);
    } catch (e) {
      setFeedback('Erro ao salvar a jornada.');
    } finally {
      setSalvandoJornada(false);
    }
  };

  // Inativar por falta. Os leads em aberto do colaborador voltam para o rodizio na hora.
  const inativar = async () => {
    const horas = { '4h': 4, '1d': 24, '3d': 72, '7d': 168 }[ausencia];
    const ate = horas ? new Date(Date.now() + horas * 3600 * 1000).toISOString() : null;
    try {
      const { data } = await axios.post(`${url}/users/inativar`,
        { user_id: user.id, inativo: true, ate, motivo: 'falta', redistribuir: true },
        { withCredentials: true });
      const r = data?.redistribuicao;
      setFeedback(r ? `Colaborador inativado. ${r.movidos} de ${r.total} lead(s) redistribuído(s).` : 'Colaborador inativado.');
    } catch (e) {
      setFeedback('Erro ao inativar.');
    }
  };

  const reativar = async () => {
    try {
      await axios.post(`${url}/users/inativar`, { user_id: user.id, inativo: false, ate: null }, { withCredentials: true });
      setFeedback('Colaborador reativado.');
    } catch (e) {
      setFeedback('Erro ao reativar.');
    }
  };

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

            {/* Jornada de trabalho — é ela que decide para quem o lead vai.
                Dia desmarcado = não recebe lead nesse dia. Sem nenhum dia marcado =
                disponível sempre (comportamento de quem ainda não teve horário definido). */}
            <div className="mb-3">
              <label className={`form-label card-subtitle-${theme}`}>Jornada de trabalho</label>
              {DIAS.map((d) => {
                const cfg = jornada[d.n] || { ativo: false, inicio: '09:00', fim: '18:00' };
                return (
                  <div key={d.n} className="d-flex align-items-center gap-2 mb-1">
                    <div className="form-check" style={{ minWidth: 70 }}>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`dia-${d.n}`}
                        checked={!!cfg.ativo}
                        onChange={(e) => setJornada({ ...jornada, [d.n]: { ...cfg, ativo: e.target.checked } })}
                      />
                      <label className={`form-check-label card-subtitle-${theme}`} htmlFor={`dia-${d.n}`}>{d.rotulo}</label>
                    </div>
                    <input
                      type="time"
                      className={`form-control form-control-sm input-${theme}`}
                      value={cfg.inicio}
                      disabled={!cfg.ativo}
                      onChange={(e) => setJornada({ ...jornada, [d.n]: { ...cfg, inicio: e.target.value } })}
                    />
                    <span className={`card-subtitle-${theme}`}>às</span>
                    <input
                      type="time"
                      className={`form-control form-control-sm input-${theme}`}
                      value={cfg.fim}
                      disabled={!cfg.ativo}
                      onChange={(e) => setJornada({ ...jornada, [d.n]: { ...cfg, fim: e.target.value } })}
                    />
                  </div>
                );
              })}
              <button type="button" className={`btn btn-sm btn-2-${theme} mt-2`} onClick={salvarJornada} disabled={salvandoJornada}>
                {salvandoJornada ? 'Salvando...' : 'Salvar jornada'}
              </button>
              <small className={`d-block card-subtitle-${theme} mt-1`} style={{ fontSize: '0.75rem' }}>
                Sem nenhum dia marcado, o colaborador recebe lead a qualquer hora.
              </small>
            </div>

            {/* Ausência (falta): tira do rodízio e devolve os leads dele para a equipe */}
            <div className="mb-3">
              <label className={`form-label card-subtitle-${theme}`}>Ausência / falta</label>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <select
                  className={`form-select form-select-sm input-${theme}`}
                  style={{ maxWidth: 150 }}
                  value={ausencia}
                  onChange={(e) => setAusencia(e.target.value)}
                >
                  <option value="4h">Por 4 horas</option>
                  <option value="1d">Por 1 dia</option>
                  <option value="3d">Por 3 dias</option>
                  <option value="7d">Por 7 dias</option>
                  <option value="indeterminado">Indeterminado</option>
                </select>
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={inativar}>
                  Inativar
                </button>
                <button type="button" className={`btn btn-sm btn-2-${theme}`} onClick={reativar}>
                  Reativar
                </button>
              </div>
              <small className={`d-block card-subtitle-${theme} mt-1`} style={{ fontSize: '0.75rem' }}>
                Ao inativar, os leads em aberto dele voltam para o rodízio da equipe na hora.
              </small>
            </div>

            {/* Reset de senha (o master define uma senha temporária; o usuário troca depois em "Alterar minha senha") */}
            <div className="mb-3">
              <label htmlFor="novaSenha" className={`form-label card-subtitle-${theme}`}>Redefinir senha (opcional)</label>
              <div className="input-group">
                <input
                  type={verSenha ? 'text' : 'password'}
                  className={`form-control input-${theme}`}
                  id="novaSenha"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="deixe em branco para não alterar"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className={`input-group-text igt-${theme}`}
                  title={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setVerSenha(v => !v)}
                  style={{ cursor: 'pointer' }}
                >
                  <i className={`bi ${verSenha ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
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