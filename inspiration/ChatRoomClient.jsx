import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export default function ChatRoom({ roomCode }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Initialize socket connection on mount
    const s = io('https://kingfishbackend1-hffjhghycpejaxen.westeurope-01.azurewebsites.net/', {

      transports: ['polling', 'websocket'],
    });

    setSocket(s);

    s.on('connect', () => {
      console.log('✅ Connected with socket id:', s.id);
      if (roomCode) {
        s.emit('join', roomCode);
        console.log(`Joining room: ${roomCode}`);
      }
    });

    s.on('message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    s.on('connect_error', (err) => {
      console.error('Socket connect_error:', err.message);
    });

    s.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    // Cleanup on unmount
    return () => {
      s.disconnect();
    };
  }, []); // Only run once on mount

  // Re-join room if roomCode changes after socket is connected
  useEffect(() => {
    if (socket && roomCode) {
      socket.emit('join', roomCode);
      console.log(`Re-joining room: ${roomCode}`);
    }
  }, [socket, roomCode]);

  const sendMessage = () => {
    if (input.trim() === '' || !socket || !roomCode) return;

    socket.emit('message', { room: roomCode, text: input });
    setInput('');
  };

  return (
    <div style={{ maxWidth: 400, margin: 'auto' }}>
      <h2>Room: {roomCode}</h2>
      <div
        style={{
          border: '1px solid #ccc',
          height: 200,
          overflowY: 'auto',
          padding: 10,
          marginBottom: 10,
          background: '#fafafa',
        }}
      >
        {messages.map((msg, i) => (
          <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid #eee' }}>
            {msg}
          </div>
        ))}
      </div>
      <input
        type="text"
        placeholder="Type a message"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        style={{ width: 'calc(100% - 60px)', padding: '8px' }}
      />
      <button onClick={sendMessage} style={{ width: 50, marginLeft: 5, padding: '8px' }}>
        Send
      </button>
    </div>
  );
}
