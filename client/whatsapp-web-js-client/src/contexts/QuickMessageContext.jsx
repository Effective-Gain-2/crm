import React, { createContext, useContext, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Estrutura de uma mensagem rápida
// {
//   id: string,
//   comando: string,
//   mensagem: string,
//   tipo: 'pessoal' | 'setorial',
//   setor?: string
// }

const setoresFicticios = ['Vendas', 'Suporte', 'Financeiro'];

const QuickMessageContext = createContext();

export function useQuickMessages() {
  return useContext(QuickMessageContext);
}

export function QuickMessageProvider({ children }) {
  const [quickMessages, setQuickMessages] = useState([
    { id: uuidv4(), comando: '/boas-vindas', mensagem: 'Boas vindas! Espero que você esteja bem', tipo: 'setorial', setor: 'Vendas' },
    { id: uuidv4(), comando: '/ola', mensagem: 'Olá, como posso ajudá-lo hoje?', tipo: 'pessoal' },
    { id: uuidv4(), comando: '/finalizar', mensagem: 'Seu atendimento foi finalizado. Qualquer dúvida, estamos à disposição!', tipo: 'setorial', setor: 'Suporte' },
  ]);

  // CRUD
  function addQuickMessage(msg) {
    setQuickMessages(prev => [...prev, { ...msg, id: uuidv4() }]);
  }
  function updateQuickMessage(id, newMsg) {
    setQuickMessages(prev => prev.map(qm => qm.id === id ? { ...qm, ...newMsg } : qm));
  }
  function deleteQuickMessage(id) {
    setQuickMessages(prev => prev.filter(qm => qm.id !== id));
  }

  return (
    <QuickMessageContext.Provider value={{ quickMessages, addQuickMessage, updateQuickMessage, deleteQuickMessage, setoresFicticios }}>
      {children}
    </QuickMessageContext.Provider>
  );
} 