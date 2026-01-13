import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import logo from './assets/effective-gain_logo.png';
import { useTheme } from './assets/js/useTheme';
import { useAuth } from '../contexts/AuthContext';

function SchemasPage({ theme: themeProp }) {
  const [schemas, setSchemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchema, setSelectedSchema] = useState(null);
  const [filter, setFilter] = useState('');
  const [theme, setTheme] = useTheme(themeProp);
  const [newSchema, setNewSchema] = useState({
    schema_name: '',
    name: '',
    superAdmin: { email: '', password: '', name: '' }
  });
  const [showLimitsPanel, setShowLimitsPanel] = useState(false);
  const [selectedSchemasForLimits, setSelectedSchemasForLimits] = useState([]);
  const [currentSchemaLimits, setCurrentSchemaLimits] = useState(null);
  const [loadingLimits, setLoadingLimits] = useState(false);
  const [limits, setLimits] = useState([]);
  const userData = useAuth()
  const [newLimit, setNewLimit] = useState({
    name: '',
    is_on: true,
    quantity: ''
  });

  const url = process.env.REACT_APP_URL;
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  useEffect(() => {
    async function fetchSchemas() {
      try {
        const response = await axios.get(`${url}/company/tecnico`,
        {
      withCredentials: true
    });
        setSchemas(Array.isArray(response.data) ? response.data : response.data.empresas || []);
      } catch (error) {
        console.error('Erro ao buscar schemas:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSchemas();
  }, [url]);

  const handleEnterSchema = async(schema) => {
    userData.schema = schema.schema_name || schema;
    userData.empresa = schema.company_name || schema.empresa || '';
    localStorage.setItem('user', JSON.stringify(userData));
    await axios.post(`${url}/company/set-schema`, { schema: schema.schema_name || schema },
    {
      withCredentials: true
    });
    setSelectedSchema(schema.schema_name || schema);
    navigate('/painel');
  };

  // Filtro aplicado ao array de schemas
  const filteredSchemas = Array.isArray(schemas)
    ? schemas.filter((schema) => {
        const name = (schema.company_name || schema).toString().toLowerCase();
        return name.includes(filter.toLowerCase());
      })
    : [];

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(newTheme);
    document.cookie = `theme=${newTheme}`;
    setTheme(newTheme);
  };
const handleCreateSchema = async (e) => {
  e.preventDefault();
  try {
    await axios.post(`${url}/company/company`, newSchema,
        {
      withCredentials: true
    });
    const response = await axios.get(`${url}/company/tecnico`,
        {
      withCredentials: true
    });
    setSchemas(Array.isArray(response.data) ? response.data : response.data.empresas || []);
   setNewSchema({
      schema_name: '',
      name: '',
      superAdmin: { email: '', password: '', name: '' }
    });
  } catch (error) {
    console.error('Erro ao criar schema:', error);
  }
};

  const handleUpdateSchema = async (schemaName) => {
    try {
      const response = await axios.post(`${url}/company/update-schema`, 
        { schema: schemaName },
        { withCredentials: true }
      );
      
      alert(response.data.message);
    } catch (error) {
      console.error('Erro ao atualizar schema:', error);
      alert('Erro ao atualizar schema: ' + (error.response?.data?.message || error.message));
    }
  };

  const toggleNewSchemaPanel = (show) => {
    const panel = document.querySelector('.new-schema-panel');
    if (show) {
      panel.classList.remove('d-none');
    } else {
      panel.classList.add('d-none');
    }
  };

  const toggleLimitsPanel = async (schema = null) => {
    if (schema) {
      const schemaName = schema.schema_name || schema;
      setSelectedSchemasForLimits([schemaName]);
      setLoadingLimits(true);
      
      try {
        const response = await axios.get(`${url}/limits/get-limits/${schemaName}`, {
          withCredentials: true
        });
        
        if (response.data.success && response.data.data.length > 0) {
          setLimits(response.data.data);
          setCurrentSchemaLimits(response.data.data);
        } else {
          setLimits([]);
          setCurrentSchemaLimits(null);
        }
      } catch (error) {
        console.error('Erro ao buscar limitadores:', error);
        setLimits([]);
        setCurrentSchemaLimits(null);
      } finally {
        setLoadingLimits(false);
      }
    }
    setShowLimitsPanel(!showLimitsPanel);
  };

  const handleSchemaSelection = (schema) => {
    const schemaName = schema.schema_name || schema;
    setSelectedSchemasForLimits(prev => {
      if (prev.includes(schemaName)) {
        return prev.filter(s => s !== schemaName);
      } else {
        return [...prev, schemaName];
      }
    });
  };

  const addNewLimit = () => {
    if (newLimit.name.trim()) {
      setLimits(prev => [...prev, { ...newLimit, id: Date.now() }]);
      setNewLimit({ name: '', is_on: true, quantity: '' });
    }
  };

  const removeLimit = (index) => {
    setLimits(prev => prev.filter((_, i) => i !== index));
  };

  const updateLimit = (index, field, value) => {
    setLimits(prev => prev.map((limit, i) => 
      i === index ? { ...limit, [field]: value } : limit
    ));
  };

  const handleLimitsSubmit = async () => {
    try {
      const schemaName = selectedSchemasForLimits[0];
      
      // Salvar cada limitador
      for (const limit of limits) {
        if (limit.id) {
          // É um novo limitador (tem ID temporário)
          await axios.post(`${url}/limits/insert-limit`, {
            schema: schemaName,
            name: limit.name,
            is_on: limit.is_on,
            quantity: limit.quantity || null
          }, {
            withCredentials: true
          });
        } else {
          // É um limitador existente
          await axios.put(`${url}/limits/update-limit`, {
            schema: schemaName,
            name: limit.name,
            is_on: limit.is_on,
            quantity: limit.quantity || null
          }, {
            withCredentials: true
          });
        }
      }
      
      alert('Limitadores salvos com sucesso!');
      setShowLimitsPanel(false);
      setSelectedSchemasForLimits([]);
    } catch (error) {
      console.error('Erro ao salvar limitadores:', error);
      alert('Erro ao salvar limitadores: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div
      className={`d-flex justify-content-center align-items-center bg-screen-${theme}`}
      style={{ height: '100vh', width: '100vw', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="d-flex flex-row align-items-center justify-content-center" style={{ width: '70vw', maxWidth: 1100, gap: '2rem', height: 550 }}>
        {/* Escolha de Schema */}
        <div className={`bg-form-${theme} rounded shadow p-4 d-flex flex-column align-items-center justify-content-between`} style={{ width: '60%', minWidth: 320, height: '75%' }}>
          <div className="w-100 d-flex flex-row align-items-center justify-content-between mb-4 mt-2">
            <div className="d-flex align-items-center">
              <i className={`bi bi-bounding-box header-text-${theme} fs-3 me-2`}></i>
              <h2 className={`ms-3 header-text-${theme} m-0`} style={{ fontWeight: 400, fontSize: '1.5rem' }}>Escolha um Schema</h2>
            </div>
            <div className="d-flex flex-row align-items-center gap-2">
              <button
                type="button"
                className={`btn btn-2-${theme}`}
                onClick={() => toggleNewSchemaPanel(true)}
                aria-label="Criar novo schema"
              >
                <i className="bi bi-plus-lg"></i>
              </button>
              <button
                type="button"
                className={`btn btn-2-${theme}`}
                onClick={toggleTheme}
                aria-label="Alternar tema"
              >
                <i className={`${theme === 'light' ? `bi-sun` : `bi-moon-stars`}`}></i>
              </button>
              <button id="sair" type="button" data-bs-toggle="tooltip" data-bs-placement="right" data-bs-title="Sair" className={`btn btn-2-${theme} toggle-${theme}`} onClick={handleLogout}>
                <i className="bi bi-door-open"></i>
              </button>
            </div>
          </div>
          <input
            type="text"
            className={`form-control mb-3 input-${theme}`}
            placeholder="Filtrar por empresa..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          {loading ? (
            <div className={`text-center header-text-${theme}`}>Carregando schemas...</div>
          ) : (
            <div className="d-flex flex-column gap-3 w-100 overflow-y-auto" style={{ maxHeight: '170px' }}>
              {filteredSchemas.length === 0 ? (
                <div className={`text-center header-text-${theme}`}>Nenhum resultado encontrado</div>
              ) : (
                filteredSchemas.map((schema) => (
                  <div
                    key={schema.schema_name || schema}
                    className={`card-${theme} d-flex flex-row align-items-center justify-content-between rounded shadow-sm px-4 py-3`}
                  >
                    <span className={`header-text-${theme} fw-semibold`} style={{ fontSize: '1.1rem' }}>{schema.company_name || schema}</span>
                    <div className="d-flex gap-2">
                      <button
                        className={`btn btn-2-${theme}`}
                        onClick={() => handleUpdateSchema(schema.schema_name || schema)}
                        title="Atualizar Schema"
                      >
                        <i className="bi bi-arrow-clockwise"></i>
                      </button>
                      <button
                        className={`btn btn-2-${theme}`}
                        onClick={() => toggleLimitsPanel(schema)}
                        title="Configurar Limitadores"
                      >
                        <i className="bi bi-shield-lock"></i>
                      </button>
                      <button
                        className={`btn btn-2-${theme}`}
                        onClick={() => handleEnterSchema(schema)}
                      >
                        Entrar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          {selectedSchema && (
            <div className={`alert alert-success mt-3 bg-success-${theme}`}>
              Schema selecionado: <strong className={`header-text-${theme}`}>{selectedSchema}</strong>
            </div>
          )}
        </div>
        {/* Novo Schema */}
        <div
          className={`bg-form-${theme} rounded shadow p-4 d-flex flex-column align-items-center justify-content-center d-none new-schema-panel`}
          style={{
            width: '30%',
            minWidth: 320,
            gap: '1.5rem',
            alignSelf: 'center',
            height: '75%'
          }}
        >
          <div className="w-100 d-flex justify-content-between align-items-center mb-2">
            <h3 className={`header-text-${theme} m-0`} style={{fontWeight: 600, fontSize: '1.3rem'}}>Novo Schema</h3>
            <button
              className={`btn btn-2-${theme}`}
              onClick={() => toggleNewSchemaPanel(false)}
              aria-label="Fechar painel novo schema"
              style={{ border: 'none' }}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          <form onSubmit={handleCreateSchema} className="w-100 d-flex flex-column gap-3">
  <div className="input-group">
    <span className={`input-group-text igt-${theme}`}><i className="bi bi-diagram-3"></i></span>
    <input
      type="text"
      className={`form-control input-${theme}`}
      placeholder="Nome do Schema"
      value={newSchema.schema_name}
      onChange={e => setNewSchema({ ...newSchema, schema_name: e.target.value })}
      required
    />
  </div>
            <div className="input-group">
              <span className={`input-group-text igt-${theme}`}><i className="bi bi-briefcase"></i></span>
              <input
                type="text"
                className={`form-control input-${theme}`}
                placeholder="Nome da Empresa"
                value={newSchema.name}
                onChange={e => setNewSchema({...newSchema, name: e.target.value})}
                required
              />
            </div>
  <div className="input-group">
    <span className={`input-group-text igt-${theme}`}><i className="bi bi-person"></i></span>
    <input
      type="text"
      className={`form-control input-${theme}`}
      placeholder="Nome do Admin"
      value={newSchema.superAdmin.name}
      onChange={e => setNewSchema({ ...newSchema, superAdmin: { ...newSchema.superAdmin, name: e.target.value } })}
      required
    />
  </div>
  <div className="input-group">
    <span className={`input-group-text igt-${theme}`}><i className="bi bi-envelope"></i></span>
    <input
      type="email"
      className={`form-control input-${theme}`}
      placeholder="Email do Admin"
      value={newSchema.superAdmin.email}
      onChange={e => setNewSchema({ ...newSchema, superAdmin: { ...newSchema.superAdmin, email: e.target.value } })}
      required
    />
  </div>
  <div className="input-group">
    <span className={`input-group-text igt-${theme}`}><i className="bi bi-key"></i></span>
    <input
      type="password"
      className={`form-control input-${theme}`}
      placeholder="Senha do Admin"
      value={newSchema.superAdmin.password}
      onChange={e => setNewSchema({ ...newSchema, superAdmin: { ...newSchema.superAdmin, password: e.target.value } })}
      required
    />
  </div>
  <button type="submit" className={`btn btn-1-${theme} w-100`}>
    Criar Schema
  </button>
</form>
        </div>
      </div>

      {/* Painel de Limitadores */}
      {showLimitsPanel && (
        <div 
          className="limits-panel"
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '400px',
            height: '100vh',
            backgroundColor: `var(--bg-color-${theme})`,
            borderLeft: `1px solid var(--border-color-${theme})`,
            zIndex: 1000,
            padding: '20px',
            overflowY: 'auto',
            boxShadow: '-5px 0 15px rgba(0,0,0,0.1)'
          }}
        >
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 className={`header-text-${theme} m-0`} style={{fontWeight: 600, fontSize: '1.3rem'}}>
              <i className="bi bi-shield-lock me-2"></i>
              Configurar Limitadores
            </h3>
            <button
              className={`btn btn-2-${theme}`}
              onClick={toggleLimitsPanel}
              aria-label="Fechar painel de limitadores"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          {/* Seleção de Schemas */}
          <div className="mb-4">
            <h5 className={`header-text-${theme} mb-3`}>Schema Selecionado:</h5>
            <div style={{ border: `1px solid var(--border-color-${theme})`, borderRadius: '8px', padding: '10px', backgroundColor: `var(--hover-${theme})` }}>
              {selectedSchemasForLimits.map((schemaName, index) => {
                const schema = schemas.find(s => (s.schema_name || s) === schemaName);
                return (
                  <div key={index} className="d-flex align-items-center justify-content-between">
                    <span className={`header-text-${theme} fw-semibold`}>
                      {schema?.company_name || schema?.empresa || schemaName}
                    </span>
                    <button
                      className={`btn btn-sm btn-2-${theme}`}
                      onClick={() => setSelectedSchemasForLimits([])}
                      title="Remover schema"
                    >
                      <i className="bi bi-x"></i>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Estado de Carregamento */}
          {loadingLimits && (
            <div className="text-center mb-4">
              <div className={`spinner-border text-${theme}`} role="status">
                <span className="visually-hidden">Carregando...</span>
              </div>
              <p className={`header-text-${theme} mt-2`}>Carregando limitadores...</p>
            </div>
          )}

          {/* Mensagem quando não há limitadores */}
          {!loadingLimits && !currentSchemaLimits && (
            <div className={`alert alert-info mb-4 bg-info-${theme}`}>
              <div className="d-flex align-items-center">
                <i className="bi bi-info-circle me-2"></i>
                <div>
                  <strong className={`header-text-${theme}`}>Ainda não há limitadores configurados!</strong>
                  <p className={`header-text-${theme} mb-0 mt-1`}>
                    Configure os limitadores abaixo para este schema.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mensagem quando não há limitadores */}
          {!loadingLimits && limits.length === 0 && (
            <div className={`alert alert-info mb-4 bg-info-${theme}`}>
              <div className="d-flex align-items-center">
                <i className="bi bi-info-circle me-2"></i>
                <div>
                  <strong className={`header-text-${theme}`}>Ainda não há limitadores configurados!</strong>
                  <p className={`header-text-${theme} mb-0 mt-1`}>
                    Crie seus limitadores personalizados abaixo.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Adicionar Novo Limitador */}
          <div className="mb-4">
            <h5 className={`header-text-${theme} mb-3`}>Adicionar Novo Limitador:</h5>
            <div className="row g-2">
              <div className="col-md-4">
                <input
                  type="text"
                  className={`form-control input-${theme}`}
                  placeholder="Nome do limitador"
                  value={newLimit.name}
                  onChange={(e) => setNewLimit({...newLimit, name: e.target.value})}
                />
              </div>
              <div className="col-md-3">
                <input
                  type="number"
                  className={`form-control input-${theme}`}
                  placeholder="Quantidade (opcional)"
                  value={newLimit.quantity}
                  onChange={(e) => setNewLimit({...newLimit, quantity: e.target.value})}
                />
              </div>
              <div className="col-md-3">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="newLimitToggle"
                    checked={newLimit.is_on}
                    onChange={(e) => setNewLimit({...newLimit, is_on: e.target.checked})}
                  />
                  <label className={`form-check-label header-text-${theme}`} htmlFor="newLimitToggle">
                    Ativo
                  </label>
                </div>
              </div>
              <div className="col-md-2">
                <button
                  type="button"
                  className={`btn btn-1-${theme} w-100`}
                  onClick={addNewLimit}
                  disabled={!newLimit.name.trim()}
                >
                  <i className="bi bi-plus"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Lista de Limitadores */}
          {limits.length > 0 && (
            <div className="mb-4">
              <h5 className={`header-text-${theme} mb-3`}>Limitadores Configurados:</h5>
              <div className="d-flex flex-column gap-2">
                {limits.map((limit, index) => (
                  <div key={index} className={`card card-${theme} p-3`}>
                    <div className="row align-items-center">
                      <div className="col-md-4">
                        <strong className={`header-text-${theme}`}>{limit.name}</strong>
                      </div>
                      <div className="col-md-3">
                        <input
                          type="number"
                          className={`form-control form-control-sm input-${theme}`}
                          placeholder="Quantidade"
                          value={limit.quantity || ''}
                          onChange={(e) => updateLimit(index, 'quantity', e.target.value)}
                        />
                      </div>
                      <div className="col-md-3">
                        <div className="form-check form-switch">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={limit.is_on}
                            onChange={(e) => updateLimit(index, 'is_on', e.target.checked)}
                          />
                          <label className={`form-check-label header-text-${theme}`}>
                            {limit.is_on ? 'Ativo' : 'Inativo'}
                          </label>
                        </div>
                      </div>
                      <div className="col-md-2">
                        <button
                          type="button"
                          className={`btn btn-sm btn-danger`}
                          onClick={() => removeLimit(index)}
                          title="Remover limitador"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="d-flex gap-2">
            <button
              type="button"
              className={`btn btn-1-${theme} flex-fill`}
              onClick={handleLimitsSubmit}
              disabled={loadingLimits}
            >
              Salvar Limitadores
            </button>
            <button
              type="button"
              className={`btn btn-2-${theme}`}
              onClick={toggleLimitsPanel}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SchemasPage;