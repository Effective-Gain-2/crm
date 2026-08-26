import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import axios from 'axios';
import * as XLSX from 'xlsx';

const formatarData = (timestamp) => {
  if (!timestamp) return '—';
  return new Date(Number(timestamp)).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
  });
};

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

// Listas de contatos para disparo: sobe a planilha aqui e escolhe a lista no disparo,
// sem precisar passar pelo funil do Kanban. Subir a lista e agendar o disparo dela
// sao o mesmo fluxo: quem acabou de subir uma lista quer marcar data e hora agora,
// nao voltar ao inicio e torcer para escolher a lista certa no meio das outras.
function ListasModal({ theme, show, onHide, onListasMudaram, onAgendarDisparo }) {
  const [listas, setListas] = useState([]);
  const [nome, setNome] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState('');
  const [listaCriada, setListaCriada] = useState(null);
  // Visualizador: qual lista está aberta e os contatos já buscados (cache por id).
  const [listaAberta, setListaAberta] = useState(null);
  const [contatosPorLista, setContatosPorLista] = useState({});
  const [carregandoContatos, setCarregandoContatos] = useState(false);
  const fileInputRef = useRef(null);

  const url = process.env.REACT_APP_URL;

  const carregar = useCallback(async () => {
    try {
      const { data } = await axios.get(`${url}/listas`, { withCredentials: true });
      setListas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao buscar listas:', error);
      setErro('Não foi possível carregar as listas.');
    }
  }, [url]);

  useEffect(() => {
    if (show) {
      carregar();
      setErro('');
      setResultado('');
      setListaCriada(null);
    }
  }, [show, carregar]);

  // Lê o arquivo no navegador só para mostrar o que será enviado — quem grava é o servidor.
  const handleArquivo = (evento) => {
    setErro('');
    setResultado('');
    const arquivo = evento.target.files[0];
    if (!arquivo) return;
    setFile(arquivo);
    if (!nome) setNome(arquivo.name.replace(/\.[^.]+$/, ''));

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const linhas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        setPreview({ colunas: Object.keys(linhas[0] || {}), total: linhas.length });
      } catch (error) {
        setErro('Não foi possível ler o arquivo. Use .xlsx, .xls ou .csv.');
        setPreview(null);
      }
    };
    reader.readAsArrayBuffer(arquivo);
  };

  const enviar = async () => {
    if (!file) return setErro('Escolha um arquivo.');
    if (!nome.trim()) return setErro('Dê um nome para a lista.');

    setEnviando(true);
    setErro('');
    setResultado('');
    setListaCriada(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('nome', nome.trim());

      const { data } = await axios.post(`${url}/listas/upload`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResultado(data.message);
      setListaCriada({ id: data.id, nome: data.nome, total: data.importados });
      setFile(null);
      setNome('');
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await carregar();
      if (onListasMudaram) onListasMudaram();
    } catch (error) {
      console.error('Erro ao subir lista:', error);
      setErro(error.response?.data?.error || 'Erro ao subir a lista.');
    } finally {
      setEnviando(false);
    }
  };

  // Abre/fecha os contatos de uma lista; busca uma vez e guarda no cache.
  const alternarContatos = async (lista) => {
    if (listaAberta === lista.id) {
      setListaAberta(null);
      return;
    }
    setListaAberta(lista.id);
    if (contatosPorLista[lista.id]) return;

    setCarregandoContatos(true);
    try {
      const { data } = await axios.get(`${url}/listas/${lista.id}/contatos`, { withCredentials: true });
      setContatosPorLista((prev) => ({ ...prev, [lista.id]: Array.isArray(data.contatos) ? data.contatos : [] }));
    } catch (error) {
      console.error('Erro ao buscar contatos da lista:', error);
      setErro('Não foi possível carregar os contatos desta lista.');
      setListaAberta(null);
    } finally {
      setCarregandoContatos(false);
    }
  };

  const excluir = async (lista) => {
    if (!window.confirm(`Excluir a lista "${lista.nome}" com ${lista.total_contatos} contato(s)?`)) return;
    setErro('');
    try {
      await axios.delete(`${url}/listas/${lista.id}`, { withCredentials: true });
      await carregar();
      if (onListasMudaram) onListasMudaram();
    } catch (error) {
      console.error('Erro ao excluir lista:', error);
      setErro(error.response?.data?.error || 'Erro ao excluir a lista.');
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable>
      <Modal.Header closeButton className={`bg-form-${theme}`}>
        <Modal.Title className={`header-text-${theme}`}>Listas de contatos</Modal.Title>
      </Modal.Header>

      <Modal.Body className={`bg-form-${theme}`}>
        <h6 className={`header-text-${theme} mb-3`}>Subir nova lista</h6>

        <div className="row g-3 mb-3">
          <div className="col-md-5">
            <Form.Label className={`card-subtitle-${theme}`}>Nome da lista</Form.Label>
            <Form.Control
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Funcionários Nova Iguaçu"
              className={`input-${theme}`}
            />
          </div>
          <div className="col-md-7">
            <Form.Label className={`card-subtitle-${theme}`}>Arquivo</Form.Label>
            <Form.Control
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleArquivo}
              ref={fileInputRef}
              className={`input-${theme}`}
            />
            <Form.Text className={`card-subtitle-${theme}`}>
              Precisa ter uma coluna de nome e uma de telefone (aceita nome/numero, celular, telefone ou whatsapp).
              O telefone pode vir com máscara — o sistema limpa.
            </Form.Text>
          </div>
        </div>

        {preview && (
          <div className={`card-subtitle-${theme} small mb-3`}>
            Arquivo lido: {preview.total} linha(s) · colunas: {preview.colunas.join(', ') || '—'}
          </div>
        )}

        <Button onClick={enviar} className={`btn-1-${theme} mb-3`} disabled={enviando || !file}>
          {enviando ? 'Subindo…' : 'Subir lista'}
        </Button>

        {resultado && (
          <div className="alert alert-success" role="alert">
            <div>
              <i className="bi bi-check-circle me-2"></i>{resultado}
            </div>
            {listaCriada?.id && onAgendarDisparo && (
              <div className="mt-3 d-flex align-items-center gap-2 flex-wrap">
                <Button
                  className={`btn-1-${theme}`}
                  onClick={() => onAgendarDisparo(listaCriada.id)}
                >
                  <i className="bi bi-calendar-event me-2"></i>
                  Agendar disparo desta lista
                </Button>
                <span className="small">
                  Abre a configuração de data, hora, canal e mensagem já apontando para “{listaCriada.nome}”.
                </span>
              </div>
            )}
          </div>
        )}
        {erro && (
          <div className="alert alert-danger" role="alert">
            <i className="bi bi-exclamation-triangle me-2"></i>{erro}
          </div>
        )}

        <hr />

        <h6 className={`header-text-${theme} mb-3`}>Listas cadastradas ({listas.length})</h6>
        {listas.length === 0 ? (
          <div className={`card-subtitle-${theme}`}>Nenhuma lista ainda.</div>
        ) : (
          <div className={`table-responsive custom-table-${theme}`}>
            <table className="table table-bordered table-hover m-0">
              <thead>
                <tr>
                  <th className={`header-text-${theme}`}>Lista</th>
                  <th className={`header-text-${theme}`}>Contatos</th>
                  <th className={`header-text-${theme}`}>Criada em</th>
                  <th className={`header-text-${theme}`}></th>
                </tr>
              </thead>
              <tbody>
                {listas.map((lista) => (
                  <React.Fragment key={lista.id}>
                    <tr>
                      <td className={`card-subtitle-${theme}`}>{lista.nome}</td>
                      <td className={`card-subtitle-${theme}`}>{lista.total_contatos}</td>
                      <td className={`card-subtitle-${theme}`}>{formatarData(lista.criada_em)}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <button
                            className={`btn btn-2-${theme} btn-sm`}
                            onClick={() => alternarContatos(lista)}
                            title={listaAberta === lista.id ? 'Ocultar contatos' : 'Ver os contatos desta lista'}
                          >
                            <i className={`bi ${listaAberta === lista.id ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                          </button>
                          {onAgendarDisparo && (
                            <button
                              className={`btn btn-2-${theme} btn-sm`}
                              onClick={() => onAgendarDisparo(lista.id)}
                              title="Criar um disparo para esta lista"
                            >
                              <i className="bi bi-calendar-event"></i>
                            </button>
                          )}
                          <button className="btn delete-btn btn-sm" onClick={() => excluir(lista)} title="Excluir lista">
                            <i className="bi bi-trash-fill"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {listaAberta === lista.id && (
                      <tr>
                        <td colSpan={4} className="p-0">
                          {carregandoContatos && !contatosPorLista[lista.id] ? (
                            <div className={`card-subtitle-${theme} p-3`}>Carregando contatos…</div>
                          ) : (
                            <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                              <table className="table table-sm m-0">
                                <thead>
                                  <tr>
                                    <th className={`card-subtitle-${theme} ps-4`}>Nome</th>
                                    <th className={`card-subtitle-${theme}`}>Número</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(contatosPorLista[lista.id] || []).map((contato) => (
                                    <tr key={contato.number}>
                                      <td className={`card-subtitle-${theme} ps-4`}>{contato.contact_name || '—'}</td>
                                      <td className={`card-subtitle-${theme}`}>{formatarNumero(contato.number)}</td>
                                    </tr>
                                  ))}
                                  {(contatosPorLista[lista.id] || []).length === 0 && (
                                    <tr>
                                      <td colSpan={2} className={`card-subtitle-${theme} ps-4`}>
                                        Nenhum contato nesta lista.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
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

export default ListasModal;
