import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import axios from 'axios';

// Lembrete rápido vinculado a um cliente (usado no Kanban, Oportunidades e Chat).
// "Chamar o cliente numa próxima oportunidade" — pré-preenchido com o contato.
function LembreteRapido({ theme, show, onHide, contactNumber, contactName, chatId, opportunityId }) {
  const url = process.env.REACT_APP_URL;
  const userData = JSON.parse(localStorage.getItem('user') || '{}');

  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [quando, setQuando] = useState('');
  const [recorrencia, setRecorrencia] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (show) {
      setTitulo(contactName ? `Ligar para ${contactName}` : 'Ligar para o cliente');
      setMensagem('');
      setRecorrencia('');
      setError('');
      // Padrão: amanhã às 9h
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      const pad = (n) => String(n).padStart(2, '0');
      setQuando(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    }
  }, [show, contactName]);

  const handleSave = async () => {
    setError('');
    const ts = Math.floor(new Date(quando).getTime() / 1000);
    if (!titulo || !quando || isNaN(ts)) {
      setError('Informe título e data/hora válidos.');
      return;
    }
    if (ts * 1000 <= Date.now()) {
      setError('A data precisa ser futura.');
      return;
    }
    setSaving(true);
    try {
      await axios.post(`${url}/lembretes/create-lembrete`, {
        lembrete_name: titulo,
        tag: 'pessoal',
        message: mensagem || (contactName ? `Retomar contato com ${contactName}` : ''),
        date: ts,
        icone: 'bi-telephone-fill',
        user_id: userData.id,
        schema: userData.schema,
        contact_number: contactNumber || null,
        chat_id: chatId || null,
        opportunity_id: opportunityId || null,
        recurrence: recorrencia || null,
      }, { withCredentials: true });
      onHide(true);
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.error || 'Erro ao criar o lembrete.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={() => onHide(false)} centered style={{ zIndex: 1070 }}>
      <Modal.Header closeButton style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <div className="d-flex align-items-center gap-2">
          <i className={`bi bi-bell header-text-${theme}`}></i>
          <h5 className={`modal-title header-text-${theme} mb-0`}>Lembrete de retorno</h5>
        </div>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        {contactName && (
          <div className={`mb-3 small card-subtitle-${theme}`}>
            <i className="bi bi-person-circle me-1"></i>{contactName} {contactNumber ? `• ${contactNumber}` : ''}
          </div>
        )}
        <div className="mb-3">
          <label className={`form-label card-subtitle-${theme}`}>Título</label>
          <input className={`form-control input-${theme}`} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className={`form-label card-subtitle-${theme}`}>Observação (opcional)</label>
          <textarea className={`form-control input-${theme}`} rows={2} value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
        </div>
        <div className="row g-2">
          <div className="col-7">
            <label className={`form-label card-subtitle-${theme}`}>Quando</label>
            <input type="datetime-local" className={`form-control input-${theme}`} value={quando} onChange={(e) => setQuando(e.target.value)} />
          </div>
          <div className="col-5">
            <label className={`form-label card-subtitle-${theme}`}>Repetir</label>
            <select className={`form-select input-${theme}`} value={recorrencia} onChange={(e) => setRecorrencia(e.target.value)}>
              <option value="">Não repetir</option>
              <option value="daily">Diariamente</option>
              <option value="weekly">Semanalmente</option>
              <option value="monthly">Mensalmente</option>
            </select>
          </div>
        </div>
        {error && <div className="text-danger small mt-2">{error}</div>}
      </Modal.Body>
      <Modal.Footer style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <button className={`btn btn-2-${theme}`} onClick={() => onHide(false)}>Cancelar</button>
        <button className={`btn btn-1-${theme}`} onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando…' : 'Criar lembrete'}
        </button>
      </Modal.Footer>
    </Modal>
  );
}

export default LembreteRapido;
