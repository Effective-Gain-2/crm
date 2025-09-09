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
  const [etapasFunil, setEtapasFunil] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
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
        
        setFile(null);
        setPreview([]);
        setAvailableColumns([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        onHide();
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
