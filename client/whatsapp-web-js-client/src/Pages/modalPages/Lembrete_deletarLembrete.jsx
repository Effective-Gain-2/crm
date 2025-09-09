import axios from 'axios';
import React from 'react';

function LembreteDeletarLembrete({ theme, lembrete, onDelete }) {
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;

  const formatUnixToDatetimeLocal = (unix) => {
  if (!unix) return '';
  const date = new Date(Number(unix) * 1000); // transforma segundos em milissegundos
  const pad = n => n.toString().padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

  const handleDelete = async () => {
  try {
    await axios.delete(`${url}/lembretes/delete-lembrete`, {
      data: {
        id: lembrete.id,
        schema: schema,
      },
    },
        {
      withCredentials: true
    });
    onDelete(lembrete.id); 
  } catch (error) {
    console.error('Erro ao deletar lembrete:', error);
  }
};
  if (!lembrete) return null;

  return (
    <div className="modal fade" id="DeleteLembreteModal" tabIndex="-1" aria-labelledby="DeleteLembreteModalLabel" aria-hidden="true">
      <div className="modal-dialog modal-md">
        <div className="modal-content" style={{ backgroundColor: `var(--bg-color-${theme})` }}>
          <div className="modal-header gap-3">
            <i className={`bi bi-trash header-text-${theme}`}></i>
            <h5 className={`modal-title header-text-${theme}`} id="DeleteLembreteModalLabel">
              Confirmar exclusão do lembrete
            </h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>

          <div className="modal-body">
            <p className={`card-subtitle-${theme} mb-1`}>
              Tem certeza que deseja excluir este lembrete?
            </p>
            <p className="text-danger-true fw-bold mb-1">
              Título:
              <span className={`fw-bold header-text-${theme} ms-1`}>
                {lembrete.lembrete_name}
              </span>
            </p>
            <p className="text-danger-true fw-bold mb-1">
              Data:
              <span className={`fw-bold header-text-${theme} ms-1`}>
                {formatUnixToDatetimeLocal(lembrete.date)}
              </span>
            </p>
            <p className="text-danger-true fw-bold mb-1">
              Tipo:
              <span className={`fw-bold header-text-${theme} ms-1`}>
                {lembrete.tag.charAt(0).toUpperCase() + lembrete.tag.slice(1)}
              </span>
            </p>
            <p className={`card-subtitle-${theme}`}>
              Essa será uma ação irreversível.<br />
              Todos os dados relacionados a este lembrete serão permanentemente excluídos.
            </p>
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
              onClick={handleDelete}
              data-bs-dismiss="modal"
            >
              Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LembreteDeletarLembrete; 