import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../hooks/useApi.js';
import SimNav from '../components/SimNav.jsx';

export default function SimRequester() {
  const { phone } = useParams();
  const [messages, setMessages] = useState([]);
  const decodedPhone = decodeURIComponent(phone);
  const bottomRef = useRef(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [phone]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMessages() {
    try {
      const msgs = await api.get(`/sim/requester/${encodeURIComponent(decodedPhone)}/messages`);
      setMessages(msgs);
    } catch {}
  }

  async function clearMessages() {
    setClearing(true);
    try {
      await api.del(`/sim/requester/${encodeURIComponent(decodedPhone)}/messages`);
      setMessages([]);
    } catch {}
    setClearing(false);
  }

  // Reverse so newest at bottom (WhatsApp style)
  const orderedMessages = [...messages].reverse();

  return (
    <div className="container" style={{ maxWidth: '480px' }}>
      <SimNav />

      <div style={{
        background: 'linear-gradient(135deg, var(--navy) 0%, #2a3f6b 100%)', color: 'white', padding: '0.875rem 1rem',
        borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', fontWeight: 600,
      }}>
        Your Inbox
        <div style={{ fontSize: '0.75rem', opacity: 0.7, fontWeight: 400 }}>{decodedPhone}</div>
      </div>

      <div style={{
        background: 'var(--teal)', padding: '0.5rem 0.75rem',
        display: 'flex', alignItems: 'center',
      }}>
        <button onClick={clearMessages} disabled={clearing}
          style={{
            background: 'white', border: 'none', borderRadius: '6px',
            padding: '0.375rem 0.75rem', fontSize: '0.75rem', fontWeight: 600,
            color: 'var(--navy)', cursor: 'pointer',
          }}>
          Clear
        </button>
      </div>

      <div style={{
        background: '#e5ddd5', padding: '0.75rem',
        minHeight: '50vh', maxHeight: '70vh', overflowY: 'auto',
        borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}>
        {orderedMessages.length === 0 && (
          <div className="empty-state">
            <span className="empty-emoji">&#x1F4EC;</span>
            <p>Waiting for Mishelanu to find you a provider. When a provider says yes, you'll see their details here.</p>
          </div>
        )}
        {orderedMessages.map((msg, i) => (
          <React.Fragment key={msg.id || i}>
          <div style={{
            background: '#dcf8c6',
            borderRadius: 'var(--radius)',
            padding: '0.75rem 0.875rem',
            marginBottom: '0.5rem',
            maxWidth: '90%',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: '0.6875rem', color: 'var(--teal-dark)', fontWeight: 600, marginBottom: '0.25rem' }}>
              Mishelanu
            </div>
            <div style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>
              {msg.message_body.includes('/provider/') ? (
                <>
                  {msg.message_body.split(/(?=\/provider\/)/)[0]}
                  <Link to={msg.message_body.match(/\/provider\/\S+/)?.[0] || '#'}
                    style={{ color: 'var(--teal-dark)', textDecoration: 'underline', fontWeight: 500 }}>
                    View their profile
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

          {/* Follow-up message */}
          <div style={{
            background: '#dcf8c6',
            borderRadius: 'var(--radius)',
            padding: '0.75rem 0.875rem',
            marginBottom: '0.5rem',
            maxWidth: '90%',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: '0.6875rem', color: 'var(--teal-dark)', fontWeight: 600, marginBottom: '0.25rem' }}>
              Mishelanu
            </div>
            <div style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>
              Glad Mishelanu could help! Save our number — next time you need something, just message us directly. Kol tuv!
            </div>
            <button style={{
              marginTop: '0.5rem',
              background: 'var(--navy)', color: 'white', border: 'none', borderRadius: '8px',
              padding: '0.5rem 1rem', fontSize: '0.8125rem', fontWeight: 600,
              cursor: 'default', opacity: 0.9,
            }}>
              Save Mishelanu
            </button>
            <div style={{ fontSize: '0.6875rem', color: '#999', marginTop: '0.25rem' }}>
              {new Date(msg.sent_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          </React.Fragment>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
