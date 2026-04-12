import { useState, useEffect, useRef } from 'react';
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
  const [catSearch, setCatSearch] = useState('');
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const catRef = useRef(null);

  useEffect(() => {
    api.get('/categories').then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (catRef.current && !catRef.current.contains(e.target)) {
        setCatDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allSubcats = Object.entries(categories).flatMap(([cat, subs]) =>
    subs.map(s => `${cat}: ${s.subcategory}`)
  );

  const filteredCats = catSearch.trim()
    ? allSubcats.filter(c => c.toLowerCase().includes(catSearch.toLowerCase()))
    : [];

  const showOther = catSearch.trim() && filteredCats.length === 0;

  function addCategory(cat) {
    if (!form.service_categories.includes(cat)) {
      setForm(f => ({ ...f, service_categories: [...f.service_categories, cat] }));
    }
    setCatSearch('');
    setCatDropdownOpen(false);
  }

  function removeCategory(cat) {
    setForm(f => ({ ...f, service_categories: f.service_categories.filter(c => c !== cat) }));
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
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Mobile phone *</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 400, color: 'var(--gray-500)', cursor: 'pointer', margin: 0 }}>
              <input type="checkbox" checked={form.whatsapp_same}
                onChange={e => setForm(f => ({ ...f, whatsapp_same: e.target.checked }))}
                style={{ margin: 0 }} />
              WhatsApp number is the same as mobile
            </label>
          </label>
          <input required type="tel" value={form.mobile_phone} onChange={e => setForm(f => ({ ...f, mobile_phone: e.target.value }))} />
          {!form.whatsapp_same && (
            <input type="tel" placeholder="WhatsApp number"
              value={form.whatsapp_number} onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))}
              style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1.5px solid var(--gray-200)', borderRadius: '8px', marginTop: '0.5rem' }} />
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

        <div className="form-group" ref={catRef}>
          <label>Service categories</label>

          {/* Selected categories as chips */}
          {form.service_categories.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.5rem' }}>
              {form.service_categories.map(cat => (
                <span key={cat} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.25rem 0.625rem', borderRadius: '100px', fontSize: '0.8125rem',
                  background: 'rgba(62,184,164,0.1)', border: '1.5px solid var(--teal)', color: 'var(--teal)',
                }}>
                  {cat}
                  <button type="button" onClick={() => removeCategory(cat)}
                    style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 0 }}>
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search input */}
          <div style={{ position: 'relative' }}>
            <input
              placeholder="Start typing to search categories..."
              value={catSearch}
              onChange={e => { setCatSearch(e.target.value); setCatDropdownOpen(true); }}
              onFocus={() => { if (catSearch.trim()) setCatDropdownOpen(true); }}
            />

            {/* Dropdown */}
            {catDropdownOpen && catSearch.trim() && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                background: 'var(--white)', border: '1.5px solid var(--gray-200)', borderRadius: '8px',
                marginTop: '0.25rem', maxHeight: '200px', overflowY: 'auto',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}>
                {filteredCats.filter(c => !form.service_categories.includes(c)).map(cat => (
                  <button type="button" key={cat} onClick={() => addCategory(cat)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '0.5rem 0.75rem', border: 'none', background: 'none',
                      fontSize: '0.875rem', cursor: 'pointer', color: 'var(--gray-700)',
                    }}
                    onMouseEnter={e => e.target.style.background = 'var(--gray-100)'}
                    onMouseLeave={e => e.target.style.background = 'none'}>
                    {cat}
                  </button>
                ))}
                {showOther && (
                  <button type="button"
                    onClick={() => {
                      setForm(f => ({ ...f, other_category: catSearch.trim() }));
                      setCatSearch('');
                      setCatDropdownOpen(false);
                    }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '0.5rem 0.75rem', border: 'none', background: 'none',
                      fontSize: '0.875rem', cursor: 'pointer', color: 'var(--coral)', fontWeight: 500,
                    }}
                    onMouseEnter={e => e.target.style.background = 'var(--gray-100)'}
                    onMouseLeave={e => e.target.style.background = 'none'}>
                    Other: "{catSearch.trim()}" — specify your service
                  </button>
                )}
                {filteredCats.length > 0 && filteredCats.every(c => form.service_categories.includes(c)) && (
                  <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
                    All matching categories already selected
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Show "Other" if manually set */}
          {form.other_category && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.5rem' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.25rem 0.625rem', borderRadius: '100px', fontSize: '0.8125rem',
                background: 'rgba(232,90,79,0.08)', border: '1.5px solid var(--coral)', color: 'var(--coral)',
              }}>
                Other: {form.other_category}
                <button type="button" onClick={() => setForm(f => ({ ...f, other_category: '' }))}
                  style={{ background: 'none', border: 'none', color: 'var(--coral)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 0 }}>
                  &times;
                </button>
              </span>
            </div>
          )}
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
