import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../hooks/useApi.js';

const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
];

const BUSINESS_SIZE_OPTIONS = [
  { value: 'small', label: 'Small (1–2 people)' },
  { value: 'medium', label: 'Medium (up to 5 people)' },
  { value: 'large', label: 'Large (5+ people)' },
  { value: 'other', label: 'Other' },
];

export default function Register() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState({});
  const [form, setForm] = useState({
    first_name: '', surname: '',
    business_name: '', address: '', area_covered: '',
    mobile_phone: '', whatsapp_same: true, whatsapp_number: '',
    business_phone: '', email: '',
    service_categories: [],
    raw_description: '', raw_external_links: '',
    vat_number: '', companies_house_number: '', sole_trader_utr: '',
    years_in_business: '',
    payment_types: [], payment_types_other: '',
    business_size: '', business_size_other: '',
    affiliations: '',
  });
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

  function addCategory(cat) {
    const trimmed = cat.trim();
    if (!trimmed) return;
    if (!form.service_categories.includes(trimmed)) {
      setForm(f => ({ ...f, service_categories: [...f.service_categories, trimmed] }));
    }
    setCatSearch('');
    setCatDropdownOpen(false);
  }

  function removeCategory(cat) {
    setForm(f => ({ ...f, service_categories: f.service_categories.filter(c => c !== cat) }));
  }

  function onCatKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const raw = catSearch.trim().replace(/,$/, '');
      if (raw) addCategory(raw);
    } else if (e.key === 'Backspace' && !catSearch && form.service_categories.length > 0) {
      removeCategory(form.service_categories[form.service_categories.length - 1]);
    }
  }

  function togglePaymentType(value) {
    setForm(f => {
      const has = f.payment_types.includes(value);
      const next = has ? f.payment_types.filter(v => v !== value) : [...f.payment_types, value];
      return {
        ...f,
        payment_types: next,
        payment_types_other: next.includes('other') ? f.payment_types_other : '',
      };
    });
  }

  function selectBusinessSize(value) {
    setForm(f => ({
      ...f,
      business_size: value,
      business_size_other: value === 'other' ? f.business_size_other : '',
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (form.payment_types.includes('other') && !form.payment_types_other.trim()) {
      setError('Please describe the other payment type, or remove the Other option.');
      return;
    }
    if (form.business_size === 'other' && !form.business_size_other.trim()) {
      setError('Please describe the other business size, or pick one of the listed sizes.');
      return;
    }

    setLoading(true);
    try {
      const body = {
        ...form,
        whatsapp_number: form.whatsapp_same ? form.mobile_phone : form.whatsapp_number,
        years_in_business: form.years_in_business === '' ? null : Number(form.years_in_business),
        payment_types: form.payment_types.length > 0 ? form.payment_types : null,
        payment_types_other: form.payment_types.includes('other') ? form.payment_types_other.trim() : null,
        business_size: form.business_size || null,
        business_size_other: form.business_size === 'other' ? form.business_size_other.trim() : null,
      };
      delete body.whatsapp_same;
      const res = await api.post('/providers', body);
      navigate(`/provider/${res.slug}?token=${res.management_token}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
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
        <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label>First name *</label>
            <input required value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
              placeholder="Sarah" />
          </div>
          <div>
            <label>Surname *</label>
            <input required value={form.surname} onChange={e => setForm(f => ({ ...f, surname: e.target.value }))}
              placeholder="Cohen" />
          </div>
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
          <label>Area Covered</label>
          <input value={form.area_covered} onChange={e => setForm(f => ({ ...f, area_covered: e.target.value }))}
            placeholder="e.g. North London, Hertfordshire" />
          <small style={{ color: 'var(--gray-500)', fontSize: '0.8125rem' }}>
            Postcodes or area names. Mishelanu will use this to match you with local requests.
          </small>
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

          {form.service_categories.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.5rem' }}>
              {form.service_categories.map(cat => (
                <CategoryChip key={cat} label={cat} onRemove={() => removeCategory(cat)} />
              ))}
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <input
              placeholder="Type a service and press Enter or comma to add it"
              value={catSearch}
              onChange={e => { setCatSearch(e.target.value); setCatDropdownOpen(true); }}
              onFocus={() => { if (catSearch.trim()) setCatDropdownOpen(true); }}
              onKeyDown={onCatKeyDown}
            />

            {catDropdownOpen && catSearch.trim() && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                background: 'var(--white)', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)',
                marginTop: '0.25rem', maxHeight: '240px', overflowY: 'auto',
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
                {!filteredCats.some(c => c.toLowerCase() === catSearch.trim().toLowerCase()) && (
                  <button type="button" onClick={() => addCategory(catSearch.trim())}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '0.625rem 0.875rem', border: 'none', background: 'none',
                      fontSize: '0.875rem', cursor: 'pointer', color: 'var(--navy)', fontWeight: 600,
                      borderTop: filteredCats.length > 0 ? '1px solid var(--gray-200)' : 'none',
                    }}
                    onMouseEnter={e => e.target.style.background = 'var(--gray-100)'}
                    onMouseLeave={e => e.target.style.background = 'none'}>
                    Add "{catSearch.trim()}" — Mishelanu will review it
                  </button>
                )}
              </div>
            )}
          </div>
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

        <h3 style={{ color: 'var(--navy)', fontSize: '1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>Business Credentials</h3>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.8125rem', marginBottom: '1rem' }}>
          Optional — share whichever apply to you. Mishelanu uses these to verify your business.
        </p>

        <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label>Years in Business</label>
            <input type="number" min="0" value={form.years_in_business}
              onChange={e => setForm(f => ({ ...f, years_in_business: e.target.value }))}
              placeholder="e.g. 8" />
          </div>
          <div>
            <label>UK VAT Number</label>
            <input value={form.vat_number}
              onChange={e => setForm(f => ({ ...f, vat_number: e.target.value }))}
              placeholder="GB123456789" />
          </div>
        </div>

        <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label>Companies House Registration Number</label>
            <input value={form.companies_house_number}
              onChange={e => setForm(f => ({ ...f, companies_house_number: e.target.value }))}
              placeholder="e.g. 12345678" />
          </div>
          <div>
            <label>Sole Trader UTR</label>
            <input value={form.sole_trader_utr}
              onChange={e => setForm(f => ({ ...f, sole_trader_utr: e.target.value }))}
              placeholder="10-digit UTR" />
          </div>
        </div>

        <div className="form-group">
          <label>Payments Accepted</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.25rem', marginTop: '0.25rem' }}>
            {PAYMENT_OPTIONS.map(opt => (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 400, fontSize: '0.875rem', cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  checked={form.payment_types.includes(opt.value)}
                  onChange={() => togglePaymentType(opt.value)}
                  style={{ margin: 0 }}
                />
                {opt.label}
              </label>
            ))}
          </div>
          {form.payment_types.includes('other') && (
            <input
              value={form.payment_types_other}
              onChange={e => setForm(f => ({ ...f, payment_types_other: e.target.value }))}
              placeholder="Describe the other payment type"
              style={{ marginTop: '0.5rem' }}
            />
          )}
        </div>

        <div className="form-group">
          <label>Size of Business</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.25rem' }}>
            {BUSINESS_SIZE_OPTIONS.map(opt => (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 400, fontSize: '0.875rem', cursor: 'pointer', margin: 0 }}>
                <input
                  type="radio"
                  name="business_size"
                  checked={form.business_size === opt.value}
                  onChange={() => selectBusinessSize(opt.value)}
                  style={{ margin: 0 }}
                />
                {opt.label}
              </label>
            ))}
          </div>
          {form.business_size === 'other' && (
            <input
              value={form.business_size_other}
              onChange={e => setForm(f => ({ ...f, business_size_other: e.target.value }))}
              placeholder="Describe your business size"
              style={{ marginTop: '0.5rem' }}
            />
          )}
        </div>

        <div className="form-group">
          <label>Affiliations &amp; Credentials</label>
          <textarea rows={3} value={form.affiliations}
            onChange={e => setForm(f => ({ ...f, affiliations: e.target.value }))}
            placeholder="e.g. Federation of Master Builders, Gas Safe registered" />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', fontSize: '1rem', padding: '0.875rem' }}>
          {loading ? 'Mishelanu is setting things up...' : 'Join Mishelanu'}
        </button>
      </form>

      <ContactBlock />
    </div>
  );
}

function CategoryChip({ label, onRemove }) {
  const [hover, setHover] = useState(false);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
      padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-pill)', fontSize: '0.8125rem',
      background: 'var(--teal)', color: 'var(--white)', fontWeight: 500,
    }}>
      {label}
      <button
        type="button"
        onClick={onRemove}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-label={`Remove ${label}`}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: hover ? 'var(--coral)' : 'var(--white)',
          fontSize: '1rem', lineHeight: 1, padding: 0,
          transition: 'color 0.15s ease',
        }}
      >
        &times;
      </button>
    </span>
  );
}

function ContactBlock() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [contact, setContact] = useState({ name: '', email: '', phone: '', message: '' });
  const [contactError, setContactError] = useState(null);
  const [contactLoading, setContactLoading] = useState(false);

  async function send(e) {
    e.preventDefault();
    setContactError(null);
    setContactLoading(true);
    try {
      await api.post('/contact', { ...contact });
      setSubmitted(true);
    } catch (err) {
      setContactError(err.message);
    } finally {
      setContactLoading(false);
    }
  }

  return (
    <div style={{ marginTop: '2rem', textAlign: 'center' }}>
      {!open && !submitted && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn btn-outline"
          style={{ fontSize: '0.875rem' }}
        >
          Questions? Contact Mishelanu
        </button>
      )}

      {open && !submitted && (
        <form onSubmit={send} className="card" style={{ marginTop: '1rem', textAlign: 'left' }}>
          <h3 style={{ color: 'var(--navy)', fontSize: '1rem', marginBottom: '0.75rem' }}>Send Mishelanu a message</h3>
          {contactError && <div className="msg-error" style={{ marginBottom: '0.75rem' }}>{contactError}</div>}
          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label>Your name *</label>
              <input required value={contact.name} onChange={e => setContact(c => ({ ...c, name: e.target.value }))} />
            </div>
            <div>
              <label>Email *</label>
              <input required type="email" value={contact.email} onChange={e => setContact(c => ({ ...c, email: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label>Phone (optional)</label>
            <input type="tel" value={contact.phone} onChange={e => setContact(c => ({ ...c, phone: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Message *</label>
            <textarea required rows={4} value={contact.message} onChange={e => setContact(c => ({ ...c, message: e.target.value }))} />
          </div>
          <div className="flex gap-1">
            <button type="submit" disabled={contactLoading} className="btn btn-primary" style={{ flex: 1 }}>
              {contactLoading ? 'Sending...' : 'Send to Mishelanu'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}

      {submitted && (
        <div className="card card-accent" style={{ marginTop: '1rem' }}>
          <p style={{ color: 'var(--navy)', fontWeight: 500 }}>
            Toda raba — Mishelanu has received your message and will be in touch soon.
          </p>
        </div>
      )}
    </div>
  );
}
