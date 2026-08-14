import React from 'react';

// Última linha de defesa: um erro de renderização em qualquer tela
// mostrava página branca sem explicação. Aqui viram uma tela de recuperação.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Erro de renderização capturado:', error, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: '100vh', gap: 16, padding: 24, textAlign: 'center' }}>
        <i className="bi bi-exclamation-triangle" style={{ fontSize: 48, color: '#dc3545' }}></i>
        <h4>Algo deu errado nesta tela</h4>
        <p className="text-muted" style={{ maxWidth: 480 }}>
          O erro foi registrado. Recarregue a página para continuar — se acontecer de novo,
          avise o suporte informando o que você estava fazendo.
        </p>
        <div className="d-flex gap-2">
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Recarregar página
          </button>
          <button className="btn btn-outline-secondary" onClick={() => { window.location.href = '/painel'; }}>
            Ir para o painel
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
