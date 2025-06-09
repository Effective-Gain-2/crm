import { useEffect } from 'react';
import io from 'socket.io-client';



function App() {
  useEffect(() => {
    const socket = io('http://localhost:3000'); 

    socket.on('connect', () => {
      console.log('Conectado ao servidor!');
    });

    socket.on('disconnect', () => {
      console.log('Desconectado do servidor!');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return <div>Testando WebSocket com React!</div>;
}

export default App;