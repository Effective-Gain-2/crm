import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Row, Col, Card } from 'react-bootstrap';
import axios from 'axios';

function ControleEstoque({ theme }) {
  const [itens, setItens] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    categoria: '',
    nome: '',
    quantidade: 0
  });

  const userData = JSON.parse(localStorage.getItem('user'));
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;

  useEffect(() => {
    loadItens();
  }, []);

  const loadItens = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${url}/stock/get-all-itens/${schema}`, {
        withCredentials: true
      });
      console.log(response.data)
      
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

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      categoria: item.category || '',
      nome: item.item || '',
      quantidade: item.quantity || 0
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
        category:formData.categoria,
        quantity:formData.quantidade,
        schema: schema
      }, {
          withCredentials: true
        });
      } else {
        // Criar novo item
        response = await axios.post(`${url}/stock/insert-stock-item`, payload, {
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
      categoria: '',
      nome: '',
      quantidade: 0
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantidade' ? parseInt(value) || 0 : value
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

  return (
    <div className={`bg-${theme} min-vh-100`}>
      <div className="container-fluid p-4">
        <Row className="mb-4">
          <Col>
            <Card className={`bg-form-${theme} border-0 shadow`}>
              <Card.Header className={`bg-form-${theme} border-0`}>
                <div className="d-flex justify-content-between align-items-center">
                  <h4 className={`header-text-${theme} mb-0`}>
                    <i className="bi bi-box-seam me-2"></i>
                    Controle de Estoque
                  </h4>
                   <Button
                     onClick={() => setShowModal(true)}
                     className={`btn-1-${theme} btn-sm`}
                   >
                     <i className="bi bi-plus-circle me-1"></i>
                     Novo Item
                   </Button>
                </div>
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
                      {itens.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="text-center text-muted py-4">
                            Nenhum item encontrado
                          </td>
                        </tr>
                      ) : (
                        itens.map((item, index) => (
                          <tr key={item.id || index}>
                            <td className={`text-${theme === 'dark' ? 'light' : 'dark'}`}>
                              {item.category}
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
                                 <span className="fw-bold" style={{ minWidth: '25px', textAlign: 'center', fontSize: '0.9rem' }}>
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
                        ))
                      )}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
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
                <Form.Control
                  type="text"
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleInputChange}
                  className={`input-${theme}`}
                  placeholder="Digite a categoria"
                />
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
                  Quantidade
                </Form.Label>
                <Form.Control
                  type="number"
                  name="quantidade"
                  value={formData.quantidade}
                  onChange={handleInputChange}
                  className={`input-${theme}`}
                  placeholder="Digite a quantidade"
                  min="0"
                />
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
      </div>
    </div>
  );
}

export default ControleEstoque;
