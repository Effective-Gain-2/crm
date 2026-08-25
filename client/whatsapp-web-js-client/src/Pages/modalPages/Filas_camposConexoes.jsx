import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Nome da instância vem como "<schema>__<nome>"; a tela de WhatsApp mostra só o sufixo.
export const nomeDaConexao = (conexao) => {
  const nome = conexao?.name || '';
  return nome.includes('__') ? nome.split('__').slice(1).join('__') : nome;
};

// Campo compartilhado pelos modais de criar e editar fila. Ficar num componente só
// evita o problema que o "Nova Fila" já teve: divergir do gêmeo com o tempo.
function CamposConexoes({ theme, value, onChange, disabled }) {
  const [conexoes, setConexoes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;

  useEffect(() => {
    const buscar = async () => {
      if (!schema) return;
      setCarregando(true);
      try {
        const r = await axios.get(`${url}/connection/get-all-connections/${schema}`, { withCredentials: true });
        setConexoes(Array.isArray(r.data) ? r.data : (r.data?.result || []));
      } catch (error) {
        console.error('Erro ao buscar conexões:', error);
        setConexoes([]);
      } finally {
        setCarregando(false);
      }
    };
    buscar();
  }, [schema, url]);

  const alternar = (id) => {
    const atual = value || [];
    onChange(atual.includes(id) ? atual.filter(x => x !== id) : [...atual, id]);
  };

  return (
    <div className="mb-3">
      <label className={`form-label card-subtitle-${theme}`}>
        Números que atendem esta fila
      </label>

      {carregando ? (
        <div className={`card-subtitle-${theme}`} style={{ fontSize: '0.85rem' }}>
          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          Carregando números...
        </div>
      ) : conexoes.length === 0 ? (
        <div className={`card-subtitle-${theme}`} style={{ fontSize: '0.85rem' }}>
          Nenhum número conectado nesta empresa. Conecte um em <strong>WhatsApp → Nova Conexão</strong>.
        </div>
      ) : (
        <div style={{ maxHeight: '25vh', overflowY: 'auto' }}>
          {conexoes.map((conexao) => {
            // Vinculada a OUTRA fila: marcar aqui move o número, então avisamos antes.
            const emOutraFila = conexao.queue_id && !(value || []).includes(conexao.id);
            return (
              <div className="form-check" key={conexao.id}>
                <input
                  className={`form-check-input input-${theme}`}
                  type="checkbox"
                  id={`conexao-${conexao.id}`}
                  checked={(value || []).includes(conexao.id)}
                  onChange={() => alternar(conexao.id)}
                  disabled={disabled}
                />
                <label className={`form-check-label header-text-${theme}`} htmlFor={`conexao-${conexao.id}`}>
                  {nomeDaConexao(conexao)}
                  <span className={`ms-2 card-subtitle-${theme}`} style={{ fontSize: '0.8rem' }}>
                    {conexao.number}
                  </span>
                  {emOutraFila && (
                    <span className="ms-2 text-warning" style={{ fontSize: '0.75rem' }}>
                      já atende outra fila
                    </span>
                  )}
                </label>
              </div>
            );
          })}
        </div>
      )}

      <div className="form-text">
        <span className={`card-subtitle-${theme}`}>
          As conversas que chegam por estes números entram nesta fila. Um número atende uma fila por vez.
        </span>
      </div>
    </div>
  );
}

export default CamposConexoes;
