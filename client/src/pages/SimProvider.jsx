import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../hooks/useApi.js';

export default function SimProvider() {
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
      const msgs = await api.get(`/sim/provider/${encodeURIComponent(decodedPhone)}/messages`);
      setMessages(msgs);
    } catch {}
  }

  async function respond(requestId, response) {
    try {
      await api.post('/sim/provider/respond', { request_id: requestId, response });
      loadMessages();
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
        Provider Inbox
        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{decodedPhone}</div>
      </div>

      <div style={{
        background: '#e5ddd5', padding: '0.75rem',
        minHeight: '50vh', borderRadius: '0 0 12px 12px',
      }}>
        {messages.length === 0 && (
          <p style={{ textAlign: 'center', color: '#999', paddingTop: '2rem', fontSize: '0.875rem' }}>
            No messages yet. Match a service request from the Monitor tool.
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{
            background: '#dcf8c6',
            borderRadius: '8px',
            padding: '0.625rem 0.75rem',
            marginBottom: '0.5rem',
            maxWidth: '90%',
            marginLeft: msg.message_type === 'provider_followup' || msg.message_type === 'provider_visit_notification' ? '0' : 'auto',
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

            {msg.message_type === 'provider_opportunity' && msg.service_request_id && (
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
          </div>
        ))}
      </div>
    </div>
  );
}
