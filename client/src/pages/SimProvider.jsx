import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../hooks/useApi.js';
import SimNav from '../components/SimNav.jsx';

export default function SimProvider() {
  const { phone } = useParams();
  const [messages, setMessages] = useState([]);
  const [respondedRequests, setRespondedRequests] = useState(new Set());
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
      const msgs = await api.get(`/sim/provider/${encodeURIComponent(decodedPhone)}/messages`);
      setMessages(msgs);
    } catch {}
  }

  async function respond(requestId, response) {
    if (respondedRequests.has(requestId)) return;
    setRespondedRequests(prev => new Set([...prev, requestId]));
    try {
      await api.post('/sim/provider/respond', { request_id: requestId, response });
      loadMessages();
    } catch {
      setRespondedRequests(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  }

  async function clearMessages() {
    setClearing(true);
    try {
      await api.del(`/sim/provider/${encodeURIComponent(decodedPhone)}/messages`);
      setMessages([]);
      setRespondedRequests(new Set());
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
        Provider Inbox
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
            <p>Waiting for Mishelanu to send you a match from the Monitor.</p>
          </div>
        )}
        {orderedMessages.map((msg, i) => {
          const hasResponded = respondedRequests.has(msg.service_request_id) ||
            msg.message_type !== 'provider_opportunity';

          return (
            <div key={msg.id || i} style={{
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
              <div style={{ fontSize: '0.875rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {msg.message_body}
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#999', marginTop: '0.25rem' }}>
                {new Date(msg.sent_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </div>

              {msg.message_type === 'provider_opportunity' && msg.service_request_id && !hasResponded && (
                <div style={{ marginTop: '0.625rem', display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary" style={{ fontSize: '0.8125rem', padding: '0.5rem 1.25rem' }}
                    onClick={() => respond(msg.service_request_id, 'YES')}>
                    I'm Interested
                  </button>
                  <button className="btn btn-outline" style={{ fontSize: '0.8125rem', padding: '0.5rem 1.25rem' }}
                    onClick={() => respond(msg.service_request_id, 'NO')}>
                    Pass
                  </button>
                </div>
              )}
              {msg.message_type === 'provider_opportunity' && hasResponded && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--teal-dark)', fontWeight: 500 }}>
                  &#x2705; Response sent
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
