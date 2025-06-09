import { useEffect, useRef, useState } from 'react';

const MOCK_NUMBER = '5511999999999'; // número para simular envio/recebimento
const API_KEY = '429683C4C977415CAAFCCE10F7D57E11'; // substitua pela sua chave da Evolution API

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // Scroll automático para o final
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Simula recebimento via polling (substitua por WebSocket ou webhook no futuro)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`https://api.evolutionapi.com/messages?number=${MOCK_NUMBER}`, {
          headers: { 'apikey': API_KEY },
        });
        const data = await res.json();
        // Supondo que a API retorne mensagens no formato: [{ text, fromMe }]
        setMessages(data.messages || []);
      } catch (err) {
        console.error('Erro ao buscar mensagens:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessage = {
      text: input,
      fromMe: true,
    };

    setMessages((prev) => [...prev, newMessage]);

    try {
      await fetch('https://api.evolutionapi.com/sendMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': API_KEY,
        },
        body: JSON.stringify({
          number: MOCK_NUMBER,
          message: input,
        }),
      });
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    }

    setInput('');
  };

  return (
    <div style={styles.container}>
      <div style={styles.chatWindow}>
        <div style={styles.messages}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                ...styles.message,
                alignSelf: msg.fromMe ? 'flex-end' : 'flex-start',
                backgroundColor: msg.fromMe ? '#dcf8c6' : '#fff',
              }}
            >
              {msg.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div style={styles.inputArea}>
          <input
            type="text"
            style={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Digite uma mensagem"
          />
          <button style={styles.button} onClick={handleSend}>
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: '#e5ddd5',
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatWindow: {
    width: 400,
    height: 600,
    backgroundColor: '#f0f0f0',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 0 10px rgba(0,0,0,0.3)',
  },
  messages: {
    flex: 1,
    padding: 10,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    gap: 8,
  },
  message: {
    maxWidth: '80%',
    padding: '10px 14px',
    borderRadius: 10,
    fontSize: 14,
  },
  inputArea: {
    display: 'flex',
    padding: 10,
    borderTop: '1px solid #ccc',
    backgroundColor: '#eee',
  },
  input: {
    flex: 1,
    padding: 10,
    border: 'none',
    borderRadius: 4,
    fontSize: 14,
  },
  button: {
    marginLeft: 8,
    padding: '10px 16px',
    backgroundColor: '#128C7E',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
};

export default App;
