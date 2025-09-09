import React, { useState, useEffect } from 'react';
import * as bootstrap from 'bootstrap';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';
import { ExpensesService } from '../../services/FinanceiroService';

function DespesaModal({ show, onHide, theme, despesa = null, onSave, categorias = [], onCategoryCreated, onVendorCreated }) {
  const { showError } = useToast();
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    categoria: '',
    data: '',
    fornecedor: '',
    observacoes: '',
    status: 'pendente',
    documentos: [],
    impostos: [],
    itens: []
  });

  const [showImpostoModal, setShowImpostoModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Estados para edição de itens e impostos
  const [editingItem, setEditingItem] = useState(null);
  const [editingImposto, setEditingImposto] = useState(null);
  
  // Estados para o painel de visualização de documentos
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [documentUrl, setDocumentUrl] = useState('');

  // Estados para criação de novos fornecedores e categorias
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [showNewVendorModal, setShowNewVendorModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newVendorName, setNewVendorName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [creatingVendor, setCreatingVendor] = useState(false);
  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState(categorias);
  const [fornecedores, setFornecedores] = useState([]);
  const [imposto, setImpostos] = useState([])
  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;


  

  useEffect(()=>{
    const fetchCategories = async()=>{
      const response = await axios.get(`${process.env.REACT_APP_URL}/category/get-categories/${JSON.parse(localStorage.getItem('user')).schema}`, { withCredentials: true });
      if (response.data.success === true) {
        const result = response.data;
        setCategoriasDisponiveis(Array.isArray(result.data) ? result.data : [result.data]);
      } else {
        console.error('Erro ao buscar categorias:', response.data.message);
      }
    }

    fetchCategories();
  }, []);

  useEffect(()=>{
    const fetchVendors = async()=>{
      const response = await axios.get(`${process.env.REACT_APP_URL}/vendor/get-vendors/${schema}`, { withCredentials: true });
      if (response.data.success === true) {
        const result = response.data;
        setFornecedores(Array.isArray(result.data) ? result.data : [result.data]);
      } else {
        console.error('Erro ao buscar fornecedores:', response.data.message);
      }
    }
    

    fetchVendors();
  }, []);
;

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
    if (despesa) {

      
      // Determinar o valor total da despesa
      let valorTotal = '';
      
      // Prioridade 1: total_amount da API
      if (despesa.expense?.total_amount) {
        valorTotal = despesa.expense.total_amount.toString();
      } else if (despesa.total_amount) {
        valorTotal = despesa.total_amount.toString();
      }
      // Prioridade 2: valor base da despesa
      else if (despesa.expense?.valor) {
        valorTotal = despesa.expense.valor.toString();
      } else if (despesa.valor) {
        valorTotal = despesa.valor.toString();
      }
      // Prioridade 3: calcular a partir dos itens + impostos
      else if (despesa.items || despesa.expense_items || despesa.itens) {
        const itens = despesa.items || despesa.expense_items || despesa.itens || [];
        const impostos = despesa.taxes || despesa.impostos || [];
        
        const totalItens = itens.reduce((total, item) => {
          const valor = parseFloat(item.valor || item.unit_price || item.price || 0);
          const quantidade = parseInt(item.quantidade || item.quantity || item.qty || 1);
          return total + (valor * quantidade);
        }, 0);
        
        const totalImpostos = impostos.reduce((total, imp) => {
          return total + (parseFloat(imp.tax_amount || imp.valor || imp.valorCalculado || 0));
        }, 0);
        
        valorTotal = (totalItens + totalImpostos).toFixed(2);
      }
      
      // Mapear campos da API para o formulário
      setFormData({
        id: despesa.expense?.id || despesa.id,
        descricao: despesa.expense?.description || despesa.expense?.descricao || despesa.description || despesa.descricao || '',
        valor: valorTotal,
        categoria_id: despesa.expense?.category_id || despesa.expense?.categoria_id || despesa.category_id || despesa.categoria_id || '',
        data: despesa.expense?.date_incurred ? new Date(despesa.expense.date_incurred).toISOString().split('T')[0] : 
              despesa.date_incurred ? new Date(despesa.date_incurred).toISOString().split('T')[0] :
              despesa.expense?.data || despesa.data || new Date().toISOString().split('T')[0],
        fornecedor_id: despesa.expense?.vendor_id || despesa.expense?.fornecedor_id || despesa.vendor_id || despesa.fornecedor_id || '',
        observacoes: despesa.expense?.notes || despesa.expense?.observacoes || despesa.notes || despesa.observacoes || '',
        status: despesa.expense?.status || despesa.status || 'pendente',
        documentos: despesa.expense?.documents || despesa.expense?.documentos || despesa.documents || despesa.documentos || [],
        impostos: despesa.taxes || despesa.expense?.impostos || despesa.impostos || [],
        itens: despesa.items || despesa.expense_items || despesa.itens || [],
        dataCriacao: despesa.expense?.created_at || despesa.created_at || despesa.expense?.dataCriacao || despesa.dataCriacao || new Date().toISOString(),
        dataModificacao: despesa.expense?.updated_at || despesa.updated_at || despesa.expense?.dataModificacao || despesa.dataModificacao || new Date().toISOString()
      });
      

      
      setIsEditing(true);
    } else {
      setFormData({
        descricao: '',
        valor: '',
        categoria_id: '',
        data: new Date().toISOString().split('T')[0],
        fornecedor_id: '',
        observacoes: '',
        status: 'pendente',
        documentos: [],
        impostos: [],
        itens: []
      });
      setIsEditing(false);
    }
  }, [despesa]);

  // Limpar URLs de objetos quando o modal for fechado
  useEffect(() => {
    return () => {
      if (documentUrl) {
        URL.revokeObjectURL(documentUrl);
      }
    };
  }, [documentUrl]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Função para criar nova categoria
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    setCreatingCategory(true);
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const schema = user?.schema;

      const response = await axios.post(`${process.env.REACT_APP_URL}/category/create-category`, {
        name: newCategoryName.trim(),
        schema: schema
      },
    { withCredentials: true });

      if (response.data.success === true) {
        const result = response.data;
        // Atualizar o estado local do modal
        if (result.data) {
          setCategoriasDisponiveis(prev => [...prev, result.data]);
        }
        // Chamar callback do componente pai
        if (onCategoryCreated && result.data) {
          onCategoryCreated(result.data);
        }
        setNewCategoryName('');
        setShowNewCategoryModal(false);
      } else {
        showError('Erro ao criar categoria');
      }
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      showError('Erro ao criar categoria');
    } finally {
      setCreatingCategory(false);
    }
  };

  // Função para criar novo fornecedor
  const handleCreateVendor = async () => {
    if (!newVendorName.trim()) return;
    
    setCreatingVendor(true);
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const schema = user?.schema;

      const response = await axios.post(`${process.env.REACT_APP_URL}/vendor/create-vendor`, {
        vendor_name: newVendorName.trim(),
        schema: schema
      },
    { withCredentials: true });

      if (response.data.success === true) {
        const result = response.data;
        // Atualizar o estado local do modal
        if (result.data) {
          setFornecedores(prev => [...prev, result.data]);
        }
        // Chamar callback do componente pai
        if (onVendorCreated && result.data) {
          onVendorCreated(result.data);
        }
        setNewVendorName('');
        setShowNewVendorModal(false);
      } else {
        showError('Erro ao criar fornecedor');
      }
    } catch (error) {
      console.error('Erro ao criar fornecedor:', error);
      showError('Erro ao criar fornecedor');
    } finally {
      setCreatingVendor(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      const newDocumento = {
        id: Date.now(),
        nome: file.name,
        tipo: file.type,
        tamanho: file.size,
        dataUpload: new Date().toISOString(),
        valorSugerido: '', // Valor sugerido do WhatsApp
        file: file
      };
      setFormData(prev => ({
        ...prev,
        documentos: [...prev.documentos, newDocumento]
      }));
    }
  };

  const removeDocumento = (documentoId) => {
    setFormData(prev => ({
      ...prev,
      documentos: prev.documentos.filter(doc => doc.id !== documentoId)
    }));
    
    // Se o documento removido era o selecionado, fechar o viewer
    if (selectedDocument && selectedDocument.id === documentoId) {
      setSelectedDocument(null);
      setShowDocumentViewer(false);
      setDocumentUrl('');
    }
  };

  const updateDocumentoValor = (documentoId, valor) => {
    setFormData(prev => ({
      ...prev,
      documentos: prev.documentos.map(doc => 
        doc.id === documentoId 
          ? { ...doc, valorSugerido: valor }
          : doc
      )
    }));
  };

  // Função para abrir o visualizador de documentos
  const openDocumentViewer = (documento) => {
    setSelectedDocument(documento);
    setShowDocumentViewer(true);
    setZoomLevel(100);
    
    // Criar URL para o arquivo
    if (documento.file) {
      const url = URL.createObjectURL(documento.file);
      setDocumentUrl(url);
    }
  };

  // Função para fechar o visualizador
  const closeDocumentViewer = () => {
    setShowDocumentViewer(false);
    setSelectedDocument(null);
    setZoomLevel(100);
    if (documentUrl) {
      URL.revokeObjectURL(documentUrl);
      setDocumentUrl('');
    }
  };

  // Funções de zoom
  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 25, 300));
  };

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 25, 50));
  };

  const resetZoom = () => {
    setZoomLevel(100);
  };

  const addImposto = (imposto) => {
    if (editingImposto) {
      // Editar imposto existente
      setFormData(prev => ({
        ...prev,
        impostos: prev.impostos.map(imp => 
          imp.id === editingImposto.id ? { 
            ...imposto, 
            id: imp.id,
            valorCalculado: parseFloat(imposto.valorCalculado) || parseFloat(imposto.valor) || 0,
            // Preservar propriedades necessárias para exibição
            tax_name: imposto.tax_name,
            tax_rate_percentage: imposto.tax_rate_percentage,
            tax_amount: imposto.tax_amount,
            aplicacao: imposto.aplicacao,
            itemNome: imposto.itemNome,
            expense_item_id: imposto.expense_item_id,
            itemId: imposto.expense_item_id // Manter compatibilidade
          } : imp
        )
      }));
      setEditingImposto(null);
    } else {
      // Adicionar novo imposto
      setFormData(prev => ({
        ...prev,
        impostos: [...prev.impostos, { 
          ...imposto, 
          id: imposto.id,
          valorCalculado: parseFloat(imposto.valorCalculado) || parseFloat(imposto.valor) || 0,
          tax_name: imposto.tax_name,
          tax_rate_percentage: imposto.tax_rate_percentage,
          tax_amount: imposto.tax_amount,
          aplicacao: imposto.aplicacao,
          itemNome: imposto.itemNome,
          expense_item_id: imposto.expense_item_id,
          itemId: imposto.expense_item_id // Manter compatibilidade
        }]
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

  const addItem = (item) => {

    
    if (editingItem) {
      // Editar item existente
      setFormData(prev => ({
        ...prev,
        itens: prev.itens.map(it => 
          it.id === editingItem.id ? { 
            ...item, 
            id: it.id,
            valor: parseFloat(item.valor) || 0,
            quantidade: parseInt(item.quantidade) || 1,
            // Preservar dados de impostos se existirem
            taxes: item.taxes || it.taxes || []
          } : it
        )
      }));
      setEditingItem(null);
    } else {
      // Adicionar novo item
      setFormData(prev => ({
        ...prev,
        itens: [...prev.itens, { 
          ...item, 
          id: Date.now(),
          valor: parseFloat(item.valor) || 0,
          quantidade: parseInt(item.quantidade) || 1,
          taxes: item.taxes || []
        }]
      }));
    }
    

  };

  const removeItem = (itemId) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.filter(item => item.id !== itemId)
    }));
  };

  const editItem = async (item) => {
    try {
      // Se o item tem ID (já foi salvo no backend), buscar dados atualizados
      if (item.id && typeof item.id === 'string') {
        const response = await ExpensesService.getExpenseItemById(item.id, schema);

        if (response.success && response.data) {
          setEditingItem(response.data);
        } else {
          setEditingItem(item);
        }
      } else {
        setEditingItem(item);
      }
      setShowItemModal(true);
    } catch (error) {
      console.error('Erro ao buscar dados do item:', error);
      // Em caso de erro, usar o item local
      setEditingItem(item);
      setShowItemModal(true);
    }
  };

  const calcularTotalImpostos = () => {
    return formData.impostos.reduce((total, imposto) => {
      // Prioridade: tax_amount (backend) > valorCalculado (frontend) > valor (fallback)
      const valorImposto = parseFloat(imposto.tax_amount) || parseFloat(imposto.valorCalculado) || parseFloat(imposto.valor) || 0;
      return total + valorImposto;
    }, 0);
  };

  const calcularTotalItens = () => {
    return formData.itens.reduce((total, item) => {
      // Usar valor ou unit_price (backend)
      const valor = parseFloat(item.valor) || parseFloat(item.unit_price) || parseFloat(item.price) || 0;
      const quantidade = parseInt(item.quantidade) || parseInt(item.quantity) || parseInt(item.qty) || 1;
      return total + (valor * quantidade);
    }, 0);
  };

  const calcularTotalDocumentos = () => {
    return formData.documentos.reduce((total, doc) => {
      return total + (parseFloat(doc.valorSugerido) || 0);
    }, 0);
  };

  const handleSave = () => {
    // Validação básica
    if (!formData.descricao || !formData.descricao.trim()) {
      showError('Por favor, preencha a descrição da despesa.');
      return;
    }
    
    if (!formData.valor || parseFloat(formData.valor) <= 0) {
      showError('Por favor, preencha um valor válido para a despesa.');
      return;
    }
    
    if (!formData.data) {
      showError('Por favor, selecione uma data para a despesa.');
      return;
    }
    
    // Calcular valor total real (itens + impostos)
    const totalItens = calcularTotalItens();
    const totalImpostos = calcularTotalImpostos();
    const valorTotalReal = totalItens + totalImpostos;
    
    // Se não há itens categorizados, usar o valor base
    const valorFinal = formData.itens && formData.itens.length > 0 ? valorTotalReal : (parseFloat(formData.valor) || 0);
    
    const itensDetalhados = formData.itens.map(item => {
      const impostosDoItem = formData.impostos.filter(
        imp => imp.aplicacao === 'item' && String(imp.expense_item_id || imp.itemId) === String(item.id)
      );
      

      
      const itemMapeado = {
        descricao: item.descricao || item.item_name || item.name || '',
        unit_price: parseFloat(item.valor || item.unit_price || item.price || 0),
        quantidade: parseInt(item.quantidade || item.quantity || item.qty || 1),
        hasTax: impostosDoItem.length > 0,
        tax: impostosDoItem.map(imp => imp.id), 
        observacoes: item.observacoes || item.item_desc || item.notes || ''
      };
      

      return itemMapeado;
    });

    const despesaCompleta = {
      ...formData,
      id: isEditing ? formData.id : Date.now(),
      dataCriacao: isEditing ? formData.dataCriacao : new Date().toISOString(),
      dataModificacao: new Date().toISOString(),
      totalImpostos: totalImpostos,
      totalItens: totalItens,
      totalDocumentos: calcularTotalDocumentos(),
      valorTotal: valorFinal,
      itens: itensDetalhados
    };

    onSave(despesaCompleta);
    onHide();
    setEditingItem(null);
    setEditingImposto(null);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onHide();
      setEditingItem(null);
      setEditingImposto(null);
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
          className={`modal-dialog modal-lg ${showDocumentViewer ? 'modal-with-viewer' : ''}`}
          style={{
            margin: showDocumentViewer ? 0 : '1.75rem auto',
            maxWidth: showDocumentViewer ? '58%' : '900px',
            width: showDocumentViewer ? '58%' : '98%',
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
                 {isEditing ? 'Editar Despesa' : 'Nova Despesa'}
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
                  <label className={`form-label card-subtitle-${theme}`}>Descrição *</label>
                  <input
                    type="text"
                    className={`form-control input-${theme}`}
                    value={formData.descricao}
                    onChange={(e) => handleInputChange('descricao', e.target.value)}
                    placeholder="Descrição da despesa"
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className={`form-label card-subtitle-${theme}`}>Valor *</label>
                  <input
                    type="number"
                    step="0.01"
                    id="valor-base"
                    className={`form-control input-${theme}`}
                    value={formData.valor}
                    onChange={(e) => handleInputChange('valor', e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className={`form-label card-subtitle-${theme}`}>Categoria</label>
                  <div className="d-flex gap-2">
                    <select
                      className={`form-select input-${theme}`}
                      value={formData.categoria_id || ''}
                      onChange={(e) => handleInputChange('categoria_id', e.target.value)}
                    >
                      <option value="">Selecione uma categoria</option>
                      {categoriasDisponiveis.map(cat => (
                        <option key={cat.id } value={cat.id }>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={`btn btn-outline-${theme === 'light' ? 'primary' : 'light'} btn-sm`}
                      onClick={() => setShowNewCategoryModal(true)}
                      title="Adicionar nova categoria"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <i className="bi bi-plus-circle"></i>
                    </button>
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <label className={`form-label card-subtitle-${theme}`}>Data *</label>
                  <input
                    type="date"
                    className={`form-control input-${theme}`}
                    value={formData.data}
                    onChange={(e) => handleInputChange('data', e.target.value)}
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className={`form-label card-subtitle-${theme}`}>Fornecedor</label>
                  <div className="d-flex gap-2">
                    <select
                      className={`form-select input-${theme}`}
                      value={formData.fornecedor_id || ''}
                      onChange={(e) => handleInputChange('fornecedor_id', e.target.value)}
                    >
                      <option value="">Selecione um fornecedor</option>
                      {fornecedores.map(fornecedor => (
                        <option key={fornecedor.id} value={fornecedor.id}>
                          {fornecedor.vendor_name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={`btn btn-outline-${theme === 'light' ? 'primary' : 'light'} btn-sm`}
                      onClick={() => setShowNewVendorModal(true)}
                      title="Adicionar novo fornecedor"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <i className="bi bi-plus-circle"></i>
                    </button>
                  </div>
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

              {/* Seção de Documentos - Melhorada */}
              <div className="mb-4">
                <h6 className={`header-text-${theme} mb-3`}>
                  <i className="bi bi-paperclip me-2"></i>
                  Documentos Anexados
                </h6>
                <div className={`card card-${theme} p-3 mb-3`}>
                  <div className="d-flex align-items-center gap-3">
                    <div className="flex-grow-1">
                      <input
                        type="file"
                        className={`form-control input-${theme}`}
                        onChange={handleFileUpload}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                        id="file-upload"
                        style={{ display: 'none' }}
                      />
                      <label 
                        htmlFor="file-upload" 
                        className={`btn btn-outline-${theme === 'light' ? 'primary' : 'light'} w-100`}
                        style={{ cursor: 'pointer' }}
                      >
                        <i className="bi bi-cloud-upload me-2"></i>
                        Escolher Arquivo
                      </label>
                    </div>
                    <div className="text-center">
                      <small className={`text-${theme === 'light' ? 'muted' : 'light'} d-block`}>
                        Aceita PDF, DOC, DOCX, JPG, PNG, XLS, XLSX
                      </small>
                    </div>
                  </div>
                </div>
                
                {formData.documentos && formData.documentos.length > 0 && (
                  <div className="table-responsive">
                    <table className={`table custom-table-${theme} mb-0`}>
                      <thead>
                        <tr>
                          <th className={`header-text-${theme}`}>Arquivo</th>
                          <th className={`header-text-${theme}`}>Valor Sugerido</th>
                          <th className={`header-text-${theme}`}>Tamanho</th>
                          <th className={`header-text-${theme}`}>Data</th>
                          <th className={`header-text-${theme}`}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.documentos.map(doc => (
                          <tr key={doc.id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <i className="bi bi-file-earmark me-2"></i>
                                <span className={`header-text-${theme}`}>{doc.nome}</span>
                              </div>
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                className={`form-control form-control-sm input-${theme}`}
                                placeholder="R$ 0,00"
                                value={doc.valorSugerido || ''}
                                onChange={(e) => updateDocumentoValor(doc.id, e.target.value)}
                                style={{ width: '120px' }}
                              />
                            </td>
                            <td className={`text-${theme === 'light' ? 'muted' : 'light'}`}>
                              {(doc.tamanho / 1024).toFixed(1)} KB
                            </td>
                            <td className={`text-${theme === 'light' ? 'muted' : 'light'}`}>
                              {new Date(doc.dataUpload).toLocaleDateString('pt-BR')}
                            </td>
                                                         <td>
                               <div className="d-flex gap-2">
                                 <button
                                   type="button"
                                   className={`icon-btn btn-2-${theme}`}
                                   onClick={() => openDocumentViewer(doc)}
                                   title="Visualizar documento"
                                 >
                                   <i className="bi bi-eye"></i>
                                 </button>
                                 <button
                                   type="button"
                                   className="icon-btn text-danger"
                                   onClick={() => removeDocumento(doc.id)}
                                   title="Remover arquivo"
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

              {/* Seção de Itens - Com Custom Table */}
              <div className="mb-4" style={{
                border: !formData.categoria ? `1px solid var(--border-color-${theme})` : 'none',
                borderRadius: !formData.categoria ? '12px' : '0',
                padding: !formData.categoria ? '16px' : '0',
                backgroundColor: !formData.categoria ? `var(--bg-color-${theme})` : 'transparent'
              }}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className={`header-text-${theme} mb-0`}>
                    <i className="bi bi-box me-2"></i>
                    Itens da Despesa
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
                            <th className={`header-text-${theme}`} style={{ width: '25%' }}>Item</th>
                            <th className={`header-text-${theme}`} style={{ width: '20%' }}>Observações</th>
                            <th className={`header-text-${theme}`} style={{ width: '8%' }}>Qtd.</th>
                            <th className={`header-text-${theme}`} style={{ width: '12%' }}>Unit.</th>
                            <th className={`header-text-${theme}`} style={{ width: '12%' }}>Subtotal</th>
                            <th className={`header-text-${theme}`} style={{ width: '12%' }}>Impostos</th>
                            <th className={`header-text-${theme}`} style={{ width: '11%' }}>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                                                  {formData.itens.map(item => {

                          return (
                            <tr key={item.id}>
                              <td className={`header-text-${theme}`}>
                                {item.descricao || item.item_name || item.name || 'Item'}
                              </td>
                              <td className={`text-${theme === 'light' ? 'muted' : 'light'}`}>
                                {item.observacoes || item.item_desc || item.notes || '-'}
                              </td>
                              <td className={`text-${theme === 'light' ? 'muted' : 'light'} text-center`}>
                                {item.quantidade || item.quantity || item.qty || 1}
                              </td>
                              <td className={`text-${theme === 'light' ? 'muted' : 'light'} text-end`}>
                                R$ {parseFloat(item.valor || item.unit_price || item.price || 0).toFixed(2)}
                              </td>
                              <td className={`header-text-${theme} text-end`}>
                                R$ {(parseFloat(item.valor || item.unit_price || item.price || 0) * (parseInt(item.quantidade || item.quantity || item.qty) || 1)).toFixed(2)}
                              </td>
                              <td className={`text-${theme === 'light' ? 'muted' : 'light'} text-end`}>
                                {item.taxes && item.taxes.length > 0 ? (
                                  <div>
                                    {item.taxes.map((tax, index) => (
                                      <div key={index} className="small">
                                        {tax.tax_name || tax.name || tax.tax_rate_name}: R$ {parseFloat((tax.tax_rate?.rate || tax.rate || 0) * (parseInt(item.quantity || item.qty || 1) || 1) * (parseFloat(item.unit_price || item.price || 0) || 0) / 100).toFixed(2)}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
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
                          );
                        })}
                       </tbody>
                     </table>
                  </div>
                )}
              </div>

              {/* Seção de Impostos - Com Custom Table */}
              <div className="mb-4" style={{
                border: !formData.categoria ? `1px solid var(--border-color-${theme})` : 'none',
                borderRadius: !formData.categoria ? '12px' : '0',
                padding: !formData.categoria ? '16px' : '0',
                backgroundColor: !formData.categoria ? `var(--bg-color-${theme})` : 'transparent'
              }}>
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
                               {imposto.aplicacao === 'total' ? 'Total da Compra' : 
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

                             {/* Resumo Financeiro Modernizado */}
               <div className={`card card-${theme} p-4`} style={{
                 background: `linear-gradient(135deg, var(--bg-color-${theme}) 0%, var(--input-bg-color-${theme}) 100%)`,
                 border: `1px solid var(--border-color-${theme})`,
                 borderRadius: '16px',
                 boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                 marginBottom: '24px'
               }}>
                <h6 className={`header-text-${theme} mb-4`} style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                  <i className="bi bi-calculator me-2" style={{ color: 'var(--primary-color)' }}></i>
                  Resumo Financeiro
                </h6>
                <div className="row g-3">
                  <div className="col-md-3">
                    <div className={`text-center p-3 rounded`} style={{ 
                      backgroundColor: `var(--input-bg-color-${theme})`,
                      border: `1px solid var(--border-color-${theme})`,
                      borderRadius: '12px',
                      transition: 'all 0.3s ease'
                    }}>
                      <div className={`text-${theme === 'light' ? 'muted' : 'light'} small mb-1`} style={{ fontWeight: '500', fontSize: '0.75rem' }}>Pré-Categorização</div>
                      <div className={`header-text-${theme} h5 mb-0`} style={{ fontWeight: '600' }}>R$ {parseFloat(formData.valor || 0).toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className={`text-center p-3 rounded`} style={{ 
                      backgroundColor: `var(--input-bg-color-${theme})`,
                      border: `1px solid var(--border-color-${theme})`,
                      borderRadius: '12px',
                      transition: 'all 0.3s ease'
                    }}>
                      <div className={`text-${theme === 'light' ? 'muted' : 'light'} small mb-1`} style={{ fontWeight: '500' }}>Total Itens</div>
                      <div className={`header-text-${theme} h5 mb-0`} style={{ fontWeight: '600' }}>R$ {calcularTotalItens().toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="col-md-3">
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
                  <div className="col-md-3">
                    <div className={`text-center p-3 rounded`} style={{ 
                      background: `linear-gradient(135deg, var(--primary-color) 0%, #0056b3 100%)`,
                      color: 'white',
                      borderRadius: '12px',
                      transition: 'all 0.3s ease'
                    }}>
                      <div className="small mb-1 opacity-90" style={{ fontWeight: '500' }}>Valor Total Real</div>
                      <div className="h5 mb-0 fw-bold">
                        R$ {(calcularTotalItens() + calcularTotalImpostos()).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Detalhamento dos Impostos */}
                {formData.impostos && formData.impostos.length > 0 && (
                  <div className="mt-3 p-3" style={{
                    backgroundColor: `var(--input-bg-color-${theme})`,
                    border: `1px solid var(--border-color-${theme})`,
                    borderRadius: '8px'
                  }}>
                    <h6 className={`header-text-${theme} mb-2`} style={{ fontSize: '0.9rem' }}>
                      <i className="bi bi-info-circle me-2"></i>
                      Detalhamento dos Impostos
                    </h6>
                    <div className="row g-2">
                      {formData.impostos.map((imposto, index) => (
                        <div key={index} className="col-md-6">
                          <div className="d-flex justify-content-between align-items-center small">
                            <span className={`text-${theme === 'light' ? 'muted' : 'light'}`}>
                              {imposto.tax_name || imposto.name || imposto.type || imposto.tipo || 'Imposto'} 
                              ({imposto.tax_rate_percentage || imposto.rate || imposto.aliquota ? parseFloat(imposto.tax_rate_percentage || imposto.rate || imposto.aliquota).toFixed(2) + '%' : 'N/A'})
                            </span>
                            <span className={`header-text-${theme} fw-bold`}>
                              R$ {parseFloat(imposto.tax_amount || imposto.valor || imposto.valorCalculado || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                  {isEditing ? 'Atualizar' : 'Salvar'} Despesa
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Painel de Visualização de Documentos */}
        {showDocumentViewer && selectedDocument && (
          <div 
            className={`document-viewer-panel ${theme}`}
          >
            {/* Header do Painel */}
            <div className="d-flex justify-content-between align-items-center p-3" style={{ 
              borderBottom: `1px solid var(--border-color-${theme})`,
              backgroundColor: `var(--input-bg-color-${theme})`
            }}>
              <div className="d-flex align-items-center gap-2">
                <i className={`bi bi-file-earmark header-text-${theme}`}></i>
                <h6 className={`header-text-${theme} mb-0`}>{selectedDocument.nome}</h6>
              </div>
              <div className="d-flex gap-2">
                {/* Controles de Zoom */}
                <div className="btn-group btn-group-sm" role="group">
                  <button
                    type="button"
                    className={`btn btn-outline-${theme === 'light' ? 'secondary' : 'light'}`}
                    onClick={zoomOut}
                    title="Diminuir zoom"
                  >
                    <i className="bi bi-zoom-out"></i>
                  </button>
                  <button
                    type="button"
                    className={`btn btn-outline-${theme === 'light' ? 'secondary' : 'light'}`}
                    onClick={resetZoom}
                    title="Zoom padrão"
                  >
                    {zoomLevel}%
                  </button>
                  <button
                    type="button"
                    className={`btn btn-outline-${theme === 'light' ? 'secondary' : 'light'}`}
                    onClick={zoomIn}
                    title="Aumentar zoom"
                  >
                    <i className="bi bi-zoom-in"></i>
                  </button>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeDocumentViewer}
                  aria-label="Fechar visualizador"
                ></button>
              </div>
            </div>

            {/* Área de Visualização */}
            <div className="flex-grow-1 p-3" style={{ overflow: 'auto' }}>
              <div 
                className="document-container"
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: 'top center'
                }}
              >
                {selectedDocument.tipo.startsWith('image/') ? (
                  <img
                    src={documentUrl}
                    alt={selectedDocument.nome}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                  />
                ) : selectedDocument.tipo === 'application/pdf' ? (
                  <iframe
                    src={documentUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 'none' }}
                    title={selectedDocument.nome}
                  />
                ) : (
                  <div className={`text-center p-5 text-${theme === 'light' ? 'muted' : 'light'}`}>
                    <i className="bi bi-file-earmark-text display-1"></i>
                    <p className="mt-3">Visualização não disponível para este tipo de arquivo</p>
                    <a 
                      href={documentUrl} 
                      download={selectedDocument.nome}
                      className={`btn btn-outline-${theme === 'light' ? 'primary' : 'light'}`}
                    >
                      <i className="bi bi-download me-2"></i>
                      Baixar Arquivo
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Imposto */}
      <ImpostoModal
        show={showImpostoModal}
        onHide={() => {
          setShowImpostoModal(false);
          setEditingImposto(null);
        }}
        onSave={addImposto}
        theme={theme}
        tiposImposto={tiposImposto}
        itens={formData.itens}
        calcularTotalItens={calcularTotalItens}
        impostos={formData.impostos}
        editingImposto={editingImposto}
        setEditingImposto={setEditingImposto}
      />

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

      {/* Modal para Nova Categoria */}
      {showNewCategoryModal && (
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowNewCategoryModal(false);
              setNewCategoryName('');
            }
          }}
        >
          <div 
            className="modal-dialog"
            style={{
              margin: 0,
              maxWidth: '400px',
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
                <i className={`bi bi-tags header-text-${theme}`}></i>
                <h5 className={`modal-title header-text-${theme}`}>
                  Nova Categoria
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowNewCategoryModal(false);
                    setNewCategoryName('');
                  }}
                  aria-label="Fechar"
                ></button>
              </div>
              <div className="modal-body" style={{ padding: 0 }}>
                <div className="mb-3">
                  <label className={`form-label card-subtitle-${theme}`}>Nome da Categoria</label>
                  <input
                    type="text"
                    className={`form-control input-${theme}`}
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Digite o nome da categoria"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateCategory();
                      }
                    }}
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
                    onClick={() => {
                      setShowNewCategoryModal(false);
                      setNewCategoryName('');
                    }}
                    style={{ minWidth: '120px' }}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button" 
                    className={`btn btn-1-${theme}`} 
                    onClick={handleCreateCategory}
                    disabled={creatingCategory || !newCategoryName.trim()}
                    style={{ minWidth: '120px' }}
                  >
                    {creatingCategory ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Criando...
                      </>
                    ) : (
                      'Criar Categoria'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Novo Fornecedor */}
      {showNewVendorModal && (
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowNewVendorModal(false);
              setNewVendorName('');
            }
          }}
        >
          <div 
            className="modal-dialog"
            style={{
              margin: 0,
              maxWidth: '400px',
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
                <i className={`bi bi-building header-text-${theme}`}></i>
                <h5 className={`modal-title header-text-${theme}`}>
                  Novo Fornecedor
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowNewVendorModal(false);
                    setNewVendorName('');
                  }}
                  aria-label="Fechar"
                ></button>
              </div>
              <div className="modal-body" style={{ padding: 0 }}>
                <div className="mb-3">
                  <label className={`form-label card-subtitle-${theme}`}>Nome do Fornecedor</label>
                  <input
                    type="text"
                    className={`form-control input-${theme}`}
                    value={newVendorName}
                    onChange={(e) => setNewVendorName(e.target.value)}
                    placeholder="Digite o nome do fornecedor"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateVendor();
                      }
                    }}
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
                    onClick={() => {
                      setShowNewVendorModal(false);
                      setNewVendorName('');
                    }}
                    style={{ minWidth: '120px' }}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button" 
                    className={`btn btn-1-${theme}`} 
                    onClick={handleCreateVendor}
                    disabled={creatingVendor || !newVendorName.trim()}
                    style={{ minWidth: '120px' }}
                  >
                    {creatingVendor ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Criando...
                      </>
                    ) : (
                      'Criar Fornecedor'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


    </>
  );
}

// Modal para adicionar imposto
function ImpostoModal({ show, onHide, onSave, theme, tiposImposto, itens = [], calcularTotalItens, impostos = [], editingImposto = null, setEditingImposto }) {
  const [impostosDisponiveis, setImpostosDisponiveis] = useState([])
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

  useEffect(()=>{
    const fetchImpostos = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_URL}/expenses/get-tax-rates/${schema}`, {withCredentials: true})
        if(response.data.success === true){
          const result = response.data
          setImpostosDisponiveis(Array.isArray(result.data)?result.data:[result.data])
        }
      } catch (error) {
        console.error('Erro ao buscar impostos:', error);
        setImpostosDisponiveis([]);
      }
    }

    if (show) {
      fetchImpostos();
    }
  }, [show, schema])

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
      // Aplicar sobre o valor total da compra (itens + impostos dos itens)
      const totalItens = calcularTotalItens();
      const totalImpostosItens = impostos
        .filter(imp => imp.aplicacao === 'item')
        .reduce((total, imp) => total + (parseFloat(imp.valorCalculado) || parseFloat(imp.valor) || 0), 0);
      
      // Se não há itens, usar o valor base da despesa
      const baseCalculo = totalItens > 0 ? totalItens + totalImpostosItens : parseFloat(document.getElementById('valor-base')?.value || 0);
      valorCalculado = baseCalculo * aliquotaDecimal;
    } else if (formData.aplicacao === 'item' && formData.itemId) {
      // Aplicar sobre um item específico
      const itemSelecionado = itens.find(item => item.id === parseInt(formData.itemId));
      if (itemSelecionado) {
        const valorItem = parseFloat(itemSelecionado.valor) * (parseInt(itemSelecionado.quantidade) || 1);
        valorCalculado = valorItem * aliquotaDecimal;
      }
    }
    
    const impostoCompleto = {
      ...formData,
      id: formData.tipo, // Usar o ID do imposto selecionado
      valor: valorCalculado.toFixed(2),
      valorCalculado: valorCalculado.toFixed(2),
      // Adicionar propriedades necessárias para exibição na tabela
      tax_name: impostosDisponiveis.find(imp => String(imp.id) === String(formData.tipo))?.name || formData.tipo,
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
                  <option value="total">Total da Compra</option>
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
        descricao: editingItem.descricao || editingItem.item_name || editingItem.item_description || editingItem.name || '',
        quantidade: editingItem.quantidade || editingItem.quantity || editingItem.qty || '1',
        valor: editingItem.valor || editingItem.unit_price || editingItem.price || '',
        observacoes: editingItem.observacoes || editingItem.item_desc || editingItem.notes || ''
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
      observacoes: formData.observacoes,
      // Preservar dados de impostos se existirem
      taxes: editingItem?.taxes || []
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
                Adicionar Item
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DespesaModal; 