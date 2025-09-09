import React, { useState, useEffect } from 'react';
import * as bootstrap from 'bootstrap';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';
import { ExpensesService } from '../../services/FinanceiroService';

function ReceitaModal({ show, onHide, theme, receita = null, onSave }) {
  const { showError, showSuccess } = useToast();
  const [formData, setFormData] = useState({
    nome: '',
    valor_receita: '',
    data: '',
    observacoes: '',
    status: 'pendente',
    itens: [],
    impostos: []
  });

  const [showItemModal, setShowItemModal] = useState(false);
  const [showImpostoModal, setShowImpostoModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Estados para edição de itens e impostos
  const [editingItem, setEditingItem] = useState(null);
  const [editingImposto, setEditingImposto] = useState(null);
  
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;




  





  useEffect(() => {
    if (receita) {

      
      // Determinar o valor total da receita
      let valorTotal = '';
      
      // Prioridade 1: valorTotal da API
      if (receita.valorTotal) {
        valorTotal = receita.valorTotal.toString();
      }
      // Prioridade 2: valor_receita base
      else if (receita.valor_receita) {
        valorTotal = receita.valor_receita.toString();
      }
      // Prioridade 3: calcular a partir dos itens
      else if (receita.itens && receita.itens.length > 0) {
        const totalItens = receita.itens.reduce((total, item) => {
          const valor = parseFloat(item.valor || item.unit_price || item.price || 0);
          const quantidade = parseInt(item.quantidade || item.quantity || item.qty || 1);
          return total + (valor * quantidade);
        }, 0);
        valorTotal = totalItens.toFixed(2);
      }
      
      const newFormData = {
        id: receita.id || null,
        nome: receita.descricao || receita.nome || '',
        valor_receita: valorTotal,
        data: receita.due_date || receita.created_at ? new Date(receita.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        observacoes: receita.observacoes || '',
        status: receita.status || 'pendente',
        itens: receita.itens || [],
        impostos: receita.impostos || []
      };
      

      setFormData(newFormData);
      setIsEditing(true);
    } else {
      const newFormData = {
        id: null,
        nome: '',
        valor_receita: '',
        data: new Date().toISOString().split('T')[0],
        observacoes: '',
        status: 'pendente',
        itens: [],
        impostos: []
      };
      
      // Garantir que a data seja sempre válida
      if (!newFormData.data || isNaN(new Date(newFormData.data).getTime())) {
        newFormData.data = new Date().toISOString().split('T')[0];
      }
      setFormData(newFormData);
      setIsEditing(false);
    }
  }, [receita]);



  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };







  const addItem = (item) => {
    if (editingItem) {
      // Editar item existente
      setFormData(prev => {
        const newItens = prev.itens.map(it => 
          it.id === editingItem.id ? { 
            ...item, 
            id: it.id,
            valor: parseFloat(item.valor) || 0,
            quantidade: parseInt(item.quantidade) || 1
          } : it
        );
        return {
          ...prev,
          itens: newItens
        };
      });
      setEditingItem(null);
    } else {
      // Adicionar novo item
      setFormData(prev => {
        const newItem = { 
          ...item, 
          id: Date.now(),
          valor: parseFloat(item.valor) || 0,
          quantidade: parseInt(item.quantidade) || 1
        };
        const newItens = [...(prev.itens || []), newItem];
        return {
          ...prev,
          itens: newItens
        };
      });
    }
  };

  const removeItem = (itemId) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.filter(item => item.id !== itemId)
    }));
  };

  const editItem = (item) => {
    setEditingItem(item);
    setShowItemModal(true);
  };

  const addImposto = (imposto) => {
    if (editingImposto) {
      // Editar imposto existente
      setFormData(prev => ({
        ...prev,
        impostos: prev.impostos.map(imp => 
          imp.id === editingImposto.id ? { 
            ...imposto, 
            id: imp.id, // Preservar ID original
            valorCalculado: parseFloat(imposto.valorCalculado) || parseFloat(imposto.valor) || 0,
            tax_name: imposto.tax_name,
            tax_rate_percentage: imposto.tax_rate_percentage,
            tax_amount: imposto.tax_amount,
            aplicacao: imposto.aplicacao,
            itemNome: imposto.itemNome,
            expense_item_id: imposto.expense_item_id,
            itemId: imposto.expense_item_id
          } : imp
        )
      }));
      setEditingImposto(null);
    } else {
      // Adicionar novo imposto - IMPORTANTE: usar o UUID do banco
      const novoImposto = {
        ...imposto,
        id: imposto.id, // Este deve ser o UUID do tax_rates do banco
        valorCalculado: parseFloat(imposto.valorCalculado) || parseFloat(imposto.valor) || 0,
        tax_name: imposto.tax_name,
        tax_rate_percentage: imposto.tax_rate_percentage,
        tax_amount: imposto.tax_amount,
        aplicacao: imposto.aplicacao,
        itemNome: imposto.itemNome,
        expense_item_id: imposto.expense_item_id,
        itemId: imposto.expense_item_id
      };
      
      // Verificar se o ID é um UUID válido
      if (!novoImposto.id || typeof novoImposto.id !== 'string' || novoImposto.id.length < 30) {
        console.error('ID de imposto inválido:', novoImposto.id);
        alert('Erro: ID de imposto inválido. Por favor, selecione um tipo de imposto válido.');
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        impostos: [...prev.impostos, novoImposto]
      }));
    }
  };

  const removeImposto = (impostoId) => {
    setFormData(prev => ({
      ...prev,
      impostos: prev.impostos.filter(imp => imp.id !== impostoId)
    }));
  };

  const editImposto = (imposto) => {
    setEditingImposto(imposto);
    setShowImpostoModal(true);
  };

  const calcularTotalItens = () => {
    return formData.itens.reduce((total, item) => {
      const valor = parseFloat(item.valor) || 0;
      const quantidade = parseInt(item.quantidade) || 1;
      return total + (valor * quantidade);
    }, 0);
  };

  const calcularTotalImpostos = () => {
    return formData.impostos.reduce((total, imposto) => {
      const valorImposto = parseFloat(imposto.tax_amount) || parseFloat(imposto.valorCalculado) || parseFloat(imposto.valor) || 0;
      return total + valorImposto;
    }, 0);
  };

  const handleSave = () => {
    // Validação básica
    if (!formData.nome || !formData.nome.trim()) {
      showError('Por favor, preencha o nome da receita.');
      return;
    }
    
    if (!formData.valor_receita || parseFloat(formData.valor_receita) <= 0) {
      showError('Por favor, preencha um valor válido para a receita.');
      return;
    }
    
    if (!formData.data || formData.data === null || formData.data === '' || formData.data === undefined) {
      showError('Por favor, selecione uma data para a receita.');
      return;
    }
    
    // Validar se a data é válida
    const dataSelecionada = new Date(formData.data);
    if (isNaN(dataSelecionada.getTime())) {
      showError('Por favor, selecione uma data válida para a receita.');
      return;
    }
    
    // Calcular valor total real
    let valorFinal = parseFloat(formData.valor_receita) || 0;
    
    // Adicionar impostos ao valor final
    const totalImpostos = calcularTotalImpostos();
    valorFinal += totalImpostos;
    
    // Preparar itens com impostos para o backend
    const itensComImpostos = formData.itens.map(item => {
      const impostosDoItem = formData.impostos.filter(
        imp => imp.aplicacao === 'item' && String(imp.expense_item_id || imp.itemId) === String(item.id)
      );
      
      // Verificar se todos os IDs dos impostos são UUIDs válidos
      const impostosValidos = impostosDoItem.filter(imp => 
        imp.id && typeof imp.id === 'string' && imp.id.length >= 30
      );
      
      if (impostosValidos.length !== impostosDoItem.length) {
        console.warn('Alguns impostos têm IDs inválidos e foram filtrados:', impostosDoItem);
      }
      
      return {
        descricao: item.descricao || item.item_name || item.name || '',
        quantidade: parseInt(item.quantidade || item.quantity || item.qty || 1),
        valor: parseFloat(item.valor || item.unit_price || item.price || 0),
        observacoes: item.observacoes || item.item_desc || item.notes || '',
        hasTax: impostosValidos.length > 0,
        tax: impostosValidos.map(imp => imp.id) // IDs dos impostos para o backend (apenas UUIDs válidos)
      };
    });

    const receitaCompleta = {
      id: formData.id,
      nome: formData.nome,
      valor_receita: valorFinal,
      data: formData.data,
      due_date: formData.data,
      observacoes: formData.observacoes,
      status: formData.status,
      itens: itensComImpostos,
      impostos: formData.impostos || [],
      schema: schema
    };


    onSave(receitaCompleta);
    onHide();
    setEditingItem(null);
    setEditingImposto(null);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onHide();
      setEditingItem(null);
    }
  };

  if (!show) return null;

  return (
    <>
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
          zIndex: 1050,
          overflowY: 'auto',
        }}
        onClick={handleBackdropClick}
      >
        <div 
          className="modal-dialog modal-lg"
          style={{
            margin: '1.75rem auto',
            maxWidth: '900px',
            width: '98%',
            borderRadius: '16px',
            boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
            background: 'transparent',
            padding: 0,
            overflow: 'visible',
            transition: 'all 0.3s ease',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content" style={{ 
            backgroundColor: `var(--bg-color-${theme})`,
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
            overflow: 'hidden',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
          }}>
                         <div className="modal-header gap-3" style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px', paddingLeft: 0, paddingRight: 0, paddingTop: 0, marginBottom: '16px' }}>
               <i className={`bi bi-cash-stack header-text-${theme}`}></i>
               <h5 className={`modal-title header-text-${theme}`}>
                 {isEditing ? 'Editar receita' : 'Nova receita'}
               </h5>
               <button 
                 type="button" 
                 className="btn-close" 
                 onClick={() => {
                   onHide();
                   setEditingItem(null);
                   setEditingImposto(null);
                 }}
                 aria-label="Fechar"
               ></button>
             </div>
            <div className="modal-body" style={{ overflowY: 'auto', padding: 0 }}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className={`form-label card-subtitle-${theme}`}>Nome da Receita *</label>
                  <input
                    type="text"
                    className={`form-control input-${theme}`}
                    value={formData.nome}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    placeholder="Nome da receita"
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className={`form-label card-subtitle-${theme}`}>Valor *</label>
                  <input
                    type="number"
                    step="0.01"
                    id="valor-base"
                    className={`form-control input-${theme}`}
                    value={formData.valor_receita}
                    onChange={(e) => handleInputChange('valor_receita', e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className={`form-label card-subtitle-${theme}`}>Data *</label>
                  <input
                    type="date"
                    className={`form-control input-${theme}`}
                    value={formData.data}
                    onChange={(e) => handleInputChange('data', e.target.value)}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className={`form-label card-subtitle-${theme}`}>Status</label>
                  <select
                    className={`form-select input-${theme}`}
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className={`form-label card-subtitle-${theme}`}>Observações</label>
                <textarea
                  className={`form-control input-${theme}`}
                  rows="3"
                  value={formData.observacoes}
                  onChange={(e) => handleInputChange('observacoes', e.target.value)}
                  placeholder="Observações adicionais..."
                />
              </div>



              {/* Seção de Itens */}
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className={`header-text-${theme} mb-0`}>
                    <i className="bi bi-box me-2"></i>
                    Itens da Receita
                  </h6>
                  <button
                    type="button"
                    className={`btn btn-sm btn-1-${theme}`}
                    onClick={() => setShowItemModal(true)}
                  >
                    <i className="bi bi-plus-circle me-1"></i>
                    {editingItem ? 'Atualizar' : 'Adicionar'} Item
                  </button>
                </div>
                {formData.itens && formData.itens.length > 0 && (
                  <div className="table-responsive">
                    <table className={`table custom-table-${theme} mb-0`}>
                      <thead>
                        <tr>
                          <th className={`header-text-${theme}`} style={{ width: '35%' }}>Item</th>
                          <th className={`header-text-${theme}`} style={{ width: '25%' }}>Observações</th>
                          <th className={`header-text-${theme}`} style={{ width: '12%' }}>Qtd.</th>
                          <th className={`header-text-${theme}`} style={{ width: '12%' }}>Valor</th>
                          <th className={`header-text-${theme}`} style={{ width: '16%' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.itens.map(item => (
                          <tr key={item.id}>
                            <td className={`header-text-${theme}`}>
                              {item.descricao || 'Item'}
                            </td>
                            <td className={`text-${theme === 'light' ? 'muted' : 'light'}`}>
                              {item.observacoes || '-'}
                            </td>
                            <td className={`text-${theme === 'light' ? 'muted' : 'light'} text-center`}>
                              {item.quantidade || 1}
                            </td>
                            <td className={`text-${theme === 'light' ? 'muted' : 'light'} text-end`}>
                              R$ {parseFloat(item.valor || 0).toFixed(2)}
                            </td>
                            <td>
                              <div className="d-flex gap-2">
                                <button
                                  type="button"
                                  className={`icon-btn btn-2-${theme}`}
                                  onClick={() => editItem(item)}
                                  title="Editar item"
                                >
                                  <i className="bi bi-pencil-fill"></i>
                                </button>
                                <button
                                  type="button"
                                  className="icon-btn text-danger"
                                  onClick={() => removeItem(item.id)}
                                  title="Remover item"
                                >
                                  <i className="bi bi-trash-fill"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Seção de Impostos */}
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className={`header-text-${theme} mb-0`}>
                    <i className="bi bi-calculator me-2"></i>
                    Impostos
                  </h6>
                  <button
                    type="button"
                    className={`btn btn-sm btn-1-${theme}`}
                    onClick={() => setShowImpostoModal(true)}
                  >
                    <i className="bi bi-plus-circle me-1"></i>
                    {editingImposto ? 'Atualizar' : 'Adicionar'} Imposto
                  </button>
                </div>
                {formData.impostos && formData.impostos.length > 0 && (
                  <div className="table-responsive">
                    <table className={`table custom-table-${theme} mb-0`}>
                      <thead>
                        <tr>
                          <th className={`header-text-${theme}`} style={{ width: '20%' }}>Tipo</th>
                          <th className={`header-text-${theme}`} style={{ width: '10%' }}>Alíquota</th>
                          <th className={`header-text-${theme}`} style={{ width: '25%' }}>Aplicação</th>
                          <th className={`header-text-${theme}`} style={{ width: '12%' }}>Valor</th>
                          <th className={`header-text-${theme}`} style={{ width: '25%' }}>Observações</th>
                          <th className={`header-text-${theme}`} style={{ width: '8%' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.impostos.map(imposto => (
                          <tr key={imposto.id}>
                            <td className={`header-text-${theme}`}>
                              {imposto.tax_name || imposto.name || imposto.type || imposto.tipo || 'Imposto'}
                            </td>
                            <td className={`text-${theme === 'light' ? 'muted' : 'light'} text-center`}>
                              {imposto.tax_rate_percentage || imposto.rate || imposto.aliquota ? 
                                parseFloat(imposto.tax_rate_percentage || imposto.rate || imposto.aliquota).toFixed(2) + '%' : 
                                'N/A'}
                            </td>
                            <td className={`text-${theme === 'light' ? 'muted' : 'light'}`}>
                              {imposto.aplicacao === 'total' ? 'Total da Receita' : 
                               imposto.itemNome ? `Item: ${imposto.itemNome}` : 
                               imposto.expense_item_id ? 'Item Específico' : 'Item Específico'}
                            </td>
                            <td className={`text-${theme === 'light' ? 'muted' : 'light'} text-end`}>
                              R$ {parseFloat(imposto.tax_amount || imposto.valor || imposto.valorCalculado || 0).toFixed(2)}
                            </td>
                            <td className={`text-${theme === 'light' ? 'muted' : 'light'}`}>
                              {imposto.observacoes || '-'}
                            </td>
                            <td>
                              <div className="d-flex gap-2">
                                <button
                                  type="button"
                                  className={`icon-btn btn-2-${theme}`}
                                  onClick={() => editImposto(imposto)}
                                  title="Editar imposto"
                                >
                                  <i className="bi bi-pencil-fill"></i>
                                </button>
                                <button
                                  type="button"
                                  className="icon-btn text-danger"
                                  onClick={() => removeImposto(imposto.id)}
                                  title="Remover imposto"
                                >
                                  <i className="bi bi-trash-fill"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Resumo Financeiro */}
              <div className={`card card-${theme} p-4`} style={{
                background: `linear-gradient(135deg, var(--bg-color-${theme}) 0%, var(--input-bg-color-${theme}) 100%)`,
                border: `1px solid var(--border-color-${theme})`,
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                marginBottom: '24px'
              }}>
                <h6 className={`header-text-${theme} mb-4`} style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                  <i className="bi bi-calculator me-2" style={{ color: 'var(--primary-color)' }}></i>
                  Resumo da Receita
                </h6>
                <div className="row g-3">
                  <div className="col-md-4">
                    <div className={`text-center p-3 rounded`} style={{ 
                      backgroundColor: `var(--input-bg-color-${theme})`,
                      border: `1px solid var(--border-color-${theme})`,
                      borderRadius: '12px',
                      transition: 'all 0.3s ease'
                    }}>
                      <div className={`text-${theme === 'light' ? 'muted' : 'light'} small mb-1`} style={{ fontWeight: '500' }}>
                        Valor Base
                      </div>
                      <div className={`header-text-${theme} h5 mb-0`} style={{ fontWeight: '600' }}>R$ {parseFloat(formData.valor_receita || 0).toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className={`text-center p-3 rounded`} style={{ 
                      backgroundColor: `var(--input-bg-color-${theme})`,
                      border: `1px solid var(--border-color-${theme})`,
                      borderRadius: '12px',
                      transition: 'all 0.3s ease'
                    }}>
                      <div className={`text-${theme === 'light' ? 'muted' : 'light'} small mb-1`} style={{ fontWeight: '500' }}>Total Impostos</div>
                      <div className={`header-text-${theme} h5 mb-0`} style={{ fontWeight: '600' }}>R$ {calcularTotalImpostos().toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className={`text-center p-3 rounded`} style={{ 
                      background: `linear-gradient(135deg, var(--primary-color) 0%, #0056b3 100%)`,
                      color: 'white',
                      borderRadius: '12px',
                      transition: 'all 0.3s ease'
                    }}>
                      <div className="small mb-1 opacity-90" style={{ fontWeight: '500' }}>Total Final</div>
                      <div className="h5 mb-0 fw-bold">
                        R$ {(parseFloat(formData.valor_receita || 0) + calcularTotalImpostos()).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
                         {/* Rodapé Corrigido */}
             <div className="modal-footer" style={{ 
               borderTop: `1px solid var(--border-color-${theme})`,
               padding: '16px 0 0 0'
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
                  style={{ minWidth: '120px' }}
                >
                  {isEditing ? 'Atualizar' : 'Salvar'} receita
                </button>
              </div>
            </div>
          </div>
        </div>


      </div>

      {/* Modal de Item */}
      <ItemModal
        show={showItemModal}
        onHide={() => {
          setShowItemModal(false);
          setEditingItem(null);
        }}
        onSave={addItem}
        theme={theme}
        editingItem={editingItem}
        setEditingItem={setEditingItem}
      />

      {/* Modal de Imposto */}
      <ImpostoModal
        show={showImpostoModal}
        onHide={() => {
          setShowImpostoModal(false);
          setEditingImposto(null);
        }}
        onSave={addImposto}
        theme={theme}
        itens={formData.itens}
        calcularTotalItens={calcularTotalItens}
        impostos={formData.impostos}
        editingImposto={editingImposto}
        setEditingImposto={setEditingImposto}
      />

    </>
  );
}



// Modal para adicionar imposto
function ImpostoModal({ show, onHide, onSave, theme, itens = [], calcularTotalItens, impostos = [], editingImposto = null, setEditingImposto }) {
  const [impostosDisponiveis, setImpostosDisponiveis] = useState([]);
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;

  const [formData, setFormData] = useState({
    tipo: '',
    aliquota: '',
    aplicacao: 'total', // 'total' ou 'item'
    itemId: '',
    observacoes: ''
  });

  const aliquotaSelecionada = React.useMemo(() => {
    if (!formData.tipo) return '';
    const imp = impostosDisponiveis.find(i => String(i.id) === String(formData.tipo));
    if (!imp || imp.rate === undefined || imp.rate === null) return '';
    const valor = Number(imp.rate);
    if (isNaN(valor)) return '';
    return valor.toFixed(2);
  }, [formData.tipo, impostosDisponiveis]);

  // Atualizar a alíquota automaticamente quando o tipo for selecionado
  useEffect(() => {
    if (formData.tipo && impostosDisponiveis.length > 0) {
      const imp = impostosDisponiveis.find(i => String(i.id) === String(formData.tipo));
      if (imp && imp.rate !== undefined && imp.rate !== null) {
        const valor = Number(imp.rate);
        if (!isNaN(valor)) {
          setFormData(prev => ({ ...prev, aliquota: valor.toFixed(2) }));
        }
      }
    }
  }, [formData.tipo, impostosDisponiveis]);

  useEffect(() => {
    const fetchImpostos = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_URL}/expenses/get-tax-rates/${schema}`, { withCredentials: true });
        if (response.data.success === true) {
          const result = response.data;
          setImpostosDisponiveis(Array.isArray(result.data) ? result.data : [result.data]);
        }
      } catch (error) {
        console.error('Erro ao buscar impostos:', error);
        setImpostosDisponiveis([]);
      }
    };

    if (show) {
      fetchImpostos();
    }
  }, [show, schema]);

  // Carregar dados para edição
  useEffect(() => {
    if (editingImposto) {
      setFormData({
        tipo: editingImposto.id || editingImposto.tipo || '',
        aliquota: editingImposto.tax_rate_percentage || editingImposto.aliquota || '',
        aplicacao: editingImposto.aplicacao || 'total',
        itemId: editingImposto.expense_item_id ? editingImposto.expense_item_id.toString() : '',
        observacoes: editingImposto.observacoes || ''
      });
    } else {
      setFormData({
        tipo: '',
        aliquota: '',
        aplicacao: 'total',
        itemId: '',
        observacoes: ''
      });
    }
  }, [editingImposto, show]);

  const handleSave = () => {
    // Validar se um tipo de imposto foi selecionado
    if (!formData.tipo) {
      alert('Por favor, selecione um tipo de imposto.');
      return;
    }

    // Validar se a alíquota foi preenchida
    if (!formData.aliquota || parseFloat(formData.aliquota) <= 0) {
      alert('Por favor, preencha uma alíquota válida.');
      return;
    }

    // Calcular o valor do imposto baseado na aplicação
    let valorCalculado = 0;
    const aliquotaDecimal = parseFloat(formData.aliquota) / 100;
    
    if (formData.aplicacao === 'total') {
      // Aplicar sobre o valor total da receita
      const totalItens = calcularTotalItens();
      valorCalculado = totalItens * aliquotaDecimal;
    } else if (formData.aplicacao === 'item' && formData.itemId) {
      // Aplicar sobre um item específico
      const itemSelecionado = itens.find(item => item.id === parseInt(formData.itemId));
      if (itemSelecionado) {
        const valorItem = parseFloat(itemSelecionado.valor) * (parseInt(itemSelecionado.quantidade) || 1);
        valorCalculado = valorItem * aliquotaDecimal;
      }
    }
    
    // Verificar se o tipo de imposto foi selecionado e é um UUID válido
    if (!formData.tipo || typeof formData.tipo !== 'string' || formData.tipo.length < 30) {
      alert('Por favor, selecione um tipo de imposto válido.');
      return;
    }

    const impostoCompleto = {
      ...formData,
      id: formData.tipo, // Este é o UUID do tax_rates do banco
      valor: valorCalculado.toFixed(2),
      valorCalculado: valorCalculado.toFixed(2),
      // Adicionar propriedades necessárias para exibição na tabela
      tax_name: impostosDisponiveis.find(imp => String(imp.id) === String(formData.tipo))?.name || 'Imposto',
      tax_rate_percentage: formData.aliquota,
      tax_amount: valorCalculado.toFixed(2),
      aplicacao: formData.aplicacao,
      itemNome: formData.aplicacao === 'item' && formData.itemId ? 
        itens.find(item => item.id === parseInt(formData.itemId))?.descricao || '' : '',
      expense_item_id: formData.aplicacao === 'item' ? formData.itemId : null
    };

    onSave(impostoCompleto);
    onHide();
    setEditingImposto(null);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onHide();
      setEditingImposto(null);
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
        zIndex: 1060,
        overflowY: 'auto',
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
          overflow: 'visible',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content" style={{ 
          backgroundColor: `var(--bg-color-${theme})`,
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
          overflow: 'hidden',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div className="modal-header gap-3" style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px', paddingLeft: 0, paddingRight: 0, paddingTop: 0 }}>
            <i className={`bi bi-calculator header-text-${theme}`}></i>
            <h5 className={`modal-title header-text-${theme}`}>
              {editingImposto ? 'Editar Imposto' : 'Adicionar Imposto'}
            </h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onHide}
              aria-label="Fechar"
            ></button>
          </div>
          <div className="modal-body" style={{ overflowY: 'auto', padding: 0 }}>
            <div className="mb-3">
              <label className={`form-label card-subtitle-${theme}`}>Tipo de Imposto</label>
              <select
                className={`form-select input-${theme}`}
                value={formData.tipo}
                onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
              >
                <option value="">Selecione o imposto</option>
                {impostosDisponiveis.map(imp => (
                  <option key={imp.id} value={imp.id}>
                    {imp.name || imp.tipo || imp.descricao}
                  </option>
                ))}
              </select>
            </div>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className={`form-label card-subtitle-${theme}`}>Alíquota (%)</label>
                <input
                  type="number"
                  step="0.01"
                  className={`form-control input-${theme}`}
                  value={formData.aliquota}
                  onChange={(e) => setFormData(prev => ({ ...prev, aliquota: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className={`form-label card-subtitle-${theme}`}>Aplicação</label>
                <select
                  className={`form-select input-${theme}`}
                  value={formData.aplicacao}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    aplicacao: e.target.value,
                    itemId: e.target.value === 'total' ? '' : prev.itemId
                  }))}
                >
                  <option value="total">Total da Receita</option>
                  <option value="item">Item Específico</option>
                </select>
              </div>
            </div>
            
            {formData.aplicacao === 'item' && (
              <div className="mb-3">
                <label className={`form-label card-subtitle-${theme}`}>Selecionar Item</label>
                <select
                  className={`form-select input-${theme}`}
                  value={formData.itemId}
                  onChange={(e) => setFormData(prev => ({ ...prev, itemId: e.target.value }))}
                >
                  <option value="">Selecione um item</option>
                  {itens.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.descricao} - R$ {parseFloat(item.valor).toFixed(2)} x {item.quantidade || 1}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="mb-3">
              <label className={`form-label card-subtitle-${theme}`}>Observações</label>
              <textarea
                className={`form-control input-${theme}`}
                rows="2"
                value={formData.observacoes}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Observações sobre o imposto..."
              />
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
                style={{ minWidth: '120px' }}
              >
                {editingImposto ? 'Atualizar' : 'Adicionar'} Imposto
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal para adicionar item
function ItemModal({ show, onHide, onSave, theme, editingItem = null, setEditingItem }) {
  const [formData, setFormData] = useState({
    descricao: '',
    quantidade: '1',
    valor: '',
    observacoes: ''
  });

  // Carregar dados para edição
  useEffect(() => {
    if (editingItem) {
      setFormData({
        descricao: editingItem.descricao || '',
        quantidade: editingItem.quantidade || '1',
        valor: editingItem.valor || '',
        observacoes: editingItem.observacoes || ''
      });
    } else {
      setFormData({
        descricao: '',
        quantidade: '1',
        valor: '',
        observacoes: ''
      });
    }
  }, [editingItem, show]);

  const handleSave = () => {
    // Mapear dados para o formato esperado pelo componente pai
    const itemData = {
      id: editingItem?.id, // Preservar ID se estiver editando
      descricao: formData.descricao,
      quantidade: formData.quantidade,
      valor: formData.valor,
      observacoes: formData.observacoes
    };
    
    onSave(itemData);
    onHide();
    setEditingItem(null);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onHide();
      setEditingItem(null);
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
        zIndex: 1060,
        overflowY: 'auto',
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
          overflow: 'visible',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content" style={{ 
          backgroundColor: `var(--bg-color-${theme})`,
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
          overflow: 'hidden',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div className="modal-header gap-3" style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px', paddingLeft: 0, paddingRight: 0, paddingTop: 0 }}>
                         <i className={`bi bi-box header-text-${theme}`}></i>
             <h5 className={`modal-title header-text-${theme}`}>
               {editingItem ? 'Editar Item' : 'Adicionar Item'}
             </h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onHide}
              aria-label="Fechar"
            ></button>
          </div>
          <div className="modal-body" style={{ overflowY: 'auto', padding: 0 }}>
            <div className="mb-3">
              <label className={`form-label card-subtitle-${theme}`}>Descrição do Item</label>
              <input
                type="text"
                className={`form-control input-${theme}`}
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descrição do item"
              />
            </div>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className={`form-label card-subtitle-${theme}`}>Quantidade</label>
                <input
                  type="number"
                  min="1"
                  className={`form-control input-${theme}`}
                  value={formData.quantidade}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantidade: e.target.value }))}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className={`form-label card-subtitle-${theme}`}>Valor Unitário</label>
                <input
                  type="number"
                  step="0.01"
                  className={`form-control input-${theme}`}
                  value={formData.valor}
                  onChange={(e) => setFormData(prev => ({ ...prev, valor: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="mb-3">
              <label className={`form-label card-subtitle-${theme}`}>Observações</label>
              <textarea
                className={`form-control input-${theme}`}
                rows="2"
                value={formData.observacoes}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Observações sobre o item..."
              />
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
                  style={{ minWidth: '120px' }}
                >
                  {editingItem ? 'Atualizar' : 'Adicionar'} Item
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReceitaModal; 