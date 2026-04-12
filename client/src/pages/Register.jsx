import { useState, useEffect } from 'react';
import { api } from '../hooks/useApi.js';

export default function Register() {
  const [categories, setCategories] = useState({});
  const [form, setForm] = useState({
    full_name: '', business_name: '', address: '',
    mobile_phone: '', whatsapp_same: true, whatsapp_number: '',
    business_phone: '', email: '',
    service_categories: [], other_category: '',
    raw_description: '', raw_external_links: ''
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/categories').then(setCategories).catch(() => {});
  }, []);

  const allSubcats = Object.entries(categories).flatMap(([cat, subs]) =>
    subs.map(s => `${cat}: ${s.subcategory}`)
  );

  function toggleCategory(cat) {
    setForm(f => ({
      ...f,
      service_categories: f.service_categories.includes(cat)
        ? f.service_categories.filter(c => c !== cat)
        : [...f.service_categories, cat]
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body = {
        ...form,
        whatsapp_number: form.whatsapp_same ? form.mobile_phone : form.whatsapp_number,
        service_categories: form.other_category
          ? [...form.service_categories, `Other: ${form.other_category}`]
          : form.service_categories,
      };
      delete body.whatsapp_same;
      delete body.other_category;
      const res = await api.post('/providers', body);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(window.location.origin + text);
  }

  if (result) {
    return (
      <div className="container" style={{ maxWidth: '560px' }}>
        <div className="card text-center">
          <h2 style={{ color: 'var(--navy)', marginBottom: '1rem' }}>Registration Complete</h2>
          <p style={{ color: 'var(--gray-500)', marginBottom: '1.5rem' }}>
            Your profile is being prepared and will go live once we've processed your details
            and you have at least one recommendation.
          </p>

          <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
            <label style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>Your profile URL</label>
            <div className="flex items-center gap-1">
              <code style={{ flex: 1, padding: '0.5rem', background: 'var(--gray-100)', borderRadius: '6px', fontSize: '0.8125rem', wordBreak: 'break-all' }}>
                {result.profile_url}
              </code>
              <button className="btn btn-outline" onClick={() => copyToClipboard(result.profile_url)}>Copy</button>
            </div>
          </div>

          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>Recommendation link</label>
            <div className="flex items-center gap-1">
              <code style={{ flex: 1, padding: '0.5rem', background: 'var(--gray-100)', borderRadius: '6px', fontSize: '0.8125rem', wordBreak: 'break-all' }}>
                {result.recommendation_url}
              </code>
              <button className="btn btn-outline" onClick={() => copyToClipboard(result.recommendation_url)}>Copy</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '640px' }}>
      <h1 style={{ color: 'var(--navy)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Register as a Provider</h1>
      <p style={{ color: 'var(--gray-500)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
        Join the Mishelanu community network. Tell us about yourself and your services.
      </p>

      {error && (
        <div style={{ background: 'rgba(232,90,79,0.08)', color: 'var(--coral)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label>Full name *</label>
          <input required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
        </div>

        <div className="form-group">
          <label>Business name (optional)</label>
          <input value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} />
        </div>

        <div className="form-group">
          <label>Address</label>
          <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
        </div>

        <div className="form-group">
          <label>Mobile phone *</label>
          <input required type="tel" value={form.mobile_phone} onChange={e => setForm(f => ({ ...f, mobile_phone: e.target.value }))} />
        </div>

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" checked={form.whatsapp_same} onChange={e => setForm(f => ({ ...f, whatsapp_same: e.target.checked }))} />
            WhatsApp number is the same as mobile
          </label>
          {!form.whatsapp_same && (
            <input type="tel" placeholder="WhatsApp number" className="mt-1"
              value={form.whatsapp_number} onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))}
              style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1.5px solid var(--gray-200)', borderRadius: '8px' }} />
          )}
        </div>

        <div className="form-group">
          <label>Business phone (optional)</label>
          <input type="tel" value={form.business_phone} onChange={e => setForm(f => ({ ...f, business_phone: e.target.value }))} />
        </div>

        <div className="form-group">
          <label>Email *</label>
          <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>

        <div className="form-group">
          <label>Service categories</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.375rem' }}>
            {allSubcats.map(cat => (
              <button type="button" key={cat} onClick={() => toggleCategory(cat)}
                style={{
                  padding: '0.375rem 0.75rem', borderRadius: '100px', fontSize: '0.8125rem',
                  border: form.service_categories.includes(cat) ? '1.5px solid var(--teal)' : '1.5px solid var(--gray-200)',
                  background: form.service_categories.includes(cat) ? 'rgba(62,184,164,0.1)' : 'var(--white)',
                  color: form.service_categories.includes(cat) ? 'var(--teal)' : 'var(--gray-700)',
                  cursor: 'pointer',
                }}>
                {cat}
              </button>
            ))}
          </div>
          <input placeholder="Other — specify your service" className="mt-1"
            value={form.other_category} onChange={e => setForm(f => ({ ...f, other_category: e.target.value }))}
            style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1.5px solid var(--gray-200)', borderRadius: '8px', marginTop: '0.5rem' }} />
        </div>

        <div className="form-group">
          <label>Describe yourself and your services</label>
          <textarea rows={5} value={form.raw_description}
            onChange={e => setForm(f => ({ ...f, raw_description: e.target.value }))}
            placeholder="Tell us about yourself, your experience, and the services you offer. Write naturally — we'll organise it for you." />
        </div>

        <div className="form-group">
          <label>External profiles</label>
          <textarea rows={3} value={form.raw_external_links}
            onChange={e => setForm(f => ({ ...f, raw_external_links: e.target.value }))}
            placeholder="Paste links to any existing profiles: your website, Facebook page, Google Business, Checkatrade, Trusted Trader, LinkedIn, or anything else." />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Submitting...' : 'Register'}
        </button>
      </form>
    </div>
  );
}
