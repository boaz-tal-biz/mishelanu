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
        background: '#075e54', color: 'white', padding: '0.75rem 1rem',
        borderRadius: '12px 12px 0 0', fontWeight: 500,
      }}>
        Requester Inbox
        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{decodedPhone}</div>
      </div>

      <div style={{
        background: '#25d366', padding: '0.5rem 0.75rem',
        display: 'flex', alignItems: 'center',
      }}>
        <button onClick={clearMessages} disabled={clearing}
          style={{
            background: 'white', border: 'none', borderRadius: '6px',
            padding: '0.375rem 0.75rem', fontSize: '0.75rem', fontWeight: 500,
            color: '#075e54', cursor: 'pointer',
          }}>
          Clear
        </button>
      </div>

      <div style={{
        background: '#e5ddd5', padding: '0.75rem',
        minHeight: '50vh', maxHeight: '70vh', overflowY: 'auto',
        borderRadius: '0 0 12px 12px',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}>
        {orderedMessages.length === 0 && (
          <p style={{ textAlign: 'center', color: '#999', paddingTop: '2rem', fontSize: '0.875rem' }}>
            No messages yet. When a provider accepts a match, you'll see it here.
          </p>
        )}
        {orderedMessages.map((msg, i) => (
          <React.Fragment key={msg.id || i}>
          <div style={{
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

          {/* Viral follow-up message after each match message */}
          <div style={{
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
              Mishelanu — like this service? Add Mishelanu to your contacts, and next time you can just ask us directly.
            </div>
            <button style={{
              marginTop: '0.5rem',
              background: '#075e54', color: 'white', border: 'none', borderRadius: '6px',
              padding: '0.5rem 1rem', fontSize: '0.8125rem', fontWeight: 500,
              cursor: 'default', opacity: 0.9,
            }}>
              Add to Contacts
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
