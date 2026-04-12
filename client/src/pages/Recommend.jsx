import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../hooks/useApi.js';

export default function Recommend() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [form, setForm] = useState({
    recommender_name: '', recommender_email: '',
    relationship: '', recommendation_text: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/recommendations/${token}`)
      .then(setInfo)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/recommendations/${token}`, form);
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="container text-center mt-4">Loading...</div>;
  if (error && !info) return <div className="container text-center mt-4" style={{ color: 'var(--coral)' }}>{error}</div>;

  if (submitted) {
    return (
      <div className="container text-center mt-4" style={{ maxWidth: '480px' }}>
        <div className="card">
          <h2 style={{ color: 'var(--navy)' }}>Thank You</h2>
          <p style={{ color: 'var(--gray-500)', marginTop: '0.5rem' }}>
            Your recommendation for {info.provider_name} has been submitted.
          </p>
        </div>
      </div>
    );
  }

  if (!info.accepting) {
    return (
      <div className="container text-center mt-4" style={{ maxWidth: '480px' }}>
        <div className="card">
          <h2 style={{ color: 'var(--navy)' }}>{info.provider_name}</h2>
          <p style={{ color: 'var(--gray-500)', marginTop: '0.5rem' }}>
            This provider already has the maximum number of recommendations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '520px' }}>
      <div className="card">
        <h2 style={{ color: 'var(--navy)', marginBottom: '0.25rem' }}>Recommend {info.provider_name}</h2>
        <div className="flex flex-wrap gap-1 mb-3">
          {info.service_categories?.map(cat => (
            <span key={cat} className="badge badge-navy">{cat}</span>
          ))}
        </div>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          {info.recommendation_count} of {info.max_recommendations} recommendations received
        </p>

        {error && (
          <div style={{ background: 'rgba(232,90,79,0.08)', color: 'var(--coral)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Your name *</label>
            <input required value={form.recommender_name}
              onChange={e => setForm(f => ({ ...f, recommender_name: e.target.value }))} />
          </div>

          <div className="form-group">
            <label>Your email (optional)</label>
            <input type="email" value={form.recommender_email}
              onChange={e => setForm(f => ({ ...f, recommender_email: e.target.value }))} />
          </div>

          <div className="form-group">
            <label>Your relationship *</label>
            <select required value={form.relationship}
              onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))}>
              <option value="">Select...</option>
              <option value="Client">Client</option>
              <option value="Colleague">Colleague</option>
              <option value="Friend/Family">Friend/Family</option>
              <option value="Community member">Community member</option>
            </select>
          </div>

          <div className="form-group">
            <label>Your recommendation * (max 300 characters)</label>
            <textarea required maxLength={300} rows={4}
              value={form.recommendation_text}
              onChange={e => setForm(f => ({ ...f, recommendation_text: e.target.value }))}
              placeholder="Tell us about your experience with this provider..." />
            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
              {form.recommendation_text.length}/300
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Submit Recommendation
          </button>
        </form>
      </div>
    </div>
  );
}
