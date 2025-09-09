import React, { useState, useEffect } from 'react';
import InputMask from 'react-input-mask';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';

function NewContactModal({ theme, show, onHide }) {
  const [contactName, setContactName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [attendant, setAttendant] = useState('');
  const [connections, setConnections] = useState([]);
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData.schema
  const navigate = useNavigate();
  const url = process.env.REACT_APP_URL
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    email: '',
    queue_id: ''
  });

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const response = await axios.get(`${url}/connection/get-all-connections/${schema}`,
        {
      withCredentials: true
    });
        setConnections(response.data);
      } catch (error) {
        console.error('Erro ao buscar conexões:', error);
      }
    };

    fetchConnections();
  }, []); 

  
if (!userData || !userData.id) {
  navigate('/')  
  return;
}

  const handleSave = async () => {
    if (!contactName || !contactNumber || !attendant) {
      console.error('Preencha todos os campos obrigatórios.');
      return;
    }
  
    // Limpa o número removendo todos os caracteres não numéricos
    const numeroLimpo = contactNumber.replace(/\D/g, '');
  
    try {
      const newContact = await axios.post(`${url}/contact/create-contact`, {
        name: contactName,
        number: numeroLimpo,
        connection: attendant, 
        user_id: userData.id,
        schema: userData.schema,
      },
        {
      withCredentials: true
    });
  
  
      setContactName('');
      setContactNumber('');
      setAttendant('');
    } catch (error) {
      console.error('Erro ao criar contato:', error);
    }
  };

  const isDisabled = !contactName || !contactNumber || !attendant;

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      className={`modal-${theme}`}
    >
      <Modal.Header 
        closeButton 
        style={{ backgroundColor: `var(--bg-color-${theme})` }}
      >
        <div className="d-flex align-items-center gap-3">
          <i className={`bi bi-person-plus header-text-${theme}`}></i>
          <h5 className={`modal-title header-text-${theme} mb-0`}>
            Novo Contato
          </h5>
        </div>
      </Modal.Header>

      <Modal.Body style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        {/* Nome do Contato */}
        <div className="mb-3">
          <label
            htmlFor="contactName"
            className={`form-label card-subtitle-${theme}`}
          >
            Nome do Contato
          </label>
          <input
            type="text"
            className={`form-control input-${theme}`}
            id="contactName"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Digite o nome do contato"
          />
        </div>

        {/* Número do Contato */}
        <div className="mb-3">
          <label
            htmlFor="contactNumber"
            className={`form-label card-subtitle-${theme}`}
          >
            Contato
          </label>
          <InputMask
            mask="+55 (99) 9999-9999"
            className={`form-control input-${theme}`}
            id="contactNumber"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            placeholder="+55 (__) ____-____"
          />
        </div>

        {/* Conexão */}
        <div className="mb-3">
          <label
            htmlFor="attendant"
            className={`form-label card-subtitle-${theme}`}
          >
            Conexão
          </label>
          <select
            className={`form-select input-${theme}`}
            id="attendant"
            value={attendant}
            onChange={(e) => setAttendant(e.target.value)}
          >
            <option value="" disabled>
              Selecione uma conexão
            </option>
            {connections.map((connection) => (
              <option key={connection.id} value={connection.name}>
                {connection.name}
              </option>
            ))}
          </select>
        </div>
      </Modal.Body>

      <Modal.Footer style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <Button 
          variant="secondary" 
          onClick={onHide}
          className={`btn-2-${theme}`}
        >
          Cancelar
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSave}
          className={`btn-1-${theme}`}
          style={{ 
            backgroundColor: `transparent`, 
            borderColor: isDisabled ? 'var(--placeholder-color)' : 'var(--primary-color)', 
            color: isDisabled ? 'var(--placeholder-color)' : 'var(--primary-color)'
          }}
          disabled={isDisabled}
        >
          Entrar em Contato
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default NewContactModal;