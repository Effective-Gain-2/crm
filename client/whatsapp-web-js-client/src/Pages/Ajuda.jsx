import React, { useState, useEffect } from 'react';
import { useTheme } from './assets/js/useTheme';
import axios from 'axios';


function AjudaPage({ theme }) {
  const [activeSection, setActiveSection] = useState('introducao');
  const [textos, setTextos] = useState([])
  
  const fetchTextos = useEffect(()=>{
    const fetchTextos = async () => {
      const response = await axios.get(`${process.env.REACT_APP_URL}/ajuda/get-textos`)
      setTextos(Array.isArray(response.data.result)?response.data.result:[response.data.result])
    }
    fetchTextos()
  },[])

  const sections = {
    introducao: {
      title: 'Introdução',
      icon: 'bi-play-circle',
      content: (
        <div className="d-flex gap-4">
          <div style={{ flex: 1 }}>
            <iframe 
              width="100%" 
              height="400" 
              src="https://www.youtube.com/embed/sQE56aC10S8" 
              title="Introdução ao CRM effectivegain" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              referrerPolicy="strict-origin-when-cross-origin" 
              allowFullScreen
              style={{ borderRadius: '8px' }}
            ></iframe>
          </div>
          <div style={{ flex: 1 }}>
            <h5 className={`header-text-${theme} mb-3`}>Área de Texto</h5>
            <p className={`header-text-${theme}`}>
              {textos.filter(t=>t.section==='introducao')[0]?.texto}
            </p>
          </div>
        </div>
      )
    },
    teoria: {
      title: 'Teoria',
      icon: 'bi-book',
      content: (
        <div className="d-flex gap-4">
          <div style={{ flex: 1 }}>
            <iframe 
              width="100%" 
              height="400" 
              src="https://www.youtube.com/embed/ZP5lqRBKgqI" 
              title="Conteúdo Teórico do CRM da Effective Gain" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              referrerPolicy="strict-origin-when-cross-origin" 
              allowFullScreen
              style={{ borderRadius: '8px' }}
            ></iframe>
          </div>
          <div style={{ flex: 1 }}>
            <h5 className={`header-text-${theme} mb-3`}>Área de Texto</h5>
            <p className={`header-text-${theme}`}>
              {textos.filter(t=>t.section==='teoria')[0]?.texto || 'Conteúdo não disponível para Teoria.'}
            </p>
          </div>
        </div>
      )
    },
    pratica: {
      title: 'Prática Geral',
      icon: 'bi-gear',
      content: (
        <div className="d-flex gap-4">
          <div style={{ flex: 1 }}>
            <iframe 
              width="100%" 
              height="400" 
              src="https://www.youtube.com/embed/y_bgG7Us95U" 
              title="Prática do CRM da Effective Gain" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              referrerPolicy="strict-origin-when-cross-origin" 
              allowFullScreen
              style={{ borderRadius: '8px' }}
            ></iframe>
          </div>
          <div style={{ flex: 1 }}>
            <h5 className={`header-text-${theme} mb-3`}>Área de Texto</h5>
            <p className={`header-text-${theme}`}>
              {textos.filter(t=>t.section==='pratica')[0]?.texto || 'Conteúdo não disponível para Prática Geral.'}
            </p>
          </div>
        </div>
      )
    },
    filas: {
      title: 'Filas',
      icon: 'bi-diagram-3',
      content: (
        <div className="d-flex gap-4">
          <div style={{ flex: 1 }}>
            <iframe 
              width="100%" 
              height="400" 
              src="https://www.youtube.com/embed/Tr5TPKa_4bs" 
              title="Tutorial das Filas no CRM Effective Gain" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              referrerPolicy="strict-origin-when-cross-origin" 
              allowFullScreen
              style={{ borderRadius: '8px' }}
            ></iframe>
          </div>
          <div style={{ flex: 1 }}>
            <h5 className={`header-text-${theme} mb-3`}>Área de Texto</h5>
            <p className={`header-text-${theme}`}>
              {textos.filter(t=>t.section==='filas')[0]?.texto || 'Conteúdo não disponível para Filas.'}
            </p>
          </div>
        </div>
      )
    },
    usuarios: {
      title: 'Usuários',
      icon: 'bi-people',
      content: (
        <div className="d-flex gap-4">
          <div style={{ flex: 1 }}>
            <iframe 
              width="100%" 
              height="400" 
              src="https://www.youtube.com/embed/vBQIrv2YQqk" 
              title="Criação dos Usuários no CRM da Effective Gain" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              referrerPolicy="strict-origin-when-cross-origin" 
              allowFullScreen
              style={{ borderRadius: '8px' }}
            ></iframe>
          </div>
          <div style={{ flex: 1 }}>
            <h5 className={`header-text-${theme} mb-3`}>Área de Texto</h5>
            <p className={`header-text-${theme}`}>
              {textos.filter(t=>t.section==='usuarios')[0]?.texto || 'Conteúdo não disponível para Usuários.'}
            </p>
          </div>
        </div>
      )
    },
    whatsapp: {
      title: 'Conexão WhatsApp',
      icon: 'bi-whatsapp',
      content: (
        <div className="d-flex gap-4">
          <div style={{ flex: 1 }}>
            <iframe 
              width="100%" 
              height="400" 
              src="https://www.youtube.com/embed/bVaST9oH_3U" 
              title="Conexões WhatsApp no CRM da Effective Gain" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              referrerPolicy="strict-origin-when-cross-origin" 
              allowFullScreen
              style={{ borderRadius: '8px' }}
            ></iframe>
          </div>
          <div style={{ flex: 1 }}>
            <h5 className={`header-text-${theme} mb-3`}>Área de Texto</h5>
            <p className={`header-text-${theme}`}>
              {textos.filter(t=>t.section==='conexao')[0]?.texto || 'Conteúdo não disponível para Conexão WhatsApp.'}
            </p>
          </div>
        </div>
      )
    },
    chats: {
      title: 'Chat',
      icon: 'bi-chat-dots',
      content: (
        <div className="d-flex gap-4">
          <div style={{ flex: 1 }}>
            <iframe 
              width="100%" 
              height="400" 
              src="https://www.youtube.com/embed/9OF2uMdD7v0" 
              title="Chat do CRM Effective Gain" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              referrerPolicy="strict-origin-when-cross-origin" 
              allowFullScreen
              style={{ borderRadius: '8px' }}
            ></iframe>
          </div>
          <div style={{ flex: 1 }}>
            <h5 className={`header-text-${theme} mb-3`}>Área de Texto</h5>
            <p className={`header-text-${theme}`}>
              {textos.filter(t=>t.section==='chat')[0]?.texto || 'Conteúdo não disponível para Chat.'}
            </p>
          </div>
        </div>
      )
    },
    conversas: {
      title: 'Conversas',
      icon: 'bi-chat-left-text',
      content: (
        <div className="d-flex gap-4">
          <div style={{ flex: 1 }}>
            <iframe 
              width="100%" 
              height="400" 
              src="https://www.youtube.com/embed/2dlOOkGzH1w" 
              title="Conversas" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              referrerPolicy="strict-origin-when-cross-origin" 
              allowFullScreen
              style={{ borderRadius: '8px' }}
            ></iframe>
          </div>
          <div style={{ flex: 1 }}>
            <h5 className={`header-text-${theme} mb-3`}>Área de Texto</h5>
            <p className={`header-text-${theme}`}>
              {textos.filter(t=>t.section==='conversas')[0]?.texto || 'Conteúdo não disponível para Conversas.'}
            </p>
          </div>
        </div>
      )
    },
    kanban: {
      title: 'Kanban',
      icon: 'bi-kanban',
      content: (
        <div className="d-flex gap-4">
          <div style={{ flex: 1 }}>
            <iframe 
              width="100%" 
              height="400" 
              src="https://www.youtube.com/embed/qVPsXZupU_k" 
              title="Kanban no CRM da Effective Gain" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              referrerPolicy="strict-origin-when-cross-origin" 
              allowFullScreen
              style={{ borderRadius: '8px' }}
            ></iframe>
          </div>
          <div style={{ flex: 1 }}>
            <h5 className={`header-text-${theme} mb-3`}>Área de Texto</h5>
            <p className={`header-text-${theme}`}>
              {textos.filter(t=>t.section==='kanban')[0]?.texto || 'Conteúdo não disponível para Kanban.'}
            </p>
          </div>
        </div>
      )
    },
    disparos: {
      title: 'Disparo',
      icon: 'bi-megaphone',
      content: (
        <div className="d-flex gap-4">
          <div style={{ flex: 1 }}>
            <iframe 
              width="100%" 
              height="400" 
              src="https://www.youtube.com/embed/LGAmHpMJLQY" 
              title="Como realizar disparos de Whatsapp no CRM da Effective Gain" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              referrerPolicy="strict-origin-when-cross-origin" 
              allowFullScreen
              style={{ borderRadius: '8px' }}
            ></iframe>
          </div>
          <div style={{ flex: 1 }}>
            <h5 className={`header-text-${theme} mb-3`}>Área de Texto</h5>
            <p className={`header-text-${theme}`}>
              {textos.filter(t=>t.section==='disparo')[0]?.texto || 'Conteúdo não disponível para Disparo.'}
            </p>
          </div>
        </div>
      )
    },
  };

  // Listar todas as seções disponíveis
  const sectionsList = Object.entries(sections);

  return (
    <div className="h-100 w-100">
      <div className="d-flex flex-row gap-3 h-100">
        {/* Menu lateral */}
        <div style={{ width: '20%', minWidth: 175, maxWidth: 200 }} className={`bg-form-${theme} rounded p-3`}>
          <h2 className={`mb-3 ms-3 header-text-${theme}`} style={{ fontWeight: 400 }}>Ajuda</h2>

          <div className="d-flex flex-column gap-2 align-items-start">
            {sectionsList.map(([key, section]) => (
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