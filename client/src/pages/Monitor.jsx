import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../hooks/useApi.js';

export default function Monitor() {
  const navigate = useNavigate();
  const [rawMessage, setRawMessage] = useState('');
  const [parsed, setParsed] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [request, setRequest] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [step, setStep] = useState('paste'); // paste -> parsed -> search -> confirm -> done
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/admin/check').catch(() => navigate('/admin/login'));
  }, [navigate]);

  async function handleParse() {
    setParsing(true);
    setError(null);
    try {
      const result = await api.post('/monitor/parse', { raw_message: rawMessage });
      setParsed(result);
      setStep('parsed');
    } catch (err) {
      setError(err.message);
    } finally {
      setParsing(false);
    }
  }

  async function handleCreateRequest() {
    setError(null);
    try {
      const req = await api.post('/monitor/request', {
        raw_message: rawMessage,
        requester_phone: parsed.requester_phone,
        parsed_service_needed: parsed.service_needed,
        parsed_location: parsed.location,
        parsed_urgency: parsed.urgency,
        parsed_context: parsed.context,
      });
      setRequest(req);
      setStep('search');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    try {
      const results = await api.get(`/monitor/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(results);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSendMatch() {
    setError(null);
    try {
      await api.post('/monitor/match', {
        request_id: request.id,
        provider_id: selectedProvider.id,
      });
      setStep('done');
    } catch (err) {
      setError(err.message);
    }
  }

  function reset() {
    setRawMessage('');
    setParsed(null);
    setRequest(null);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedProvider(null);
    setStep('paste');
    setError(null);
  }

  return (
    <div className="container" style={{ maxWidth: '720px' }}>
      <h1 style={{ color: 'var(--navy)', fontSize: '1.5rem', marginBottom: '1rem' }}>Monitor Tool</h1>

      {error && (
        <div style={{ background: 'rgba(232,90,79,0.08)', color: 'var(--coral)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Step 1: Paste message */}
      {step === 'paste' && (
        <div className="card">
          <h3 style={{ color: 'var(--navy)', fontSize: '1rem', marginBottom: '0.75rem' }}>Paste WhatsApp Message</h3>
          <div className="form-group">
            <textarea rows={4} value={rawMessage} onChange={e => setRawMessage(e.target.value)}
              placeholder="Paste a service request message from WhatsApp..." />
          </div>
          <button className="btn btn-primary" onClick={handleParse} disabled={!rawMessage.trim() || parsing}>
            {parsing ? 'Parsing...' : 'Parse'}
          </button>
        </div>
      )}

      {/* Step 2: Review parsed */}
      {step === 'parsed' && parsed && (
        <div className="card">
          <h3 style={{ color: 'var(--navy)', fontSize: '1rem', marginBottom: '0.75rem' }}>Parsed Request</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            {[
              ['Service needed', parsed.service_needed],
              ['Location', parsed.location || 'Not specified'],
              ['Urgency', parsed.urgency || 'Not specified'],
              ['Requester phone', parsed.requester_phone || 'Not visible'],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{ color: 'var(--gray-500)', fontSize: '0.75rem' }}>{label}</div>
                <div style={{ fontSize: '0.875rem' }}>{val}</div>
              </div>
            ))}
          </div>
          {parsed.context && (
            <div className="mb-2">
              <div style={{ color: 'var(--gray-500)', fontSize: '0.75rem' }}>Context</div>
              <div style={{ fontSize: '0.875rem' }}>{parsed.context}</div>
            </div>
          )}
          <div className="flex gap-1">
            <button className="btn btn-primary" onClick={handleCreateRequest}>Confirm & Search Providers</button>
            <button className="btn btn-outline" onClick={() => setStep('paste')}>Back</button>
          </div>
        </div>
      )}

      {/* Step 3: Search and select provider */}
      {step === 'search' && (
        <div className="card">
          <h3 style={{ color: 'var(--navy)', fontSize: '1rem', marginBottom: '0.75rem' }}>Find a Provider</h3>
          <div className="flex gap-1 mb-2">
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search by name, category, area..."
              style={{ flex: 1, padding: '0.625rem 0.875rem', border: '1.5px solid var(--gray-200)', borderRadius: '8px' }} />
            <button className="btn btn-primary" onClick={handleSearch}>Search</button>
          </div>

          {searchResults.map(p => (
            <div key={p.id} onClick={() => setSelectedProvider(p)}
              style={{
                padding: '0.75rem', borderRadius: '8px', marginBottom: '0.5rem', cursor: 'pointer',
                background: selectedProvider?.id === p.id ? 'rgba(62,184,164,0.08)' : 'var(--gray-100)',
                border: selectedProvider?.id === p.id ? '1.5px solid var(--teal)' : '1.5px solid transparent',
              }}>
              <div className="flex items-center justify-between">
                <div>
                  <strong style={{ fontSize: '0.9375rem' }}>{p.full_name}</strong>
                  {p.business_name && <span style={{ color: 'var(--gray-500)', marginLeft: '0.5rem', fontSize: '0.8125rem' }}>{p.business_name}</span>}
                </div>
                <div className="flex items-center gap-1">
                  <span className="badge badge-navy">{p.recommendation_count} recs</span>
                  {p.recommendation_count >= 3 && <span className="badge badge-teal">Verified</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {(p.service_categories || []).map(c => (
                  <span key={c} style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{c}</span>
                ))}
              </div>
              {p.address && <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>{p.address}</div>}
            </div>
          ))}

          {searchResults.length === 0 && searchQuery && (
            <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>No providers found.</p>
          )}

          {selectedProvider && (
            <button className="btn btn-primary mt-2" onClick={handleSendMatch}>
              Send to {selectedProvider.full_name}
            </button>
          )}
        </div>
      )}

      {/* Step 4: Done */}
      {step === 'done' && (
        <div className="card text-center">
          <h3 style={{ color: 'var(--teal)', marginBottom: '0.5rem' }}>Match Sent</h3>
          <p style={{ color: 'var(--gray-500)', marginBottom: '1rem' }}>
            Service request has been sent to {selectedProvider.full_name}.
          </p>
          <button className="btn btn-primary" onClick={reset}>Process Another Request</button>
        </div>
      )}
    </div>
  );
}
