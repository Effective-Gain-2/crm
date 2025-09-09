import React, { useState, useEffect } from 'react';
import { useTheme } from './assets/js/useTheme';

function AjudaPage({ theme }) {
  const [activeSection, setActiveSection] = useState('chats');
  const [visibleSections, setVisibleSections] = useState({});
  const [userRole, setUserRole] = useState('');

  // Verificar role do usuário
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData && userData.role) {
      setUserRole(userData.role);
    }
  }, []);

  // Verificar quais botões estão visíveis na sidebar
  useEffect(() => {
    const checkVisibleButtons = () => {
      const sections = {
        dashboard: 'dashboard',
        chats: 'chats',
        kanban: 'kanban',
        filas: 'filas',
        disparos: 'disparos',
        usuarios: 'usuarios',
        whatsapp: 'whatsapp',
        lembretes: 'lembretes',
        relatorios: 'relatorios',
        insights: 'insights',
        chatinterno: 'chatinterno'
      };

      const visible = {};
      
      Object.entries(sections).forEach(([key, id]) => {
        const element = document.getElementById(id);
        if (element) {
          // Verificar se o elemento está visível (não tem d-none)
          const isVisible = !element.classList.contains('d-none') && 
                           element.style.display !== 'none' &&
                           element.offsetParent !== null;
          visible[key] = isVisible;
        }
      });

      setVisibleSections(visible);
      
      // Se a seção ativa não estiver visível E não for a seção técnica, mudar para a primeira visível
      if (!visible[activeSection] && activeSection !== 'tecinfo') {
        const firstVisible = Object.keys(visible).find(key => visible[key]);
        if (firstVisible) {
          setActiveSection(firstVisible);
        }
      }
    };

    // Verificar imediatamente
    checkVisibleButtons();

    // Verificar quando a sidebar mudar
    const observer = new MutationObserver(checkVisibleButtons);
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      observer.observe(sidebar, { 
        childList: true, 
        subtree: true, 
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    }

    return () => observer.disconnect();
  }, [activeSection]);

  const sections = {
    dashboard: {
      title: 'Dashboard',
      icon: 'bi-speedometer2',
      content: (
        <div>
          <h5 className={`header-text-${theme} mb-3`}>Visão Geral do Sistema</h5>
          <p className={`header-text-${theme}`}>
            O Dashboard é sua página inicial, fornecendo uma visão geral das atividades do sistema:
          </p>
          <ul className={`header-text-${theme}`}>
            <li>Estatísticas de atendimento</li>
            <li>Gráficos de performance</li>
            <li>Alertas e notificações importantes</li>
            <li>Resumo das atividades recentes</li>
          </ul>
          <div className="mt-4">
            <h6 className={`header-text-${theme}`}>Como Usar:</h6>
            <ul className={`header-text-${theme}`}>
              <li>Os cards mostram informações em tempo real</li>
              <li>Clique nos gráficos para ver mais detalhes</li>
              <li>Use os filtros no topo para ajustar o período</li>
              <li>As notificações importantes aparecem em destaque</li>
            </ul>
          </div>
        </div>
      )
    },
    chats: {
      title: 'Chats',
      icon: 'bi-chat-dots',
      content: (
        <div>
          <h5 className={`header-text-${theme} mb-3`}>Gerenciamento de Conversas</h5>
          <p className={`header-text-${theme}`}>
            A seção de Chats permite gerenciar todas as conversas do WhatsApp:
          </p>
          <ul className={`header-text-${theme}`}>
            <li>Visualizar conversas ativas</li>
            <li>Responder mensagens</li>
            <li>Enviar arquivos e mídia</li>
            <li>Gerenciar contatos</li>
            <li>Histórico de conversas</li>
          </ul>
          <div className="mt-4">
            <h6 className={`header-text-${theme}`}>Como Usar:</h6>
            <ul className={`header-text-${theme}`}>
              <li><strong>Iniciar Conversa:</strong> Clique no botão "Nova Conversa" e selecione um contato</li>
              <li><strong>Responder Mensagem:</strong> Selecione a conversa e use o campo de texto na parte inferior</li>
              <li><strong>Enviar Arquivo:</strong> Use o botão de anexo (clipe) para enviar imagens, documentos ou áudios</li>
              <li><strong>Transferir Atendimento:</strong> Use o botão de transferência para enviar a conversa para outra fila</li>
              <li><strong>Finalizar Atendimento:</strong> Clique no botão de encerrar para concluir o atendimento</li>
            </ul>
          </div>
        </div>
      )
    },
    kanban: {
      title: 'Kanban',
      icon: 'bi-kanban',
      content: (
        <div>
          <h5 className={`header-text-${theme} mb-3`}>Gestão de Tarefas</h5>
          <p className={`header-text-${theme}`}>
            O Kanban é uma ferramenta visual para gerenciar tarefas e fluxos de trabalho:
          </p>
          <ul className={`header-text-${theme}`}>
            <li>Organizar tarefas em colunas (A Fazer, Em Andamento, Concluído)</li>
            <li>Arrastar e soltar cards entre colunas</li>
            <li>Atribuir tarefas a membros da equipe</li>
            <li>Definir prazos e prioridades</li>
            <li>Acompanhar o progresso das atividades</li>
          </ul>
          <div className="mt-4">
            <h6 className={`header-text-${theme}`}>Como Usar:</h6>
            <ul className={`header-text-${theme}`}>
              <li><strong>Criar Tarefa:</strong> Clique no botão "+" na coluna desejada</li>
              <li><strong>Mover Tarefa:</strong> Arraste o card para outra coluna</li>
              <li><strong>Editar Tarefa:</strong> Clique no card para abrir os detalhes</li>
              <li><strong>Filtrar Tarefas:</strong> Use os filtros no topo para encontrar tarefas específicas</li>
              <li><strong>Atribuir Tarefa:</strong> No modal de edição, selecione o responsável</li>
            </ul>
          </div>
        </div>
      )
    },
    filas: {
      title: 'Filas',
      icon: 'bi-diagram-3',
      content: (
        <div>
          <h5 className={`header-text-${theme} mb-3`}>Gestão de Filas de Atendimento</h5>
          <p className={`header-text-${theme}`}>
            As Filas organizam o atendimento por departamentos ou setores:
          </p>
          <ul className={`header-text-${theme}`}>
            <li>Criar e gerenciar filas de atendimento</li>
            <li>Distribuir conversas entre atendentes</li>
            <li>Definir regras de roteamento</li>
            <li>Monitorar tempo de espera</li>
            <li>Analisar desempenho das filas</li>
          </ul>
          <div className="mt-4">
            <h6 className={`header-text-${theme}`}>Como Usar:</h6>
            <ul className={`header-text-${theme}`}>
              <li><strong>Visualizar Fila:</strong> Selecione a fila desejada no menu lateral</li>
              <li><strong>Atender Conversa:</strong> Clique em uma conversa para iniciar o atendimento</li>
              <li><strong>Transferir Conversa:</strong> Use o botão de transferência para mudar a fila</li>
              <li><strong>Monitorar Métricas:</strong> Veja os indicadores no topo da página</li>
              <li><strong>Gerenciar Atendentes:</strong> Use o modal de configurações para adicionar/remover atendentes</li>
            </ul>
          </div>
        </div>
      )
    },
    disparos: {
      title: 'Disparos',
      icon: 'bi-megaphone',
      content: (
        <div>
          <h5 className={`header-text-${theme} mb-3`}>Campanhas e Mensagens em Massa</h5>
          <p className={`header-text-${theme}`}>
            A seção de Disparos permite gerenciar campanhas e mensagens em massa:
          </p>
          <ul className={`header-text-${theme}`}>
            <li>Criar campanhas de mensagens</li>
            <li>Agendar disparos</li>
            <li>Gerenciar listas de contatos</li>
            <li>Acompanhar status dos envios</li>
            <li>Relatórios de campanhas</li>
          </ul>
          <div className="mt-4">
            <h6 className={`header-text-${theme}`}>Como Usar:</h6>
            <ul className={`header-text-${theme}`}>
              <li><strong>Nova Campanha:</strong> Clique no botão "Nova Campanha" e preencha os dados</li>
              <li><strong>Importar Contatos:</strong> Use o botão de importação para adicionar contatos</li>
              <li><strong>Agendar Disparo:</strong> No modal de campanha, defina a data e hora</li>
              <li><strong>Monitorar Envios:</strong> Acompanhe o progresso na lista de campanhas</li>
              <li><strong>Cancelar Campanha:</strong> Use o botão de cancelamento para interromper envios</li>
            </ul>
          </div>
        </div>
      )
    },
    usuarios: {
      title: 'Usuários',
      icon: 'bi-people',
      content: (
        <div>
          <h5 className={`header-text-${theme} mb-3`}>Gestão de Usuários</h5>
          <p className={`header-text-${theme}`}>
            Gerencie os usuários e suas permissões no sistema:
          </p>
          <ul className={`header-text-${theme}`}>
            <li>Adicionar e remover usuários</li>
            <li>Definir níveis de acesso (Admin, Superuser, User)</li>
            <li>Gerenciar permissões por setor</li>
            <li>Monitorar atividades dos usuários</li>
            <li>Configurar preferências individuais</li>
          </ul>
          <div className="mt-4">
            <h6 className={`header-text-${theme}`}>Níveis de Acesso:</h6>
            <ul className={`header-text-${theme}`}>
              <li><strong>Admin:</strong> Acesso total ao sistema, pode gerenciar usuários e configurações</li>
              <li><strong>Superuser:</strong> Acesso avançado, pode gerenciar setores e relatórios</li>
              <li><strong>User:</strong> Acesso básico para operações do dia a dia</li>
            </ul>
            <h6 className={`header-text-${theme} mt-3`}>Como Usar:</h6>
            <ul className={`header-text-${theme}`}>
              <li><strong>Adicionar Usuário:</strong> Clique em "Novo Usuário" e preencha o formulário</li>
              <li><strong>Editar Permissões:</strong> Selecione o usuário e use o modal de edição</li>
              <li><strong>Desativar Usuário:</strong> Use o botão de desativação no modal de edição</li>
              <li><strong>Resetar Senha:</strong> Disponível no modal de edição do usuário</li>
            </ul>
          </div>
        </div>
      )
    },
    whatsapp: {
      title: 'WhatsApp',
      icon: 'bi-whatsapp',
      content: (
        <div>
          <h5 className={`header-text-${theme} mb-3`}>Configurações do WhatsApp</h5>
          <p className={`header-text-${theme}`}>
            Gerencie as configurações da integração com WhatsApp:
          </p>
          <ul className={`header-text-${theme}`}>
            <li>Conectar dispositivos</li>
            <li>Gerenciar números de telefone</li>
            <li>Definir horários de atendimento</li>
            <li>Monitorar status da conexão</li>
          </ul>
          <div className="mt-4">
            <h6 className={`header-text-${theme}`}>Como Usar:</h6>
            <ul className={`header-text-${theme}`}>
              <li><strong>Conectar Dispositivo:</strong> Abra o modal de WhatsApp e escaneie o QR Code</li>
              <li><strong>Verificar Status:</strong> O indicador no topo mostra o estado da conexão</li>
              <li><strong>Gerenciar Números:</strong> No modal de configurações, adicione ou remova números</li>
              <li><strong>Definir Horário:</strong> Configure os horários de atendimento no modal de configurações</li>
            </ul>
          </div>
        </div>
      )
    },
    lembretes: {
      title: 'Lembretes',
      icon: 'bi-bell',
      content: (
        <div>
          <h5 className={`header-text-${theme} mb-3`}>Sistema de Lembretes</h5>
          <p className={`header-text-${theme}`}>
            Organize e gerencie lembretes e tarefas importantes:
          </p>
          <ul className={`header-text-${theme}`}>
            <li>Criar lembretes gerais, setoriais ou pessoais</li>
            <li>Visualizar calendário de lembretes</li>
            <li>Definir notificações</li>
            <li>Gerenciar permissões por tipo de lembrete</li>
            <li>Receber alertas por toast notifications</li>
          </ul>
          <div className="mt-3">
            <h6 className={`header-text-${theme}`}>Tipos de Lembretes:</h6>
            <ul className={`header-text-${theme}`}>
              <li><strong>Geral:</strong> Visível para todos os usuários (Admin)</li>
              <li><strong>Setorial:</strong> Visível para setores específicos (Admin e Superuser)</li>
              <li><strong>Pessoal:</strong> Visível apenas para o criador (Todos os usuários)</li>
            </ul>
          </div>
          <div className="mt-4">
            <h6 className={`header-text-${theme}`}>Como Usar:</h6>
            <ul className={`header-text-${theme}`}>
              <li><strong>Criar Lembrete:</strong> Clique em "Novo Lembrete" e preencha o formulário</li>
              <li><strong>Visualizar Calendário:</strong> Use a visualização mensal para ver todos os lembretes</li>
              <li><strong>Editar Lembrete:</strong> Clique no lembrete na lista ou no calendário</li>
              <li><strong>Excluir Lembrete:</strong> Use o botão de exclusão no modal de edição</li>
              <li><strong>Testar Notificação:</strong> Use o botão "Testar Lembrete" para verificar as notificações</li>
            </ul>
          </div>
        </div>
      )
    },
    relatorios: {
      title: 'Relatórios',
      icon: 'bi-bar-chart-line',
      content: (
        <div>
          <h5 className={`header-text-${theme} mb-3`}>Relatórios e Análises</h5>
          <p className={`header-text-${theme}`}>
            Acesse relatórios detalhados e análises do sistema:
          </p>
          <ul className={`header-text-${theme}`}>
            <li>Relatórios de atendimento</li>
            <li>Métricas de performance</li>
            <li>Análise de filas</li>
            <li>Estatísticas de usuários</li>
            <li>Exportação de dados</li>
          </ul>
          <div className="mt-4">
            <h6 className={`header-text-${theme}`}>Como Usar:</h6>
            <ul className={`header-text-${theme}`}>
              <li><strong>Gerar Relatório:</strong> Selecione o tipo de relatório e período desejado</li>
              <li><strong>Filtrar Dados:</strong> Use os filtros para refinar as informações</li>
              <li><strong>Exportar:</strong> Use o botão de exportação para baixar em diferentes formatos</li>
              <li><strong>Visualizar Gráficos:</strong> Interaja com os gráficos para ver mais detalhes</li>
              <li><strong>Salvar Configurações:</strong> Salve suas preferências de relatório para uso futuro</li>
            </ul>
          </div>
        </div>
      )
    },
    insights: {
      title: 'Insights',
      icon: 'bi-rocket',
      content: (
        <div>
          <h5 className={`header-text-${theme} mb-3`}>Inteligência Artificial e Análise Avançada</h5>
          <p className={`header-text-${theme}`}>
            A seção de Insights utiliza modelos de Inteligência Artificial para analisar dados do seu negócio e oferecer 
            recomendações estratégicas baseadas em padrões identificados:
          </p>
          <ul className={`header-text-${theme}`}>
            <li><strong>Análise Preditiva:</strong> Previsão de tendências e comportamentos futuros baseados em dados históricos</li>
            <li><strong>Segmentação Avançada:</strong> Identificação automática de padrões e grupos de clientes</li>
            <li><strong>Recomendações Inteligentes:</strong> Sugestões de ações baseadas em análise de dados</li>
            <li><strong>Detecção de Anomalias:</strong> Identificação automática de comportamentos fora do padrão</li>
            <li><strong>Análise de Sentimento:</strong> Avaliação automática do sentimento das conversas</li>
          </ul>
          <div className="mt-4">
            <h6 className={`header-text-${theme}`}>Como Usar:</h6>
            <ul className={`header-text-${theme}`}>
              <li><strong>Explorar Previsões:</strong> Acesse as análises preditivas para diferentes métricas</li>
              <li><strong>Configurar Alertas:</strong> Defina gatilhos para notificações baseadas em IA</li>
              <li><strong>Personalizar Modelos:</strong> Ajuste os parâmetros de análise para seu negócio</li>
              <li><strong>Exportar Insights:</strong> Baixe relatórios detalhados das análises de IA</li>
              <li><strong>Compartilhar Descobertas:</strong> Envie insights relevantes para sua equipe</li>
            </ul>
          </div>
        </div>
      )
    },
    chatinterno: {
      title: 'Chat Interno',
      icon: 'bi-chat-left-text',
      content: (
        <div>
          <h5 className={`header-text-${theme} mb-3`}>Comunicação Interna</h5>
          <p className={`header-text-${theme}`}>
            O Chat Interno permite comunicação entre membros da equipe:
          </p>
          <ul className={`header-text-${theme}`}>
            <li>Mensagens instantâneas entre usuários</li>
            <li>Criação de grupos de trabalho</li>
            <li>Compartilhamento de arquivos</li>
            <li>Notificações em tempo real</li>
            <li>Histórico de conversas</li>
          </ul>
          <div className="mt-4">
            <h6 className={`header-text-${theme}`}>Como Usar:</h6>
            <ul className={`header-text-${theme}`}>
              <li><strong>Iniciar Conversa:</strong> Selecione um usuário da lista para iniciar uma conversa</li>
              <li><strong>Criar Grupo:</strong> Use o botão "Novo Grupo" para criar salas de discussão</li>
              <li><strong>Enviar Mensagem:</strong> Digite no campo de texto e pressione Enter</li>
              <li><strong>Compartilhar Arquivo:</strong> Use o botão de anexo para enviar documentos</li>
              <li><strong>Gerenciar Notificações:</strong> Configure suas preferências de notificação</li>
            </ul>
          </div>
        </div>
      )
    },
    // Seção especial para técnicos
    tecinfo: {
      title: 'Informações Técnicas',
      icon: 'bi-tools',
      content: (
        <div>
          <h5 className={`header-text-${theme} mb-3`}>Módulos Não Documentados</h5>
          <p className={`header-text-${theme}`}>
            Os seguintes módulos estão disponíveis na sidebar mas não possuem documentação completa na seção de ajuda:
          </p>
          
          <div className="mt-4">
            <h6 className={`header-text-${theme}`}>Módulos Disponíveis na Sidebar:</h6>
            <ul className={`header-text-${theme}`}>
              <li><strong>Dashboard:</strong> Visão geral do sistema com métricas em tempo real</li>
              <li><strong>Relatórios:</strong> Geração de relatórios detalhados e análises</li>
              <li><strong>Insights:</strong> Análise avançada com inteligência artificial</li>
              <li><strong>Chat Interno:</strong> Sistema de comunicação interna entre usuários</li>
            </ul>
          </div>
        </div>
      )
    }
  };

  // Filtrar apenas as seções visíveis
  let visibleSectionsList = Object.entries(sections).filter(([key]) => visibleSections[key]);

  // Adicionar seção técnica se o usuário for técnico
  if (userRole === 'tecnico') {
    visibleSectionsList.push(['tecinfo', sections.tecinfo]);
  }

  return (
    <div className="h-100 w-100">
      <div className="d-flex flex-row gap-3 h-100">
        {/* Menu lateral */}
        <div style={{ width: '20%', minWidth: 175, maxWidth: 200 }} className={`bg-form-${theme} rounded p-3`}>
          <h2 className={`mb-3 ms-3 header-text-${theme}`} style={{ fontWeight: 400 }}>Ajuda</h2>

          <div className="d-flex flex-column gap-2 align-items-start">
            {visibleSectionsList.map(([key, section]) => (
              <button
                key={key}
                className={`btn ${activeSection === key ? `btn-1-${theme}` : `btn-2-${theme}`} d-flex align-items-center justify-content-center gap-2`}
                style={{ width: '100%' }}
                onClick={() => setActiveSection(key)}
              >
                <i className={`bi ${section.icon}`}></i>
                <span>{section.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo */}
        <div style={{ flex: 1 }} className={`bg-form-${theme} rounded p-4`}>
          <div className="d-flex align-items-center gap-2 mb-4">
            <i className={`bi ${sections[activeSection].icon} fs-4 header-text-${theme}`}></i>
            <h4 className={`header-text-${theme} m-0`}>{sections[activeSection].title}</h4>
          </div>
          {sections[activeSection].content}
        </div>
      </div>
    </div>
  );
}

export default AjudaPage; 