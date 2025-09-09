import React, { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { TaxRatesService } from '../../services/FinanceiroService';

function TaxRateModal({ show, onHide, theme, onTaxRateCreated }) {
  const { showError, showSuccess } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    rate: '',
    type: '',
    is_compound: false
  });
  const [loading, setLoading] = useState(false);

  const tiposImposto = [
    'ICMS',
    'IPI',
    'PIS',
    'COFINS',
    'ISS',
    'IRRF',
    'INSS',
    'CSLL',
    'Outros'
  ];

  useEffect(() => {
    if (show) {
      setFormData({
        name: '',
        rate: '',
        type: '',
        is_compound: false
      });
    }
  }, [show]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showError('Por favor, preencha o nome do imposto.');
      return;
    }

    if (!formData.rate || parseFloat(formData.rate) <= 0) {
      showError('Por favor, preencha uma taxa válida.');
      return;
    }

    if (!formData.type) {
      showError('Por favor, selecione o tipo do imposto.');
      return;
    }

    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const schema = user?.schema;

      const taxRateData = {
        name: formData.name.trim(),
        rate: parseFloat(formData.rate),
        type: formData.type,
        is_compound: formData.is_compound,
        schema: schema
      };

      const response = await TaxRatesService.createTaxRate(taxRateData);
      
      if (response.success) {
        showSuccess('Imposto criado com sucesso!');
        if (onTaxRateCreated) {
          onTaxRateCreated(response.data);
        }
        onHide();
      } else {
        showError('Erro ao criar imposto. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao criar imposto:', error);
      showError('Erro ao criar imposto. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onHide();
    }
  };

  if (!show) return null;

  return (
    <div 
      className="modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1070,
      }}
      onClick={handleBackdropClick}
    >
      <div 
        className="modal-dialog"
        style={{
          margin: 0,
          maxWidth: '500px',
          width: '98%',
          borderRadius: '16px',
          boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
          background: 'transparent',
          padding: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content" style={{ 
          backgroundColor: `var(--bg-color-${theme})`,
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
        }}>
          <div className="modal-header gap-3" style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px', paddingLeft: 0, paddingRight: 0, paddingTop: 0 }}>
            <i className={`bi bi-calculator header-text-${theme}`}></i>
            <h5 className={`modal-title header-text-${theme}`}>
              Novo Imposto
            </h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onHide}
              aria-label="Fechar"
            ></button>
          </div>
          <div className="modal-body" style={{ padding: 0 }}>
            <div className="mb-3">
              <label className={`form-label card-subtitle-${theme}`}>Nome do Imposto *</label>
              <input
                type="text"
                className={`form-control input-${theme}`}
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ex: ICMS 18%"
              />
            </div>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className={`form-label card-subtitle-${theme}`}>Taxa (%) *</label>
                <input
                  type="number"
                  step="0.01"
                  className={`form-control input-${theme}`}
                  value={formData.rate}
                  onChange={(e) => handleInputChange('rate', e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className={`form-label card-subtitle-${theme}`}>Tipo *</label>
                <select
                  className={`form-select input-${theme}`}
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                >
                  <option value="">Selecione o tipo</option>
                  {tiposImposto.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-3">
              <div className="form-check">
                <input
                  className={`form-check-input input-${theme}`}
                  type="checkbox"
                  id="isCompound"
                  checked={formData.is_compound}
                  onChange={(e) => handleInputChange('is_compound', e.target.checked)}
                />
                <label className={`form-check-label card-subtitle-${theme}`} htmlFor="isCompound">
                  É composto (incide sobre outro imposto)
                </label>
              </div>
            </div>
          </div>
          <div className="modal-footer" style={{ 
            borderTop: `1px solid var(--border-color-${theme})`,
            padding: '16px 0 0 0',
            marginTop: '24px'
          }}>
            <div className="d-flex justify-content-end gap-2 w-100">
              <button 
                type="button" 
                className={`btn btn-2-${theme}`} 
                onClick={onHide}
                style={{ minWidth: '120px' }}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className={`btn btn-1-${theme}`} 
                onClick={handleSave}
                disabled={loading || !formData.name.trim() || !formData.rate || !formData.type}
                style={{ minWidth: '120px' }}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Criando...
                  </>
                ) : (
                  'Criar Imposto'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaxRateModal;
