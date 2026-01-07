import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Row, Col, Card } from 'react-bootstrap';
import axios from 'axios';

function ControleEstoque({ theme }) {
  const [itens, setItens] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [formData, setFormData] = useState({
    categoria_id: '',
    nome: '',
    quantidade: 0,
    quantidade_atencao: 0,
    quantidade_urgencia: 0
  });
  const [nfType, setNfType] = useState('compra');
  const [nfFile, setNfFile] = useState(null);
  const [uploadingNF, setUploadingNF] = useState(false);
  const [showItensNotFoundModal, setShowItensNotFoundModal] = useState(false);
  const [itensNotFound, setItensNotFound] = useState([]);
  const [itensMapSelection, setItensMapSelection] = useState({});
  const itensSelecionados = itens.filter(item => 
    Object.values(itensMapSelection).includes(item.id)
  );

  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;


  

  useEffect(() => {
    loadItens();
    loadCategorias();
  }, []);

  const loadItens = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${url}/stock/get-all-itens/${schema}`, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setItens(response.data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
      setItens([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadNF = async () => {
    if (!nfFile || !nfType) return;
    const isXml =
      nfFile?.type === 'application/xml' ||
      nfFile?.type === 'text/xml' ||
      nfFile?.name?.toLowerCase().endsWith('.xml');
    if (!isXml) return;
    try {
      setUploadingNF(true);
      const form = new FormData();
      form.append('file', nfFile);
      form.append('type', nfType);
      form.append('schema', schema);

      const response = await axios.post(`https://cf343672f491.ngrok-free.app/file/`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const itensNotFound = Array.isArray(response.data.itens_not_found) ? response.data.itens_not_found : [response.data.itens_not_found];

      if (itensNotFound.length > 0) {
        setItensNotFound(itensNotFound);
        setShowItensNotFoundModal(true);
      }
      setNfFile(null);
      setNfType('compra');
    } catch (error) {
      console.error('Erro ao enviar NF:', error);
    } finally {
      setUploadingNF(false);
    }
  };

  const handleSelectMapItem = (key, value) => {
    setItensMapSelection(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleCloseItensNotFound = () => {
    setShowItensNotFoundModal(false);
    setItensNotFound([]);
    setItensMapSelection({});
  };

  const handleConfirmItensNotFound = async (itens) => {
    for (let index = 0; index < itensNotFound.length; index++) {
      const nfItem = itensNotFound[index];
      const itemObj = nfItem?.item ?? nfItem;
      const base = itemObj?.id || itemObj?.name || itemObj?.item || String(index);
      const selectionKey = `${base}-${index}`;
      const estoqueId = itensMapSelection[selectionKey];
      const quantidadeStr = itemObj?.quantidade || itemObj?.qCom || "1";
      
      if (estoqueId) {
        const estoqueItem = itens.find(i => String(i.id) === String(estoqueId));
        const quantidade = parseFloat(String(quantidadeStr).replace(',', '.'));

        await axios.put(`${url}/stock/alter-item-quantity`, {
          item_id: estoqueItem.id,
          quantity: parseInt(nfItem.qCom),
          isSum: true,
          schema: schema
        })
      }
    }
    setShowItensNotFoundModal(false);
  };

  const handleAddItemFromNF = (itemName) => {
    setEditingItem(null);
    setFormData({
      categoria_id: '',
      nome: itemName || '',
      quantidade: 0,
      quantidade_atencao: 0,
      quantidade_urgencia: 0
    });
    setShowModal(true);
  };

  const loadCategorias = async () => {
    try {
      const response = await axios.get(`${url}/stock/get-categories/${schema}`, {
        withCredentials: true
      });
      
      
      if (response.data.success) {
        setCategorias(response.data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      console.error('Detalhes do erro:', error.response?.data);
      setCategorias([]);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    setCreatingCategory(true);
    try {
      
      const response = await axios.post(`${url}/stock/create-category`, {
        category_name: newCategoryName.trim(),
        schema: schema
      }, {
        withCredentials: true
      });


      if (response.data.success) {
        const novaCategoria = response.data.data;
        setCategorias(prev => [...prev, novaCategoria]);
        // Selecionar automaticamente a categoria recém-criada
        setFormData(prev => ({
          ...prev,
          categoria_id: novaCategoria.id
        }));
        setNewCategoryName('');
        setShowNewCategoryModal(false);
      } else {
        console.error('Erro na resposta da API:', response.data);
      }
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      console.error('Detalhes do erro:', error.response?.data);
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    
    // O item.category já é o UUID da categoria
    setFormData({
      categoria_id: item.category || '',
      nome: item.item || '',
      quantidade: item.quantity || 0,
      quantidade_atencao: item.atention_quantity || 0,
      quantidade_urgencia: item.urgent_quantity || 0
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        schema: schema
      };

      let response;
      if (editingItem) {
        response = await axios.put(`${url}/stock/update-item`,{
        item_id:editingItem.id,
        item_name:formData.nome,
        category:formData.categoria_id,
        quantity:formData.quantidade,
        atention_quantity:formData.quantidade_atencao,
        urgent_quantity:formData.quantidade_urgencia,
        schema: schema
      }, {
          withCredentials: true
        });
      } else {
        // Criar novo item
        response = await axios.post(`${url}/stock/insert-stock-item`, {
          nome:formData.nome,
          quantidade:formData.quantidade,
          categoria:formData.categoria_id,
          atention_quantity:formData.quantidade_atencao,
          urgent_quantity:formData.quantidade_urgencia,
          schema:schema
        }, {
          withCredentials: true
        });
      }

      if (response.data.success) {
        loadItens();
        handleCloseModal();
      }
    } catch (error) {
      console.error('Erro ao salvar item:', error);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({
      categoria_id: '',
      nome: '',
      quantidade: 0,
      quantidade_atencao: 0,
      quantidade_urgencia: 0
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['quantidade', 'quantidade_atencao', 'quantidade_urgencia'].includes(name) 
        ? parseInt(value) || 0 
        : value
    }));
  };

  const handleQuantityChange = async (item, change, isSumValue) => {
    try {
      const payload = {
        item_id: item.id,
        quantity: change,
        isSum: isSumValue,
        schema: schema
      };

      const response = await axios.put(`${url}/stock/alter-item-quantity`, payload, {
        withCredentials: true
      });

      if (response.data.success) {
        loadItens();
      }
    } catch (error) {
      console.error('Erro ao alterar quantidade:', error);
    }
  };

  // Função para filtrar itens por status
  const getItensByStatus = (status) => {
    return itens.filter(item => {
      const quantidade = item.quantity || 0;
      const quantidadeAtencao = item.atention_quantity || 0;
      const quantidadeUrgencia = item.urgent_quantity || 0;
      
      switch (status) {
        case 'normal':
          return quantidade > quantidadeAtencao;
        case 'atencao':
          return quantidade <= quantidadeAtencao && quantidade > quantidadeUrgencia;
        case 'urgencia':
          return quantidade <= quantidadeUrgencia;
        default:
          return true;
      }
    });
  };

  const renderTabela = (titulo, itensFiltrados, corIcone, tipoStatus) => (
    <Card className={`bg-form-${theme} border-0 shadow h-100`}>
      <Card.Header className={`bg-form-${theme} border-0`}>
        <h5 className={`header-text-${theme} mb-0`}>
          <i className={`bi ${corIcone} me-2`}></i>
          {titulo}
        </h5>
      </Card.Header>
      <Card.Body className={`bg-form-${theme}`}>
        {isLoading ? (
          <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
          </div>
        ) : (
          <Table responsive striped hover className={`table-${theme}`}>
            <thead>
              <tr>
                <th className={`header-text-${theme}`}>Categoria</th>
                <th className={`header-text-${theme}`}>Nome</th>
                <th className={`header-text-${theme}`}>Quantidade</th>
                <th className={`header-text-${theme}`}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {itensFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center text-muted py-4">
                    Nenhum item encontrado
                  </td>
                </tr>
              ) : (
                itensFiltrados.map((item, index) => {
                  // Buscar o nome da categoria pelo UUID
                  const categoria = categorias.find(cat => cat.id === item.category);
                  return (
                  <tr 
                    key={item.id || index}
                    style={{
                      backgroundColor: tipoStatus === 'atencao' ? 'rgba(246, 254, 1, 0.38)' : 
                                     tipoStatus === 'urgencia' ? 'rgba(220, 53, 69, 0.2)' : 
                                     'transparent'
                    }}
                  >
                    <td className={`text-${theme === 'dark' ? 'light' : 'dark'}`}>
                      {categoria?.name || 'Categoria não encontrada'}
                    </td>
                    <td className={`text-${theme === 'dark' ? 'light' : 'dark'}`}>
                      {item.item}
                    </td>
                     <td className={`text-${theme === 'dark' ? 'light' : 'dark'}`}>
                       <div className="d-flex align-items-center gap-2">
                         <Button
                           variant="outline-danger"
                           size="sm"
                           onClick={() => handleQuantityChange(item, 1, false)}
                           className={`btn btn-sm btn-outline-danger`}
                           disabled={item.quantity <= 0}
                           style={{ padding: '0.2rem 0.4rem' }}
                         >
                           <i className="bi bi-dash" style={{ fontSize: '0.7rem' }}></i>
                         </Button>
                         <span 
                           className="fw-bold" 
                           style={{ 
                             minWidth: '25px', 
                             textAlign: 'center', 
                             fontSize: '0.9rem',
                             color: tipoStatus === 'atencao' ? '#ffc107' : 
                                    tipoStatus === 'urgencia' ? '#dc3545' : 
                                    'inherit'
                           }}
                         >
                           {item.quantity}
                         </span>
                         <Button
                           variant="outline-success"
                           size="sm"
                           onClick={() => handleQuantityChange(item, 1, true)}
                           className={`btn btn-sm btn-outline-success`}
                           style={{ padding: '0.2rem 0.4rem' }}
                         >
                           <i className="bi bi-plus" style={{ fontSize: '0.7rem' }}></i>
                         </Button>
                       </div>
                     </td>
                     <td>
                       <Button
                         variant="outline-primary"
                         size="sm"
                         onClick={() => handleEdit(item)}
                         className={`btn btn-sm btn-2-${theme}`}
                         style={{ padding: '0.2rem 0.4rem' }}
                       >
                         <i className="bi bi-pencil-fill" style={{ fontSize: '0.7rem' }}></i>
                       </Button>
                     </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );

  return (
    <div className={`bg-${theme} min-vh-100`}>
      <div className="container-fluid p-4">
        {/* Header com botão de novo item */}
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <h4 className={`header-text-${theme} mb-0`}>
                <i className="bi bi-box-seam me-2"></i>
                Controle de Estoque
              </h4>
              <div className="d-flex gap-2">


                <Button
                  onClick={() => setShowModal(true)}
                  className={`btn-1-${theme} btn-sm`}
                >
                  <i className="bi bi-plus-circle me-1"></i>
                  Novo Item
                </Button>
              </div>
            </div>
          </Col>
        </Row>

        {/* Área de Upload de Nota Fiscal */}
        <Row className="mb-4">
          <Col>
            <Card className={`bg-form-${theme} border-0 shadow`}>
              <Card.Header className={`bg-form-${theme} border-0`}>
                <h6 className={`header-text-${theme} mb-0`}>
                  <i className="bi bi-receipt-cutoff me-2"></i>
                  Enviar Nota Fiscal
                </h6>
              </Card.Header>
              <Card.Body className={`bg-form-${theme}`}>
                <Row className="g-3 align-items-end">
                  <Col md={3} sm={6}>
                    <Form.Group>
                      <Form.Label className={`header-text-${theme}`}>Tipo</Form.Label>
                      <Form.Select
                        value={nfType}
                        onChange={(e) => setNfType(e.target.value)}
                        className={`input-${theme}`}
                      >
                        <option value="compra">Compra</option>
                        <option value="venda">Venda</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6} sm={12}>
                    <Form.Group>
                      <Form.Label className={`header-text-${theme}`}>
                        Arquivo da NF (XML)
                      </Form.Label>
                      <Form.Control
                        type="file"
                        accept=".xml,application/xml,text/xml"
                        className={`input-${theme}`}
                        onChange={(e) => setNfFile(e.target.files?.[0] || null)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3} sm={6}>
                    <Button
                      className={`btn-1-${theme} w-100`}
                      onClick={handleUploadNF}
                      disabled={
                        !nfFile ||
                        uploadingNF ||
                        !(
                          nfFile?.type === 'application/xml' ||
                          nfFile?.type === 'text/xml' ||
                          nfFile?.name?.toLowerCase().endsWith('.xml')
                        )
                      }
                    >
                      {uploadingNF ? 'Enviando...' : 'Enviar NF'}
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* 3 colunas de estoque */}
        <Row className="g-4">
          <Col md={4}>
            {renderTabela('Estoque Normal', getItensByStatus('normal'), 'bi-check-circle text-success', 'normal')}
          </Col>
          <Col md={4}>
            {renderTabela('Atenção', getItensByStatus('atencao'), 'bi-exclamation-triangle text-warning', 'atencao')}
          </Col>
          <Col md={4}>
            {renderTabela('Urgência', getItensByStatus('urgencia'), 'bi-x-circle text-danger', 'urgencia')}
          </Col>
        </Row>

        {/* Modal para Editar/Criar Item */}
        <Modal show={showModal} onHide={handleCloseModal} centered>
          <Modal.Header closeButton className={`bg-form-${theme}`}>
            <Modal.Title className={`header-text-${theme}`}>
              {editingItem ? 'Editar Item' : 'Novo Item'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className={`bg-form-${theme}`}>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label className={`header-text-${theme}`}>
                  Categoria
                </Form.Label>
                <div className="d-flex gap-2">
                  <Form.Select
                    name="categoria_id"
                    value={formData.categoria_id}
                    onChange={handleInputChange}
                    className={`input-${theme}`}
                  >
                    <option value="">Selecione uma categoria</option>
                    {categorias.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </Form.Select>
                  <Button
                    type="button"
                    variant="outline-primary"
                    size="sm"
                    onClick={() => setShowNewCategoryModal(true)}
                    className={`btn-outline-${theme === 'light' ? 'primary' : 'light'}`}
                    title="Adicionar nova categoria"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    <i className="bi bi-plus-circle"></i>
                  </Button>
                </div>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className={`header-text-${theme}`}>
                  Nome do Item
                </Form.Label>
                <Form.Control
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleInputChange}
                  className={`input-${theme}`}
                  placeholder="Digite o nome do item"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className={`header-text-${theme}`}>
                  Quantidade Atual
                </Form.Label>
                <Form.Control
                  type="number"
                  name="quantidade"
                  value={formData.quantidade}
                  onChange={handleInputChange}
                  className={`input-${theme}`}
                  placeholder="Digite a quantidade atual"
                  min="0"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className={`header-text-${theme}`}>
                  Quantidade para Atenção
                </Form.Label>
                <Form.Control
                  type="number"
                  name="quantidade_atencao"
                  value={formData.quantidade_atencao}
                  onChange={handleInputChange}
                  className={`input-${theme}`}
                  placeholder="Digite a quantidade mínima para atenção"
                  min="0"
                />
                <Form.Text className="text-muted">
                  Quando a quantidade atual chegar neste valor, será exibido um aviso de atenção.
                </Form.Text>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className={`header-text-${theme}`}>
                  Quantidade para Urgência
                </Form.Label>
                <Form.Control
                  type="number"
                  name="quantidade_urgencia"
                  value={formData.quantidade_urgencia}
                  onChange={handleInputChange}
                  className={`input-${theme}`}
                  placeholder="Digite a quantidade mínima para urgência"
                  min="0"
                />
                <Form.Text className="text-muted">
                  Quando a quantidade atual chegar neste valor, será exibido um aviso de urgência.
                </Form.Text>
              </Form.Group>
            </Form>
          </Modal.Body>
           <Modal.Footer className={`bg-form-${theme}`}>
             <Button onClick={handleCloseModal} className={`btn-2-${theme} btn-sm`}>
               Cancelar
             </Button>
             <Button onClick={handleSave} className={`btn-1-${theme} btn-sm`}>
               {editingItem ? 'Atualizar' : 'Salvar'}
             </Button>
           </Modal.Footer>
        </Modal>

        {/* Modal para Nova Categoria */}
        <Modal show={showNewCategoryModal} onHide={() => setShowNewCategoryModal(false)} centered>
          <Modal.Header closeButton className={`bg-form-${theme}`}>
            <Modal.Title className={`header-text-${theme}`}>
              <i className="bi bi-tags me-2"></i>
              Nova Categoria
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className={`bg-form-${theme}`}>
            <Form.Group className="mb-3">
              <Form.Label className={`header-text-${theme}`}>
                Nome da Categoria
              </Form.Label>
              <Form.Control
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className={`input-${theme}`}
                placeholder="Digite o nome da categoria"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateCategory();
                  }
                }}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className={`bg-form-${theme}`}>
            <Button 
              onClick={() => {
                setShowNewCategoryModal(false);
                setNewCategoryName('');
              }} 
              className={`btn-2-${theme} btn-sm`}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateCategory} 
              className={`btn-1-${theme} btn-sm`}
              disabled={creatingCategory || !newCategoryName.trim()}
            >
              {creatingCategory ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Criando...
                </>
              ) : (
                'Criar Categoria'
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Modal: Itens não encontrados na NF */}
        <Modal show={showItensNotFoundModal} onHide={handleCloseItensNotFound} centered>
          <Modal.Header closeButton className={`bg-form-${theme}`}>
            <Modal.Title className={`header-text-${theme}`}>
              Itens não encontrados
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className={`bg-form-${theme}`}>
            <p className={`header-text-${theme}`} style={{ marginBottom: '12px' }}>
              Associe cada item não identificado a um item existente do estoque.
            </p>
            <Form>
              {itensNotFound && itensNotFound.length > 0 ? (
                itensNotFound.map((nfItem, index) => {
                  const itemObj = nfItem?.item ?? nfItem;
                  const keyBase = itemObj?.id || itemObj?.name || itemObj?.item || String(index);
                  const key = `${keyBase}-${index}`;
                  const label = itemObj?.xProd || itemObj?.item || String(itemObj);
                  return (
                    <Form.Group className="mb-3" key={key}>
                      <Form.Label className={`header-text-${theme}`}>
                        {label}
                      </Form.Label>
                      <div className="d-flex gap-2">
                        <Form.Select
                          value={itensMapSelection[key] || ''}
                          onChange={(e) => handleSelectMapItem(key, e.target.value)}
                          className={`input-${theme}`}
                        >
                          <option value="">Selecionar item correspondente</option>
                          {itens.map(op => (
                            <option key={op.id} value={op.id}>
                              {op.name || op.item || String(op) || op.xProd}
                            </option>
                            
                          ))}
                        </Form.Select>
                        <Button
                          type="button"
                          variant="outline-primary"
                          size="sm"
                          className={`btn-outline-${theme === 'light' ? 'primary' : 'light'}`}
                          onClick={() => handleAddItemFromNF(label)}
                          title="Adicionar novo item"
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          <i className="bi bi-plus-circle me-1"></i>
                          Adicionar
                        </Button>
                      </div>
                    </Form.Group>
                  );
                })
              ) : (
                <div className={`header-text-${theme}`}>Nenhum item a exibir.</div>
              )}
            </Form>
          </Modal.Body>
          <Modal.Footer className={`bg-form-${theme}`}>
            <Button onClick={handleCloseItensNotFound} className={`btn-2-${theme} btn-sm`}>
              Cancelar
            </Button>
            <Button onClick={() => handleConfirmItensNotFound(itensSelecionados)} className={`btn-1-${theme} btn-sm`}>
              Confirmar
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
}

export default ControleEstoque;
