import React, { useState, useRef, useEffect } from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { Modal, Button, Form } from 'react-bootstrap';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { socket } from '../../socket';

function ImportarContatosModal({ theme, show, onHide, funil }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [resultado, setResultado] = useState(null);
  const [etapasFunil, setEtapasFunil] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  // Passo 2: a importação criou uma lista nomeada; daqui mesmo o usuário escolhe
  // qual disparo (modelo) essas pessoas recebem e marca data/hora.
  const [listaImportada, setListaImportada] = useState(null);
  const [nomeLista, setNomeLista] = useState('');
  const [modelos, setModelos] = useState([]);
  const [modeloSelecionado, setModeloSelecionado] = useState('');
  const [dataDisparo, setDataDisparo] = useState('');
  const [horaDisparo, setHoraDisparo] = useState('');
  const [agendando, setAgendando] = useState(false);
  const [erroAgenda, setErroAgenda] = useState(null); // { motivo, proximoLivre }
  const [disparoAgendado, setDisparoAgendado] = useState(null);
  const fileInputRef = useRef(null);
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL

  // Buscar etapas do funil quando o modal abrir
  useEffect(() => {
    if (show && funil) {
      const fetchEtapas = async () => {
        try {
          const response = await axios.get(`${url}/kanban/get-stages/${funil}/${schema}`, {
            withCredentials: true
          });
          const etapas = Array.isArray(response.data) ? response.data : [];
          setEtapasFunil(etapas.map(etapa => etapa.etapa || etapa.nome));
        } catch (error) {
          console.error('Erro ao buscar etapas do funil:', error);
          setEtapasFunil([]);
        }
      };
      fetchEtapas();
    }
  }, [show, funil, schema, url]);

  // Modelos de disparo disponíveis para o passo 2 (cadastrados na tela de Disparos).
  useEffect(() => {
    if (!show) return;
    const fetchModelos = async () => {
      try {
        const response = await axios.get(`${url}/campaing/get-campaing/${schema}`, { withCredentials: true });
        const todos = Array.isArray(response.data) ? response.data : [];
        setModelos(todos.filter((c) => c.is_modelo));
      } catch (error) {
        console.error('Erro ao buscar modelos de disparo:', error);
        setModelos([]);
      }
    };
    fetchModelos();
  }, [show, schema, url]);

  const descreverModelo = (modelo) => {
    if (!modelo) return '';
    const canais = Array.isArray(modelo.canais) && modelo.canais.length > 0 ? modelo.canais.join(', ') : 'sem canal';
    const min = Number(modelo.min) || 0;
    const max = Number(modelo.max) || 0;
    const intervalo = min > 0 || max > 0 ? `${min}s a ${max}s` : `${Number(modelo.timer) || 30}s`;
    return `Canal: ${canais} · Intervalo: ${intervalo}`;
  };

  const aplicarHorarioSugerido = (ms) => {
    const d = new Date(Number(ms));
    const pad = (n) => String(n).padStart(2, '0');
    setDataDisparo(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    setHoraDisparo(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    setErroAgenda(null);
  };

  const handleAgendarDisparo = async () => {
    if (!listaImportada?.id) return;
    if (!modeloSelecionado) return setErroAgenda({ motivo: 'Escolha o modelo de disparo.' });
    if (!dataDisparo || !horaDisparo) return setErroAgenda({ motivo: 'Informe a data e a hora do disparo.' });

    setAgendando(true);
    setErroAgenda(null);
    try {
      // Nome editado só é gravado na hora de agendar — uma escrita, não uma por tecla.
      if (nomeLista.trim() && nomeLista.trim() !== listaImportada.nome) {
        await axios.put(`${url}/listas/${listaImportada.id}`, { nome: nomeLista.trim() }, { withCredentials: true });
        setListaImportada((prev) => ({ ...prev, nome: nomeLista.trim() }));
      }

      const { data } = await axios.post(`${url}/campaing/executar-modelo`, {
        modelo_id: modeloSelecionado,
        lista_id: listaImportada.id,
        start_date: `${dataDisparo}T${horaDisparo}:00-03:00`,
        schema,
      }, { withCredentials: true });

      setDisparoAgendado(data);
    } catch (error) {
      console.error('Erro ao agendar disparo da importação:', error);
      const dados = error.response?.data;
      setErroAgenda({
        motivo: dados?.motivo || dados?.erro || 'Erro ao agendar o disparo.',
        proximoLivre: dados?.proximo_horario_livre || null,
      });
    } finally {
      setAgendando(false);
    }
  };

  const handleFileChange = (event) => {
    setErrorMsg('');
    const file = event.target.files[0];
    if (!file) return;

    setFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        if (jsonData.length > 0) {
          const headers = jsonData[0];
          setAvailableColumns(headers);
          setPreview(jsonData.slice(1));
        } else {
          setErrorMsg('O arquivo está vazio ou não possui dados.');
        }
      } catch (error) {
        console.error('Erro ao ler arquivo:', error);
        setErrorMsg('Erro ao ler o arquivo. Verifique se é um arquivo Excel ou CSV válido.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Função para verificar se uma etapa é válida
  const isEtapaValida = (etapa) => {
    if (!etapa || !etapasFunil.length) return true;
    return etapasFunil.some(etapaFunil => 
      etapaFunil.toString().toLowerCase() === etapa.toString().toLowerCase()
    );
  };

  // Função para obter o estilo da célula baseado na validação
  const getCellStyle = (rowIndex, colIndex, cellValue) => {
    const header = availableColumns[colIndex];
    if (header && header.toString().toLowerCase().includes('etapa')) {
      if (!isEtapaValida(cellValue)) {
        return { border: '2px solid #dc3545', backgroundColor: '#fff5f5' };
      }
    }
    return {};
  };

  const handleImport = async () => {
    if (!file) {
      setErrorMsg('Selecione um arquivo para importar.');
      return;
    }
    
    setErrorMsg('');
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sector', funil);
      formData.append('schema', schema);

      const res = await axios.post(`${url}/excel/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        // O resumo fica na tela: fechar em silêncio escondia importação que não
        // colocou ninguém no funil, e o usuário só descobria no disparo vazio.
        setResultado({
          mensagem: res.data.message,
          alerta: res.data.semEtapa > 0 || res.data.imported === 0,
        });

        // A importação também criou a lista deste lote — abre o passo 2.
        if (res.data.lista_id) {
          setListaImportada({ id: res.data.lista_id, nome: res.data.lista_nome, total: res.data.total_lista });
          setNomeLista(res.data.lista_nome || '');
        }

        setFile(null);
        setPreview([]);
        setAvailableColumns([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setErrorMsg('Erro ao importar contatos: ' + res.data.message);
      }
    } catch (error) {
      console.error('Erro na importação:', error);
      setErrorMsg('Erro ao importar contatos. Verifique o console para mais detalhes.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    // Limpar formulário ao fechar
    setFile(null);
    setPreview([]);
    setAvailableColumns([]);
    setErrorMsg('');
    setResultado(null);
    setListaImportada(null);
    setNomeLista('');
    setModeloSelecionado('');
    setDataDisparo('');
    setHoraDisparo('');
    setErroAgenda(null);
    setDisparoAgendado(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onHide();
  };

  const handleDownloadModelo = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['nome', 'numero', 'etapa'],
      ['Joao da Silva', '551188888888', 'Etapa do kanban']
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    XLSX.writeFile(wb, 'modelo_importacao.xlsx');
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton className={`bg-form-${theme}`}>
        <Modal.Title className={`header-text-${theme}`}>Importar Contatos</Modal.Title>
      </Modal.Header>
      <Modal.Body className={`bg-form-${theme}`}>
        <div className="d-flex justify-content-between gap-4">
          <div style={{ width: '60%' }}>
            <Form.Group>
              <Form.Label className={`header-text-${theme}`}>Arquivo</Form.Label>
              <Form.Control
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                ref={fileInputRef}
                className={`input-${theme} mb-1`}
              />
              <Form.Text className={`card-subtitle-${theme}`}>
                Suporta arquivos Excel (.xlsx, .xls) e CSV
              </Form.Text>
            </Form.Group>
          </div>
        </div>

        {resultado && (
          <div className={`alert ${resultado.alerta ? 'alert-warning' : 'alert-success'} mt-3`} role="alert">
            <i className={`bi ${resultado.alerta ? 'bi-exclamation-triangle' : 'bi-check-circle'} me-2`}></i>
            {resultado.mensagem}
          </div>
        )}

        {/* Passo 2: programar o disparo para o lote importado, sem sair da tela */}
        {listaImportada && !disparoAgendado && (
          <div className={`border rounded p-3 mt-2 bg-form-${theme}`}>
            <h6 className={`header-text-${theme} mb-3`}>
              <i className="bi bi-megaphone me-2"></i>
              Programar disparo para os {listaImportada.total} contato(s) importados
            </h6>

            <div className="row g-3">
              <div className="col-md-6">
                <Form.Label className={`card-subtitle-${theme}`}>Nome da lista</Form.Label>
                <Form.Control
                  type="text"
                  value={nomeLista}
                  onChange={(e) => setNomeLista(e.target.value)}
                  className={`input-${theme}`}
                />
                <Form.Text className={`card-subtitle-${theme}`}>
                  A lista fica salva com a data e pode ser reutilizada em outros disparos.
                </Form.Text>
              </div>
              <div className="col-md-6">
                <Form.Label className={`card-subtitle-${theme}`}>Modelo de disparo</Form.Label>
                <Form.Select
                  value={modeloSelecionado}
                  onChange={(e) => setModeloSelecionado(e.target.value)}
                  className={`input-${theme}`}
                >
                  <option value="">Selecione um modelo</option>
                  {modelos.map((m) => (
                    <option key={m.id} value={m.id}>{m.campaing_name}</option>
                  ))}
                </Form.Select>
                {modeloSelecionado && (
                  <Form.Text className={`card-subtitle-${theme}`}>
                    {descreverModelo(modelos.find((m) => m.id === modeloSelecionado))}
                  </Form.Text>
                )}
                {modelos.length === 0 && (
                  <Form.Text className={`card-subtitle-${theme}`}>
                    Nenhum modelo cadastrado. Crie um na tela de Disparos marcando
                    "Salvar como modelo" — depois ele aparece aqui.
                  </Form.Text>
                )}
              </div>
              <div className="col-md-6">
                <Form.Label className={`card-subtitle-${theme}`}>Data do disparo</Form.Label>
                <Form.Control
                  type="date"
                  value={dataDisparo}
                  onChange={(e) => { setDataDisparo(e.target.value); setErroAgenda(null); }}
                  className={`input-${theme}`}
                />
              </div>
              <div className="col-md-6">
                <Form.Label className={`card-subtitle-${theme}`}>Hora do disparo</Form.Label>
                <Form.Control
                  type="time"
                  value={horaDisparo}
                  onChange={(e) => { setHoraDisparo(e.target.value); setErroAgenda(null); }}
                  className={`input-${theme}`}
                />
              </div>
            </div>

            {erroAgenda && (
              <div className="alert alert-danger mt-3 mb-0" role="alert">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {erroAgenda.motivo}
                {erroAgenda.proximoLivre && (
                  <div className="mt-2">
                    <Button size="sm" className={`btn-1-${theme}`} onClick={() => aplicarHorarioSugerido(erroAgenda.proximoLivre)}>
                      Usar {new Date(Number(erroAgenda.proximoLivre)).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button className={`btn-2-${theme}`} onClick={handleClose}>Agora não</Button>
              <Button
                className={`btn-1-${theme}`}
                onClick={handleAgendarDisparo}
                disabled={agendando || modelos.length === 0}
              >
                {agendando ? 'Agendando…' : 'Agendar disparo'}
              </Button>
            </div>
          </div>
        )}

        {disparoAgendado && (
          <div className="alert alert-success mt-2" role="alert">
            <i className="bi bi-check-circle me-2"></i>
            Disparo <strong>{disparoAgendado.campaing_name}</strong> agendado!
            Acompanhe pelo card na tela de Disparos.
          </div>
        )}

        {errorMsg && (
          <div style={{ color: 'var(--error-color)', textAlign: 'center', marginBottom: 16 }}>
            {errorMsg}
          </div>
        )}

        {availableColumns.length > 0 && !errorMsg && (
          <div className="mt-4">
            <h6 className={`header-text-${theme} mb-3`}>Pré-visualização dos Dados</h6>
            {etapasFunil.length > 0 && (
              <div className="alert alert-warning mb-3" role="alert">
                <i className="bi bi-exclamation-triangle me-2"></i>
                <strong>Atenção:</strong> Células com etapas inválidas estão destacadas em vermelho. 
                A importação será feita, mas essas etapas podem não ser processadas corretamente.
              </div>
            )}
            <div className={`table-responsive custom-table-${theme}`} style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #eee', borderRadius: 6 }}>
              <table className="table table-bordered table-hover m-0">
                <thead>
                  <tr>
                    {availableColumns.map((header, idx) => (
                      <th
                        key={idx}
                        className={`header-text-${theme}`}
                        style={{ position: 'sticky', top: 0, zIndex: 2 }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {row.map((cell, cellIdx) => {
                        const header = availableColumns[cellIdx];
                        const isEtapa = header && header.toString().toLowerCase().includes('etapa');
                        const etapaInvalida = isEtapa && !isEtapaValida(cell);
                        return (
                          <td 
                            key={cellIdx} 
                            className={`card-subtitle-${theme}`}
                            style={getCellStyle(rowIdx, cellIdx, cell)}
                          >
                            {cell}
                            {etapaInvalida && (
                              <OverlayTrigger
                                placement="top"
                                overlay={
                                  <Tooltip id={`tooltip-etapa-invalida-${rowIdx}-${cellIdx}`}>
                                    Etapa não encontrada no funil
                                  </Tooltip>
                                }
                              >
                                <span style={{ marginLeft: 6, cursor: 'pointer' }}>
                                  <i className={`bi bi-exclamation-circle text-danger`} />
                                </span>
                              </OverlayTrigger>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer className={`bg-form-${theme} d-flex justify-content-between align-items-center`}>
        <Button onClick={handleDownloadModelo} className={`btn-2-${theme}`}>Baixar modelo</Button>
        <div>
          <Button onClick={handleClose} className={`btn-2-${theme} me-2`}>Cancelar</Button>
          <Button
            onClick={handleImport}
            className={`btn-1-${theme}`}
            disabled={!file || isImporting}
            style={(!file || isImporting) ? { backgroundColor: 'transparent' } : {}}
          >
            {isImporting ? 'Importando...' : 'Importar'}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}

export default ImportarContatosModal;
