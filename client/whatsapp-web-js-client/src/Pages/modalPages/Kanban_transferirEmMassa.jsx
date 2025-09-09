import React, { useState } from 'react';
import { Modal } from 'react-bootstrap';
import axios from 'axios';

function TransferirEmMassaModal({ theme, show, onHide, etapaOrigem, etapas, funil, onTransferComplete }) {
  const [etapaDestino, setEtapaDestino] = useState('');
  const [loading, setLoading] = useState(false);
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;

  const handleTransferir = async () => {
    if (!etapaDestino || etapaDestino === etapaOrigem.id) {
      return;
    }

    setLoading(true);
    try {
      // Buscar todos os contatos da etapa de origem
      const response = await axios.get(`${url}/kanban/get-contacts-in-stage/${etapaOrigem.id}/${schema}`, {
        withCredentials: true
      });
      const contatos = Array.isArray(response.data) ? response.data : [response.data];
      const numbers = contatos.map(c => c.number);
      // Enviar para o backend para transferir todos os contatos
      await axios.put(`${url}/kanban/transfer-all-contacts`, {
        numbers,
        stage_id: etapaOrigem.id,
        new_stage: etapaDestino,
        sector: funil,
        schema: schema
      },
        {
          withCredentials: true
        });

      if (onTransferComplete) {
        onTransferComplete(etapaOrigem.id, etapaDestino);
      }
      
      onHide();
    } catch (error) {
      console.error('Erro ao transferir contatos:', error);
    } finally {
      setLoading(false);
    }
  };

  const etapasDisponiveis = etapas.filter(etapa => etapa.id !== etapaOrigem?.id);

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <Modal.Title className={`header-text-${theme}`}>
          <i className="bi bi-arrow-left-right me-2"></i>
          Transferir em Massa
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <div className="mb-3">
          <p className={`card-subtitle-${theme} mb-2`}>
            Transferir todos os cards da etapa: <strong className={`header-text-${theme}`}>{etapaOrigem?.etapa}</strong>
          </p>
        </div>

        <div className="mb-3">
          <label className={`form-label header-text-${theme}`}>
            Selecione a etapa de destino:
          </label>
          <select
            className={`form-select input-${theme}`}
            value={etapaDestino}
            onChange={(e) => setEtapaDestino(e.target.value)}
            disabled={loading}
          >
            <option value="">Selecione uma etapa...</option>
            {etapasDisponiveis.map(etapa => (
              <option key={etapa.id} value={etapa.id}>
                {etapa.etapa}
              </option>
            ))}
          </select>
        </div>

        {etapaDestino && (
          <div className="alert alert-warning">
            <i className="bi bi-exclamation-triangle me-2"></i>
            <strong>Atenção:</strong> Esta ação irá mover todos os cards da etapa "{etapaOrigem?.etapa}" para a etapa "{etapas.find(e => e.id === etapaDestino)?.etapa}".
          </div>
        )}
      </Modal.Body>
      
      <Modal.Footer style={{ backgroundColor: `var(--bg-color-${theme})` }}>
        <button
          className={`btn btn-2-${theme}`}
          onClick={onHide}
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          className={`btn btn-1-${theme}`}
          onClick={handleTransferir}
          disabled={!etapaDestino || loading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Transferindo...
            </>
          ) : (
            <>
              <i className="bi bi-arrow-left-right me-2"></i>
              Transferir
            </>
          )}
        </button>
      </Modal.Footer>
    </Modal>
  );
}

export default TransferirEmMassaModal; 