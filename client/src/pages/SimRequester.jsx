import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../hooks/useApi.js';

export default function SimRequester() {
  const { phone } = useParams();
  const [messages, setMessages] = useState([]);
  const decodedPhone = decodeURIComponent(phone);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [phone]);

  async function loadMessages() {
    try {
      const msgs = await api.get(`/sim/requester/${encodeURIComponent(decodedPhone)}/messages`);
      setMessages(msgs);
    } catch {}
  }

  return (
    <div className="container" style={{ maxWidth: '480px' }}>
      <div className="flex gap-1 mb-2" style={{ fontSize: '0.8125rem' }}>
        <Link to="/sim/group" className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}>Group</Link>
        <Link to="/monitor" className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}>Monitor</Link>
      </div>

      <div style={{
        background: '#075e54', color: 'white', padding: '0.75rem 1rem',
        borderRadius: '12px 12px 0 0', fontWeight: 500,
      }}>
        Requester Inbox
        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{decodedPhone}</div>
      </div>

      <div style={{
        background: '#e5ddd5', padding: '0.75rem',
        minHeight: '50vh', borderRadius: '0 0 12px 12px',
      }}>
        {messages.length === 0 && (
          <p style={{ textAlign: 'center', color: '#999', paddingTop: '2rem', fontSize: '0.875rem' }}>
            No messages yet. When a provider accepts a match, you'll see it here.
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{
            background: '#dcf8c6',
            borderRadius: '8px',
            padding: '0.625rem 0.75rem',
            marginBottom: '0.5rem',
            maxWidth: '90%',
            boxShadow: '0 1px 1px rgba(0,0,0,0.08)',
          }}>
            <div style={{ fontSize: '0.6875rem', color: '#075e54', fontWeight: 600, marginBottom: '0.25rem' }}>
              Mishelanu
            </div>
            <div style={{ fontSize: '0.875rem', lineHeight: 1.4 }}>
              {msg.message_body.includes('/provider/') ? (
                <>
                  {msg.message_body.split(/(?=\/provider\/)/)[0]}
                  <Link to={msg.message_body.match(/\/provider\/\S+/)?.[0] || '#'}
                    style={{ color: '#075e54', textDecoration: 'underline' }}>
                    {msg.message_body.match(/\/provider\/\S+/)?.[0]}
                  </Link>
                </>
              ) : (
                msg.message_body
              )}
            </div>
            <div style={{ fontSize: '0.6875rem', color: '#999', marginTop: '0.25rem' }}>
              {new Date(msg.sent_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
