import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../hooks/useApi.js';
import SimNav from '../components/SimNav.jsx';

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

      // Auto-search using the parsed service description
      const q = parsed.service_needed || '';
      if (q.trim()) {
        setSearchQuery(q);
        try {
          const results = await api.get(`/monitor/search?q=${encodeURIComponent(q)}`);
          setSearchResults(results);
        } catch (searchErr) {
          // Non-blocking — user can still search manually
        }
      }
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

  const stepLabels = [
    { key: 'paste', label: 'Paste Message' },
    { key: 'parsed', label: 'Review Details' },
    { key: 'search', label: 'Find Provider' },
    { key: 'done', label: 'Connected!' },
  ];

  const currentStepIndex = stepLabels.findIndex(s => s.key === step);

  return (
    <div className="container" style={{ maxWidth: '720px' }}>
      <SimNav />
      <h1 style={{ color: 'var(--navy)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Mishelanu Monitor</h1>
      <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginBottom: '1rem' }}>
        Paste a community message and Mishelanu will help you find the right provider.
      </p>

      {/* Progress steps */}
      <div className="flex items-center mb-3" style={{ gap: '0.25rem' }}>
        {stepLabels.map((s, i) => (
          <div key={s.key} className="flex items-center" style={{ gap: '0.25rem' }}>
            <div style={{
              padding: '0.25rem 0.75rem',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: i <= currentStepIndex ? 'var(--teal)' : 'var(--gray-200)',
              color: i <= currentStepIndex ? 'white' : 'var(--gray-500)',
              transition: 'all 0.2s ease',
            }}>
              {s.label}
            </div>
            {i < stepLabels.length - 1 && (
              <div style={{ width: '1.5rem', height: '2px', background: i < currentStepIndex ? 'var(--teal)' : 'var(--gray-200)' }} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="msg-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Step 1: Paste message */}
      {step === 'paste' && (
        <div className="card">
          <h3 className="section-heading">Paste the community message</h3>
          <div className="form-group">
            <textarea rows={4} value={rawMessage} onChange={e => setRawMessage(e.target.value)}
              placeholder="Copy a service request from the WhatsApp group and paste it here..." />
          </div>
          <button className="btn btn-primary" onClick={handleParse} disabled={!rawMessage.trim() || parsing}>
            {parsing ? 'Mishelanu is reading the message...' : 'Read Message'}
          </button>
        </div>
      )}

      {/* Step 2: Review and edit parsed fields */}
      {step === 'parsed' && parsed && (
        <div className="card">
          <h3 className="section-heading">Mishelanu understood this — check the details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Service needed</label>
              <input value={parsed.service_needed || ''} onChange={e => setParsed(p => ({ ...p, service_needed: e.target.value }))} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Location</label>
              <input value={parsed.location || ''} onChange={e => setParsed(p => ({ ...p, location: e.target.value }))} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>How urgent?</label>
              <input value={parsed.urgency || ''} onChange={e => setParsed(p => ({ ...p, urgency: e.target.value }))} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Requester's phone *</label>
              <input required value={parsed.requester_phone || ''} placeholder="e.g. +447700100003"
                onChange={e => setParsed(p => ({ ...p, requester_phone: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label>Extra details</label>
            <input value={parsed.context || ''} onChange={e => setParsed(p => ({ ...p, context: e.target.value }))} />
          </div>
          {!parsed.requester_phone && (
            <div className="msg-error" style={{ marginBottom: '0.75rem', fontSize: '0.8125rem' }}>
              Mishelanu needs the requester's phone number — check the WhatsApp message for it.
            </div>
          )}
          <div className="flex gap-1">
            <button className="btn btn-primary" onClick={handleCreateRequest} disabled={!parsed.requester_phone?.trim()}>
              Confirm & Find Providers
            </button>
            <button className="btn btn-outline" onClick={() => setStep('paste')}>Back</button>
          </div>
        </div>
      )}

      {/* Step 3: Search and select provider */}
      {step === 'search' && (
        <div className="card">
          <h3 className="section-heading">Find the right provider</h3>
          <div className="flex gap-1 mb-2">
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search by name, service, area..."
              style={{ flex: 1, padding: '0.75rem 1rem', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)' }} />
            <button className="btn btn-primary" onClick={handleSearch}>Search</button>
          </div>

          {searchResults.map(p => (
            <div key={p.id} onClick={() => setSelectedProvider(p)}
              style={{
                padding: '0.875rem', borderRadius: 'var(--radius)', marginBottom: '0.5rem', cursor: 'pointer',
                background: selectedProvider?.id === p.id ? 'var(--teal-glow)' : 'var(--gray-100)',
                border: selectedProvider?.id === p.id ? '2px solid var(--teal)' : '2px solid transparent',
                transition: 'all 0.15s ease',
              }}>
              <div className="flex items-center justify-between">
                <div>
                  <strong style={{ fontSize: '0.9375rem' }}>{p.full_name}</strong>
                  {p.business_name && <span style={{ color: 'var(--gray-500)', marginLeft: '0.5rem', fontSize: '0.8125rem' }}>{p.business_name}</span>}
                </div>
                <div className="flex items-center gap-1">
                  <span className="badge badge-navy">{p.recommendation_count} recs</span>
                  {p.recommendation_count >= 3 && <span className="badge badge-teal">&#x2B50; Verified</span>}
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
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <p>Mishelanu could not find any matching providers.</p>
            </div>
          )}

          {selectedProvider && (
            <button className="btn btn-primary mt-2" onClick={handleSendMatch}>
              Connect with {selectedProvider.full_name}
            </button>
          )}
        </div>
      )}

      {/* Step 4: Done */}
      {step === 'done' && (
        <div className="card card-accent text-center">
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>&#x1F389;</div>
          <h3 style={{ color: 'var(--teal)', marginBottom: '0.5rem', fontSize: '1.25rem' }}>Mishelanu has made the connection!</h3>
          <p style={{ color: 'var(--gray-500)', marginBottom: '1rem' }}>
            The service request has been sent to {selectedProvider.full_name}. B'hatzlacha!
          </p>
          <button className="btn btn-primary" onClick={reset}>Process Another Request</button>
        </div>
      )}
    </div>
  );
}
