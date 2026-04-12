import { useState, useEffect } from 'react';
import { api } from '../hooks/useApi.js';
import SimNav from '../components/SimNav.jsx';

export default function SimGroup() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    api.get('/sim/group/messages').then(setMessages).catch(() => {});
  }, []);

  function copyMessage(msg) {
    const text = `${msg.sender} (${msg.phone}): ${msg.text}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  return (
    <div className="container" style={{ maxWidth: '480px' }}>
      <SimNav />

      <div style={{
        background: '#075e54', color: 'white', padding: '0.75rem 1rem',
        borderRadius: '12px 12px 0 0', fontWeight: 500,
      }}>
        NW London Community
        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{messages.length} messages</div>
      </div>

      <div style={{
        background: '#e5ddd5',
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h100v100H0z\' fill=\'none\'/%3E%3Cpath d=\'M20 20h2v2h-2zM60 40h2v2h-2zM40 70h2v2h-2zM80 80h2v2h-2z\' fill=\'%23d4ccb7\' opacity=\'.3\'/%3E%3C/svg%3E")',
        padding: '0.75rem',
        maxHeight: '70vh',
        overflowY: 'auto',
        borderRadius: '0 0 12px 12px',
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            background: 'white',
            borderRadius: '8px',
            padding: '0.5rem 0.75rem',
            marginBottom: '0.375rem',
            maxWidth: '85%',
            boxShadow: '0 1px 1px rgba(0,0,0,0.08)',
          }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: colorForName(msg.sender), marginBottom: '0.125rem' }}>
              {msg.sender}
            </div>
            <div style={{ fontSize: '0.875rem', lineHeight: 1.4 }}>{msg.text}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.6875rem', color: '#999' }}>{msg.time}</span>
              <button onClick={() => copyMessage(msg)}
                style={{
                  background: 'none', border: 'none', color: '#075e54',
                  fontSize: '0.6875rem', cursor: 'pointer', fontWeight: 500,
                }}>
                Copy
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function colorForName(name) {
  const colors = ['#e65100', '#1565c0', '#2e7d32', '#6a1b9a', '#c62828', '#00838f', '#4527a0', '#ef6c00'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
