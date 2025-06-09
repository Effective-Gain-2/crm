import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import logo from './assets/effective-gain_logo.png';
import { useTheme } from './assets/js/useTheme';

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

  const url = process.env.REACT_APP_URL;
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  useEffect(() => {
    async function fetchSchemas() {
      try {
        const response = await axios.get(`${url}/company/tecnico`);
        setSchemas(Array.isArray(response.data) ? response.data : response.data.empresas || []);
      } catch (error) {
        console.error('Erro ao buscar schemas:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSchemas();
  }, [url]);

  const handleEnterSchema = (schema) => {
    const userData = JSON.parse(localStorage.getItem('user')) || {};
    userData.schema = schema.schema_name || schema;
    userData.empresa = schema.company_name || schema.empresa || '';
    localStorage.setItem('user', JSON.stringify(userData));
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
    await axios.post(`${url}/company/company`, newSchema);
    const response = await axios.get(`${url}/company/tecnico`);
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

  const toggleNewSchemaPanel = (show) => {
    const panel = document.querySelector('.new-schema-panel');
    if (show) {
      panel.classList.remove('d-none');
    } else {
      panel.classList.add('d-none');
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
                <div className="text-center text-muted">Nenhum resultado encontrado</div>
              ) : (
                filteredSchemas.map((schema) => (
                  <div
                    key={schema.schema_name || schema}
                    className={`card-${theme} d-flex flex-row align-items-center justify-content-between rounded shadow-sm px-4 py-3`}
                  >
                    <span className={`header-text-${theme} fw-semibold`} style={{ fontSize: '1.1rem' }}>{schema.company_name || schema}</span>
                    <button
                      className={`btn btn-2-${theme}`}
                      onClick={() => handleEnterSchema(schema)}
                    >
                      Entrar
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
          {selectedSchema && (
            <div className="alert alert-success mt-3">
              Schema selecionado: <strong>{selectedSchema}</strong>
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
    </div>
  );
}

export default SchemasPage;