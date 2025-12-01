import React, { useState } from 'react';
import axios from 'axios';

function RelatorioPage({ theme }) {
  const [loadingIfood, setLoadingIfood] = useState(false);
  const [exportingIfoodJson, setExportingIfoodJson] = useState(false);
  const url = process.env.REACT_APP_URL;

  const handleDownloadIfoodReport = async () => {
    try {
      setLoadingIfood(true);
      const response = await axios.get(`${url}/ifood/pedidos-semana`, {
        responseType: 'blob',
        withCredentials: true
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const urlDownload = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlDownload;
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'pedidos_ifood.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(urlDownload);
    } catch (error) {
      console.error('Erro ao baixar relatório do iFood:', error);
      alert('Erro ao gerar relatório. Por favor, tente novamente.');
    } finally {
      setLoadingIfood(false);
    }
  };

  const handleExportIfoodJson = async () => {
    try {
      setExportingIfoodJson(true);
      const response = await axios.post(
        `${url}/ifood/sales`,
        {},
        {
          withCredentials: true,
        }
      );

      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: "application/json",
      });

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", "ifood-sales.json");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      alert("Erro ao exportar vendas. Tente novamente.");
    } finally {
      setExportingIfoodJson(false);
    }
  };

  return (
    <div className="h-100 w-100 mx-2">
      <div className="d-flex justify-content-end align-items-center mb-3">
        <div className="d-flex gap-2">
          <button 
            className="btn btn-primary"
            onClick={handleDownloadIfoodReport}
            disabled={loadingIfood}
          >
            {loadingIfood ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                Gerando...
              </>
            ) : (
              <>
                <i className="bi bi-bag-check-fill me-1"></i> Relatório iFood (Última Semana)
              </>
            )}
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={handleExportIfoodJson}
            disabled={exportingIfoodJson}
          >
            {exportingIfoodJson ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-1"
                  role="status"
                  aria-hidden="true"
                ></span>
                Exportando...
              </>
            ) : (
              <>
                <i className="bi bi-cloud-download-fill me-1"></i>
                Exportar JSON iFood
              </>
            )}
          </button>
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