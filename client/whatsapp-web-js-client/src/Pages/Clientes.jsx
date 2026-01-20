import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Row, Col, Card } from 'react-bootstrap';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

function Clientes({ theme }) {
  const [clientes, setClientes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { showError, showSuccess } = useToast();
  const [formData, setFormData] = useState({
    nome: '',
    numero: '',
    email: '',
    idade: ''
  });

  const userData = useAuth().userData
  const schema = userData?.schema;
  const url = process.env.REACT_APP_URL;

  useEffect(() => {
    if (schema) {
      loadClientes();
    }
  }, [schema]);

  const loadClientes = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${url}/api/clientes/get-all/${schema}`, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setClientes(response.data.data || []);
      }
    } catch (error) {
      showError(error.response.status);
      console.error('Erro ao carregar clientes:', error);
      setClientes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const { nome, numero, email, idade } = formData;
    return nome.trim() || numero.trim() || email.trim() || idade.trim();
  };

  const handleSave = async () => {
    if (!validateForm()) {
      alert('É necessário preencher pelo menos um campo para salvar o cliente.');
      return;
    }

    try {
      const payload = {
        nome: formData.nome.trim() || null,
        numero: formData.numero.trim() || null,
        email: formData.email.trim() || null,
        idade: formData.idade.trim() ? parseInt(formData.idade) : null,
        schema: schema
      };

      await axios.post(`${url}/api/clientes`, payload, {
        withCredentials: true
      });

      loadClientes();
      handleCloseModal();
    } catch (error) {
      showError(error.response.status);
      console.error('Erro ao salvar cliente:', error);
      alert('Erro ao salvar cliente. Tente novamente.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este cliente?')) {
      return;
    }

    try {
      await axios.delete(`${url}/api/clientes/${id}/${schema}`, {
        withCredentials: true
      });

      loadClientes();
    } catch (error) {
      showError(error.response.status);
      console.error('Erro ao excluir cliente:', error);
      alert('Erro ao excluir cliente. Tente novamente.');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      nome: '',
      numero: '',
      email: '',
      idade: ''
    });
  };

  return (
    <div className={`bg-${theme} min-vh-100`}>
      <div className="container-fluid p-4">
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <h4 className={`header-text-${theme} mb-0`}>
                <i className="bi bi-people me-2"></i>
                Clientes
              </h4>
              <Button
                onClick={() => setShowModal(true)}
                className={`btn-1-${theme} btn-sm`}
              >
                <i className="bi bi-plus-circle me-1"></i>
                Novo Cliente
              </Button>
            </div>
          </Col>
        </Row>

        <Row>
          <Col>
            <Card className={`bg-form-${theme} border-0 shadow`}>
              <Card.Header className={`bg-form-${theme} border-0`}>
                <h5 className={`header-text-${theme} mb-0`}>
                  <i className="bi bi-list-ul me-2"></i>
                  Lista de Clientes
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
                        <th className={`header-text-${theme}`}>Nome</th>
                        <th className={`header-text-${theme}`}>Número</th>
                        <th className={`header-text-${theme}`}>Email</th>
                        <th className={`header-text-${theme}`}>Idade</th>
                        <th className={`header-text-${theme}`}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientes.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center text-muted py-4">
                            Nenhum cliente cadastrado
                          </td>
                        </tr>
                      ) : (
                        clientes.map((cliente) => (
                          <tr key={cliente.id}>
                            <td className={`text-${theme === 'dark' ? 'light' : 'dark'}`}>
                              {cliente.nome || '-'}
                            </td>
                            <td className={`text-${theme === 'dark' ? 'light' : 'dark'}`}>
                              {cliente.numero || '-'}
                            </td>
                            <td className={`text-${theme === 'dark' ? 'light' : 'dark'}`}>
                              {cliente.email || '-'}
                            </td>
                            <td className={`text-${theme === 'dark' ? 'light' : 'dark'}`}>
                              {cliente.idade || '-'}
                            </td>
                            <td>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDelete(cliente.id)}
                                className={`btn btn-sm btn-outline-danger`}
                                style={{ padding: '0.2rem 0.4rem' }}
                              >
                                <i className="bi bi-trash-fill" style={{ fontSize: '0.7rem' }}></i>
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

        <Modal show={showModal} onHide={handleCloseModal} centered>
          <Modal.Header closeButton className={`bg-form-${theme}`}>
            <Modal.Title className={`header-text-${theme}`}>
              Novo Cliente
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className={`bg-form-${theme}`}>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label className={`header-text-${theme}`}>
                  Nome
                </Form.Label>
                <Form.Control
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleInputChange}
                  className={`input-${theme}`}
                  placeholder="Digite o nome do cliente"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className={`header-text-${theme}`}>
                  Número
                </Form.Label>
                <Form.Control
                  type="text"
                  name="numero"
                  value={formData.numero}
                  onChange={handleInputChange}
                  className={`input-${theme}`}
                  placeholder="Digite o número do cliente"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className={`header-text-${theme}`}>
                  Email
                </Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`input-${theme}`}
                  placeholder="Digite o email do cliente"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className={`header-text-${theme}`}>
                  Idade
                </Form.Label>
                <Form.Control
                  type="number"
                  name="idade"
                  value={formData.idade}
                  onChange={handleInputChange}
                  className={`input-${theme}`}
                  placeholder="Digite a idade do cliente"
                  min="0"
                />
              </Form.Group>
              <Form.Text className="text-muted">
                * Pelo menos um campo deve ser preenchido para salvar o cliente.
              </Form.Text>
            </Form>
          </Modal.Body>
          <Modal.Footer className={`bg-form-${theme}`}>
            <Button onClick={handleCloseModal} className={`btn-2-${theme} btn-sm`}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className={`btn-1-${theme} btn-sm`}>
              Salvar
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
}

export default Clientes;

