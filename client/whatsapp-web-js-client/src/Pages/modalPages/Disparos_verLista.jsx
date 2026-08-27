import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import axios from 'axios';

// Só apresentação: o dado guardado continua sendo dígitos puros com 55.
const formatarNumero = (numero) => {
  const d = String(numero || '');
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) {
    const ddd = d.slice(2, 4);
    const resto = d.slice(4);
    return `+55 (${ddd}) ${resto.slice(0, resto.length - 4)}-${resto.slice(-4)}`;
  }
  return d || '—';
};

// O card do disparo dizia só o NOME da lista — quem ia conferir o alvo precisava
// achar a mesma lista no meio das outras, dentro do modal de Listas. Aqui o nome
// vira porta de entrada: um clique mostra exatamente quem vai receber.
function VerListaModal({ theme, show, onHide, lista }) {
  const [contatos, setContatos] = useState(null);
  const [erro, setErro] = useState('');
  const url = process.env.REACT_APP_URL;

  useEffect(() => {
    if (!show || !lista?.id) return;
    setContatos(null);
    setErro('');
    (async () => {
      try {
        const { data } = await axios.get(`${url}/listas/${lista.id}/contatos`, { withCredentials: true });
        setContatos(Array.isArray(data.contatos) ? data.contatos : []);
      } catch (error) {
        console.error('Erro ao buscar contatos da lista:', error);
        setErro('Não foi possível carregar os contatos desta lista.');
      }
    })();
  }, [show, lista?.id, url]);

  return (
    <Modal show={show} onHide={onHide} centered scrollable>
      <Modal.Header closeButton className={`bg-form-${theme}`}>
        <Modal.Title className={`header-text-${theme}`}>
          Lista “{lista?.nome || ''}”
          {Array.isArray(contatos) && (
            <span className={`card-subtitle-${theme} ms-2`} style={{ fontSize: '0.8rem' }}>
              {contatos.length} contato(s)
            </span>
          )}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className={`bg-form-${theme} p-0`}>
        {erro && <div className="alert alert-danger m-3" role="alert">{erro}</div>}
        {!erro && contatos === null && (
          <div className={`card-subtitle-${theme} p-3`}>Carregando contatos…</div>
        )}
        {!erro && Array.isArray(contatos) && (
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            <table className="table table-sm table-hover m-0">
              <thead>
                <tr>
                  <th className={`card-subtitle-${theme} ps-4`} style={{ position: 'sticky', top: 0, zIndex: 2 }}>Nome</th>
                  <th className={`card-subtitle-${theme}`} style={{ position: 'sticky', top: 0, zIndex: 2 }}>Número</th>
                </tr>
              </thead>
              <tbody>
                {contatos.map((contato) => (
                  <tr key={contato.number}>
                    <td className={`card-subtitle-${theme} ps-4`}>{contato.contact_name || '—'}</td>
                    <td className={`card-subtitle-${theme}`}>{formatarNumero(contato.number)}</td>
                  </tr>
                ))}
                {contatos.length === 0 && (
                  <tr>
                    <td colSpan={2} className={`card-subtitle-${theme} ps-4`}>Nenhum contato nesta lista.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className={`bg-form-${theme}`}>
        <Button onClick={onHide} className={`btn-1-${theme}`}>Fechar</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default VerListaModal;
