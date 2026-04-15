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
        <div className="card card-accent text-center">
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>&#x1F389;</div>
          <h2 style={{ color: 'var(--navy)', marginBottom: '0.5rem' }}>Mazel Tov! You're registered</h2>
          <p style={{ color: 'var(--gray-500)', marginBottom: '1.5rem' }}>
            Mishelanu is preparing your profile. Once we've reviewed your details
            and you have at least one community recommendation, your profile will go live.
          </p>

          <div style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
            <label style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', fontWeight: 500 }}>Your profile link</label>
            <div className="flex items-center gap-1">
              <code style={{ flex: 1, padding: '0.625rem', background: 'var(--gray-100)', borderRadius: '8px', fontSize: '0.8125rem', wordBreak: 'break-all' }}>
                {result.profile_url}
              </code>
              <button className="btn btn-outline" onClick={() => copyToClipboard(result.profile_url)}>Copy</button>
            </div>
          </div>

          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', fontWeight: 500 }}>Share this link with people who can recommend you</label>
            <div className="flex items-center gap-1">
              <code style={{ flex: 1, padding: '0.625rem', background: 'var(--gray-100)', borderRadius: '8px', fontSize: '0.8125rem', wordBreak: 'break-all' }}>
                {result.recommendation_url}
              </code>
              <button className="btn btn-outline" onClick={() => copyToClipboard(result.recommendation_url)}>Copy</button>
            </div>
          </div>

          <p style={{ color: 'var(--gray-500)', fontSize: '0.8125rem', marginTop: '1.25rem', fontStyle: 'italic' }}>
            Hatzlacha! Mishelanu is rooting for you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '640px' }}>
      <h1 style={{ color: 'var(--navy)', fontSize: '1.5rem', marginBottom: '0.25rem' }}>Join the Mishelanu community</h1>
      <p style={{ color: 'var(--gray-500)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
        Tell us about yourself and your services. Mishelanu will set up your profile
        and connect you with people who need your help.
      </p>

      {error && (
        <div className="msg-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label>Your full name *</label>
          <input required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            placeholder="e.g. Sarah Cohen" />
        </div>

        <div className="form-group">
          <label>Business name (if applicable)</label>
          <input value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
            placeholder="e.g. Cohen Plumbing Services" />
        </div>

        <div className="form-group">
          <label>Where are you based?</label>
          <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            placeholder="e.g. Hendon, London" />
        </div>

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Mobile phone *</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 400, color: 'var(--gray-500)', cursor: 'pointer', margin: 0 }}>
              <input type="checkbox" checked={form.whatsapp_same}
                onChange={e => setForm(f => ({ ...f, whatsapp_same: e.target.checked }))}
                style={{ margin: 0 }} />
              Same as WhatsApp
            </label>
          </label>
          <input required type="tel" value={form.mobile_phone} onChange={e => setForm(f => ({ ...f, mobile_phone: e.target.value }))}
            placeholder="e.g. +44 7700 900001" />
          {!form.whatsapp_same && (
            <input type="tel" placeholder="WhatsApp number"
              value={form.whatsapp_number} onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))}
              style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid var(--gray-200)', borderRadius: '12px', marginTop: '0.5rem' }} />
          )}
        </div>

        <div className="form-group">
          <label>Business phone (if different)</label>
          <input type="tel" value={form.business_phone} onChange={e => setForm(f => ({ ...f, business_phone: e.target.value }))} />
        </div>

        <div className="form-group">
          <label>Email *</label>
          <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="e.g. sarah@example.com" />
        </div>

        <div className="form-group" ref={catRef}>
          <label>What services do you offer?</label>

          {/* Selected categories as chips */}
          {form.service_categories.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.5rem' }}>
              {form.service_categories.map(cat => (
                <span key={cat} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-pill)', fontSize: '0.8125rem',
                  background: 'var(--teal-glow)', border: '1.5px solid var(--teal)', color: 'var(--teal-dark)',
                  fontWeight: 500,
                }}>
                  {cat}
                  <button type="button" onClick={() => removeCategory(cat)}
                    style={{ background: 'none', border: 'none', color: 'var(--teal-dark)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 0 }}>
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search input */}
          <div style={{ position: 'relative' }}>
            <input
              placeholder="Start typing to find your services..."
              value={catSearch}
              onChange={e => { setCatSearch(e.target.value); setCatDropdownOpen(true); }}
              onFocus={() => { if (catSearch.trim()) setCatDropdownOpen(true); }}
            />

            {/* Dropdown */}
            {catDropdownOpen && catSearch.trim() && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                background: 'var(--white)', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)',
                marginTop: '0.25rem', maxHeight: '200px', overflowY: 'auto',
                boxShadow: 'var(--shadow-lg)',
              }}>
                {filteredCats.filter(c => !form.service_categories.includes(c)).map(cat => (
                  <button type="button" key={cat} onClick={() => addCategory(cat)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '0.625rem 0.875rem', border: 'none', background: 'none',
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
                      padding: '0.625rem 0.875rem', border: 'none', background: 'none',
                      fontSize: '0.875rem', cursor: 'pointer', color: 'var(--gold)', fontWeight: 600,
                    }}
                    onMouseEnter={e => e.target.style.background = 'var(--gray-100)'}
                    onMouseLeave={e => e.target.style.background = 'none'}>
                    Suggest: "{catSearch.trim()}" — we'll review and add it
                  </button>
                )}
                {filteredCats.length > 0 && filteredCats.every(c => form.service_categories.includes(c)) && (
                  <div style={{ padding: '0.625rem 0.875rem', fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
                    All matching services already selected
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
                padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-pill)', fontSize: '0.8125rem',
                background: 'var(--gold-light)', border: '1.5px solid var(--gold)', color: '#b87d1a',
                fontWeight: 500,
              }}>
                Suggested: {form.other_category}
                <button type="button" onClick={() => setForm(f => ({ ...f, other_category: '' }))}
                  style={{ background: 'none', border: 'none', color: '#b87d1a', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 0 }}>
                  &times;
                </button>
              </span>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Tell us about yourself and what you do</label>
          <textarea rows={5} value={form.raw_description}
            onChange={e => setForm(f => ({ ...f, raw_description: e.target.value }))}
            placeholder="Share your experience, specialities, and what makes your service special. Write naturally — Mishelanu will organise it beautifully for you." />
        </div>

        <div className="form-group">
          <label>Online profiles and links</label>
          <textarea rows={3} value={form.raw_external_links}
            onChange={e => setForm(f => ({ ...f, raw_external_links: e.target.value }))}
            placeholder="Paste links to your website, Facebook, Google Business, Checkatrade, LinkedIn, or anything else." />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', fontSize: '1rem', padding: '0.875rem' }}>
          {loading ? 'Mishelanu is setting things up...' : 'Join Mishelanu'}
        </button>
      </form>
    </div>
  );
}
