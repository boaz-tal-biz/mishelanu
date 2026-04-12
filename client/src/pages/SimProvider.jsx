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
        background: '#075e54', color: 'white', padding: '0.75rem 1rem',
        borderRadius: '12px 12px 0 0', fontWeight: 500,
      }}>
        Provider Inbox
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
            No messages yet. Match a service request from the Monitor tool.
          </p>
        )}
        {orderedMessages.map((msg, i) => {
          const hasResponded = respondedRequests.has(msg.service_request_id) ||
            msg.message_type !== 'provider_opportunity';

          return (
            <div key={msg.id || i} style={{
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
              <div style={{ fontSize: '0.875rem', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                {msg.message_body}
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#999', marginTop: '0.25rem' }}>
                {new Date(msg.sent_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </div>

              {msg.message_type === 'provider_opportunity' && msg.service_request_id && !hasResponded && (
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.375rem 1rem' }}
                    onClick={() => respond(msg.service_request_id, 'YES')}>
                    YES
                  </button>
                  <button className="btn btn-danger" style={{ fontSize: '0.75rem', padding: '0.375rem 1rem' }}
                    onClick={() => respond(msg.service_request_id, 'NO')}>
                    NO
                  </button>
                </div>
              )}
              {msg.message_type === 'provider_opportunity' && hasResponded && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#999', fontStyle: 'italic' }}>
                  Responded
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
