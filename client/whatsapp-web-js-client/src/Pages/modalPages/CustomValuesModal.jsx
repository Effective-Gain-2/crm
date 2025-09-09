import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import axios from 'axios';
import * as bootstrap from 'bootstrap';

function CustomValuesModal({ show, onHide, theme}) {
  const [fields, setFields] = useState([]);
  const [newField, setNewField] = useState('');
  const [loading, setLoading] = useState(false);
  const [graph, setGraph] = useState(false);
  const url = process.env.REACT_APP_URL;
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;

  // Buscar campos personalizados ao abrir o modal
  useEffect(() => {
    if (show && schema) {
      setLoading(true);
      axios.get(`${url}/kanban/get-custom-fields/${schema}`, { withCredentials: true })
        .then(res => {
          setFields(Array.isArray(res.data) ? res.data : [res.data]);
        })
        .catch(() => setFields([]))
        .finally(() => setLoading(false));
    }
    if (!show) {
      setNewField('');
      setGraph(false);
    }
  }, [show, schema, url]);

  const handleAdd = async () => {
    if (!newField || !schema) return;
    setLoading(true);
    try {
      await axios.post(`${url}/contact/create-field`, {
        fieldName: newField,
        graph,
        schema
      }, { withCredentials: true });
      setNewField('');
      setGraph(false);
      const res = await axios.get(`${url}/kanban/get-custom-fields/${schema}`, { withCredentials: true });
      setFields(Array.isArray(res.data) ? res.data : [res.data]);
    } catch (err) {
    }
    setLoading(false);
  };

  useEffect(() => {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(el => new bootstrap.Tooltip(el));
    return () => tooltipList.forEach(tooltip => tooltip.dispose());
  }, [show]);

  return (
    <Modal show={show} onHide={onHide} centered dialogClassName="custom-values-modal" contentClassName={`custom-values-modal-content bg-form-${theme} border-${theme}`}> 
      <Modal.Header closeButton className={`header-text-${theme} border-${theme} bg-form-${theme}`}> 
        <Modal.Title className={`header-text-${theme}`}>Campos Personalizados</Modal.Title>
      </Modal.Header>
      <Modal.Body className={`bg-form-${theme}`} style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label className={`card-subtitle-${theme}`}>Nome do campo</Form.Label>
            <Form.Control
              as="input"
              className={`input-${theme}`}
              value={newField}
              onChange={e => setNewField(e.target.value)}
              placeholder="Digite o nome do campo personalizado"
              style={{ resize: 'none', backgroundColor: `var(--input-bg-color-${theme})`, color: `var(--color-${theme})`, borderColor: `var(--border-color-${theme})` }}
              disabled={loading}
              autoFocus
            />
          </Form.Group>
          <Form.Group className="mb-3 d-flex align-items-center gap-2">
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="graphSwitch"
                checked={graph}
                onChange={e => setGraph(e.target.checked)}
                disabled={loading}
                style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
              />
              <label className={`form-check-label card-subtitle-${theme}`} htmlFor="graphSwitch">
                Gráfico
              </label>
            </div>
            <span
              className="d-inline-block"
              tabIndex="0"
              data-bs-toggle="tooltip"
              data-bs-placement="right"
              title="Quando ativado, o valor deste campo será somado para exibição em um gráfico."
              style={{ cursor: 'pointer', color: `var(--primary-color)` }}
            >
              <i className="bi bi-info-circle"></i>
            </span>
          </Form.Group>
        </Form>
        {loading && <div className={`text-center card-subtitle-${theme}`}>Carregando...</div>}
        <ul className={`list-group mt-3 ${fields.length ? '' : 'd-none'}`}
            style={{ background: 'transparent', border: 'none' }}>
          {fields.map((item, idx) => (
            <li key={item.id || idx} className={`list-group-item d-flex justify-content-between align-items-center bg-form-${theme} border-${theme}`}
                style={{ color: `var(--color-${theme})`, backgroundColor: `var(--input-bg-color-${theme})`, borderColor: `var(--border-color-${theme})` }}>
              <span>{item.label || item.field_name}</span>
            </li>
          ))}
        </ul>
        {!fields.length && !loading && (
          <div className={`text-center card-subtitle-${theme} mt-2`}>Nenhum campo personalizado cadastrado.</div>
        )}
      </Modal.Body>
      <Modal.Footer className={`bg-form-${theme} border-${theme} d-flex justify-content-end gap-2`}>
        <Button className={`btn-2-${theme}`} onClick={onHide} disabled={loading}>
          Fechar
        </Button>
        <Button type="button" className={`btn-1-${theme}`} onClick={handleAdd} disabled={loading || !newField}>
          Adicionar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default CustomValuesModal;

// Adicionar CSS customizado para diminuir o width do modal
// Sugestão: .custom-values-modal .modal-dialog { max-width: 350px; } 