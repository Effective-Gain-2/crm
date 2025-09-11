function RelatorioPage({ theme }) {
  return (
    <div className="h-100 w-100 mx-2">
      <div className="d-flex justify-content-end align-items-center mb-3">
        <div className="d-flex gap-2">
          <button className="btn btn-danger">
            <i className="bi bi-file-earmark-pdf-fill me-1"></i> Baixar PDF
          </button>
          <button className="btn btn-success">
            <i className="bi bi-file-earmark-excel-fill me-1"></i> Baixar Excel
          </button>
        </div>
      </div>

      <div className={`table-responsive custom-table-${theme}`}>
        <table className="table table-bordered table-hover m-0">
          <thead>
            <tr>
              <th>Nome do Cliente</th>
              <th>Telefone</th>
              <th>Resumo da Conversa (IA)</th>
              <th>Interação Humana</th>
              <th>Assertividade</th>
              <th>Ticket Finalizado</th>
              <th>Próxima Etapa (IA)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Ana Souza</td>
              <td>(11) 91234-5678</td>
              <td>Cliente demonstrou interesse no plano premium. Solicitou mais detalhes.</td>
              <td>Sim</td>
              <td>Alta</td>
              <td>Sim</td>
              <td>Enviar proposta por e-mail</td>
            </tr>
            <tr>
              <td>Lucas Lima</td>
              <td>(21) 99876-5432</td>
              <td>Cliente teve dúvidas sobre formas de pagamento.</td>
              <td>Não</td>
              <td>Média</td>
              <td>Não</td>
              <td>Agendar ligação de suporte</td>
            </tr>
            {/* Adicione mais linhas de relatórios aqui */}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RelatorioPage;