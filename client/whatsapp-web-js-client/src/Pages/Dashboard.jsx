import { useEffect, useState } from 'react';
import * as bootstrap from 'bootstrap';
import axios from 'axios';


function Dashboard({ theme }) {
  const url = process.env.REACT_APP_URL;
  const userData = JSON.parse(localStorage.getItem('user'));
  const [user, setUser] = useState()

  const schema = userData.schema
  useEffect(() => {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(
      (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
    );
    return () => tooltipList.forEach((tooltip) => tooltip.dispose());
  }, []);

   useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const response = await axios.get(`${url}/api/users/${schema}`);

        setUser(response.data.users || []);
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
      }
    };

    fetchUsuarios();
  }, []);

  return (
    <div className="container-fluid h-100 pt-3">

      <h2 className={`mb-3 ms-3 header-text-${theme}`} style={{ fontWeight: 400 }}>Dashboard</h2>

      <div className="row h-100">
        {/* Coluna 1 */}
        <div className="col-4 d-flex flex-column gap-3">
          <div className={`card card-${theme} p-2 d-flex flex-row align-items-center justify-content-evenly`}>
            <i className="bi bi-hourglass card-icon" style={{ fontSize: '2.5rem' }}></i>
            <div className="d-flex flex-column align-items-start justify-content-start">
              <h6 className={`card-subtitle-${theme} m-0`}>Fila de Atendimento</h6>
              <h2 id="contatos-aguardando" className={`header-text-${theme}`}>2</h2>
            </div>
            <div>
              <i
                className={`bi bi-question-circle question-${theme}`}
                data-bs-toggle="tooltip"
                data-bs-placement="bottom"
                title="Leads que optaram por receber atendimento humano e aguardam na fila."
              ></i>
            </div>
          </div>

          <div className={`card card-${theme} p-2 d-flex flex-row align-items-center justify-content-evenly`}>
            <i className="bi bi-person-check card-icon" style={{ fontSize: '2.5rem' }}></i>
            <div className="d-flex flex-column align-items-start justify-content-start">
              <h6 className={`card-subtitle-${theme} m-0`}>Atendentes online</h6>
              <h2 id="atendentes-online" className={`header-text-${theme}`}>
              {user && Array.isArray(user)
                ? user.filter(u => u.online && u.permission === 'user').length
                : 0}
            </h2>
            </div>
            <div>
              <i
                className={`bi bi-question-circle question-${theme}`}
                data-bs-toggle="tooltip"
                data-bs-placement="bottom"
                title="Total de atendentes humanos atendendo no momento."
              ></i>
            </div>
          </div>

          <div className={`card p-3 card-${theme}`}>
            <h6 className={`card-subtitle-${theme}`}>Atendentes</h6>
            <ul id="lista-atendentes" className="list-unstyled mb-0 d-flex flex-column lista-tabela">
              <li className={`d-flex justify-content-between table-header-${theme} px-2 py-1`}>
                <span>Nome</span>
                <span>Setor</span>
                <span>Status</span>
              </li>
              {user && user
              .filter(u => u.permission === 'user')
              .map((u) => (
                <li key={u.id} className={`d-flex justify-content-between px-2 py-1 header-text-${theme}`}>
                  <span>{u.nome || u.username || u.name}</span>
                  <span>{u.setor || u.sector || '-'}</span>
                  <span>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: u.online ? '#28a745' : '#dc3545'
                      }}
                    ></span>
                  </span>
                </li>
            ))}
            </ul>
          </div>
        </div>

        {/* Coluna 2 */}
        <div className="col-4 d-flex flex-column gap-3">
          <div className={`card card-${theme} p-2 d-flex flex-row align-items-center justify-content-evenly`}>
            <i className="bi bi-cpu card-icon" style={{ fontSize: '2.5rem' }}></i>
            <div className="d-flex flex-column align-items-start justify-content-start">
              <h6 className={`card-subtitle-${theme} m-0`}>Contatos com IA</h6>
              <h2 id="contatos-ia" className={`header-text-${theme}`}>0</h2>
            </div>
            <div>
              <i
                className={`bi bi-question-circle question-${theme}`}
                data-bs-toggle="tooltip"
                data-bs-placement="bottom"
                title="Conversas em andamento mediadas exclusivamente pela IA."
              ></i>
            </div>
          </div>

          <div className={`card card-${theme} p-2 d-flex flex-row align-items-center justify-content-evenly`}>
            <i className="bi bi-check2-all card-icon" style={{ fontSize: '2.5rem' }}></i>
            <div className="d-flex flex-column align-items-start justify-content-start">
              <h6 className={`card-subtitle-${theme} m-0`}>Conversas finalizadas</h6>
              <h2 id="esperando-atendente" className={`header-text-${theme}`}>0</h2>
            </div>
            <div>
              <i
                className={`bi bi-question-circle question-${theme}`}
                data-bs-toggle="tooltip"
                data-bs-placement="bottom"
                title="Contatos que terminaram com a IA e aguardam um atendente humano."
              ></i>
            </div>
          </div>

          <div className={`card p-3 card-${theme}`}>
            <h6 className={`card-subtitle-${theme}`}>Ranking - Conversas Encerradas</h6>
            <div className="btn-group px-5 py-2" role="group">
              <input
                type="radio"
                className="btn-check"
                name="ranking-conversas"
                id="btnradio1"
                autoComplete="off"
                defaultChecked
              />
              <label className={`btn btn-primary btn-label-${theme}`} htmlFor="btnradio1">
                Diário
              </label>
              <input type="radio" className="btn-check" name="ranking-conversas" id="btnradio2" autoComplete="off" />
              <label className={`btn btn-primary btn-label-${theme}`} htmlFor="btnradio2">
                Semanal
              </label>
              <input type="radio" className="btn-check" name="ranking-conversas" id="btnradio3" autoComplete="off" />
              <label className={`btn btn-primary btn-label-${theme}`} htmlFor="btnradio3">
                Mensal
              </label>
            </div>
            <ul id="ranking-conversas" className="mb-0 d-flex flex-column lista-tabela ps-0">
              <li className={`d-flex justify-content-between table-header-${theme} px-2 py-1`}>
                <span style={{ width: '20%' }}></span>
                <span style={{ width: '50%' }}>Nome</span>
                <span style={{ width: '30%', textAlign: 'right' }}>Total</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Coluna 3 */}
        <div className="col-4 d-flex flex-column gap-3">
          <div className={`card card-${theme} p-2 d-flex flex-row align-items-center justify-content-evenly`}>
            <i className="bi bi-stopwatch card-icon" style={{ fontSize: '2.5rem' }}></i>
            <div className="d-flex flex-column align-items-start justify-content-start">
              <h6 className={`card-subtitle-${theme} m-0`}>Tempo médio de resposta</h6>
              <h2 id="tempo-resposta" className={`header-text-${theme}`}>--</h2>
            </div>
            <div>
              <i
                className={`bi bi-question-circle question-${theme}`}
                data-bs-toggle="tooltip"
                data-bs-placement="bottom"
                title="Tempo médio que o atendente leva para responder após o contato ir para a fila de atendimento."
              ></i>
            </div>
          </div>

          <div className={`card card-${theme} p-2 d-flex flex-row align-items-center justify-content-evenly`}>
            <i className="bi bi-hourglass-split card-icon" style={{ fontSize: '2.5rem' }}></i>
            <div className="d-flex flex-column align-items-start justify-content-start">
              <h6 className={`card-subtitle-${theme} m-0`}>Tempo médio de resolução</h6>
              <h2 id="tempo-resolucao" className={`header-text-${theme}`}>--</h2>
            </div>
            <div>
              <i
                className={`bi bi-question-circle question-${theme}`}
                data-bs-toggle="tooltip"
                data-bs-placement="bottom"
                title="Tempo médio desde o início da intervenção do atendente até o encerramento."
              ></i>
            </div>
          </div>

          <div className={`card p-3 card-${theme}`}>
            <h6 className={`card-subtitle-${theme}`}>Ranking - Tempo de Resposta</h6>
            <div className="btn-group px-5 py-2" role="group">
              <input
                type="radio"
                className="btn-check"
                name="ranking-tempo"
                id="btnradio4"
                autoComplete="off"
                defaultChecked
              />
              <label className={`btn btn-primary btn-label-${theme}`} htmlFor="btnradio4">
                Diário
              </label>
              <input type="radio" className="btn-check" name="ranking-tempo" id="btnradio5" autoComplete="off" />
              <label className={`btn btn-primary btn-label-${theme}`} htmlFor="btnradio5">
                Semanal
              </label>
              <input type="radio" className="btn-check" name="ranking-tempo" id="btnradio6" autoComplete="off" />
              <label className={`btn btn-primary btn-label-${theme}`} htmlFor="btnradio6">
                Mensal
              </label>
            </div>
            <ul id="ranking-tempo" className="mb-0 d-flex flex-column lista-tabela ps-0"></ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;