import React from 'react';

const Manutencao = ({ theme }) => {
  return (
    <div className="container d-flex flex-column align-items-center justify-content-top mt-5" style={{ minHeight: '80vh' }}>
      <i className="bi bi-tools" style={{ fontSize: '5rem', color: 'var(--primary-color)' }}></i>
      <div className={`card card-${theme} shadow-sm mt-4`} style={{ maxWidth: '600px', width: '100%' }}>
        <div className="card-body text-center p-4">
          <h2 className={`card-title mb-3 header-text-${theme}`}>Página em Desenvolvimento</h2>
          <p className={`card-text header-text-${theme} mb-2`}>
            Estamos trabalhando assiduamente para trazer atualizações.
          </p>
          <p className={`card-text header-text-${theme}`}>
            Em breve, esta página estará disponível com todas as funcionalidades planejadas.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Manutencao; 