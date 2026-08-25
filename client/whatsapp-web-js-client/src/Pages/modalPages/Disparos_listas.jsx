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

// Listas de contatos para disparo: sobe a planilha aqui e escolhe a lista no disparo,
// sem precisar passar pelo funil do Kanban.
function ListasModal({ theme, show, onHide, onListasMudaram }) {
  const [listas, setListas] = useState([]);
  const [nome, setNome] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState('');
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
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('nome', nome.trim());

      const { data } = await axios.post(`${url}/listas/upload`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResultado(data.message);
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
            <i className="bi bi-check-circle me-2"></i>{resultado}
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
                  <tr key={lista.id}>
                    <td className={`card-subtitle-${theme}`}>{lista.nome}</td>
                    <td className={`card-subtitle-${theme}`}>{lista.total_contatos}</td>
                    <td className={`card-subtitle-${theme}`}>{formatarData(lista.criada_em)}</td>
                    <td>
                      <button className="btn delete-btn btn-sm" onClick={() => excluir(lista)} title="Excluir lista">
                        <i className="bi bi-trash-fill"></i>
                      </button>
                    </td>
                  </tr>
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
