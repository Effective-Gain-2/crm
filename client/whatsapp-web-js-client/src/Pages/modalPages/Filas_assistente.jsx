import React, { useEffect, useState } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import axios from "axios";
// Exemplo de lista de assistentes (substitua pelo seu fetch real)


const FilasAssistenteModal = ({ show, onClose, onSave, fila, currentAssistantId }) => {
    const [selectedAssistant, setSelectedAssistant] = useState(currentAssistantId || "");
    const [assistants, setAssistants] = useState([]);

    const userData = JSON.parse(localStorage.getItem('user'));
    const schema = userData?.schema;
    const url = process.env.REACT_APP_URL;

    useEffect(()=>{
        const fetchAssistentes = async () => {
            const response = await axios.get(`${url}/bot/get-bots/${schema}`, {withCredentials: true});
            setAssistants(Array.isArray(response.data.data) ? response.data.data : [response.data.data]);
        }
        fetchAssistentes();
    }, [url, schema]);

  const handleSave = async () => {
    if (selectedAssistant) {
        await axios.put(`${url}/queue/update-queue-assistant`,{
            queue_id:fila.id,
            assistant_id:selectedAssistant,
            schema:schema   
        })
      onClose();
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Vincular Assistente à Fila: {fila.name}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <label className="form-label">Escolha o Assistente GPT:</label>
          <select
            className="form-select"
            value={fila.assistant_id || selectedAssistant}
            onChange={e => setSelectedAssistant(e.target.value)}
            defaultValue={fila.assistant_id || ''}
          >
            <option value="">Selecione...</option>
            {assistants.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" onClick={handleSave} disabled={!selectedAssistant}>Salvar</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default FilasAssistenteModal;