import { useState } from 'react';
import { api } from '../hooks/useApi.js';

export default function ContactUs() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', subject: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await api.post('/contact', form);
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <div className="container text-center" style={{ maxWidth: '480px', paddingTop: '3rem' }}>
        <div className="card card-accent">
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>&#x1F4E8;</div>
          <h2 style={{ color: 'var(--navy)', marginBottom: '0.5rem' }}>Todah! Message received</h2>
          <p style={{ color: 'var(--gray-500)' }}>
            Mishelanu will get back to you soon. In the meantime, shalom!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '520px', paddingTop: '2rem' }}>
      <div className="text-center" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: 'var(--navy)', fontSize: '1.5rem', marginBottom: '0.25rem' }}>Get in Touch</h1>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.9375rem' }}>
          Have a question about Mishelanu? Want to report an issue or give us feedback? Get in touch.
        </p>
      </div>

      <div className="card card-accent">
        {error && <div className="msg-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Your name *</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Sarah Cohen" />
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="e.g. sarah@example.com" />
          </div>

          <div className="form-group">
            <label>Phone (optional)</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="e.g. 07700 000 000" />
          </div>

          <div className="form-group">
            <label>What is this about?</label>
            <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
              <option value="">Select a topic (optional)</option>
              <option value="General enquiry">General enquiry</option>
              <option value="Provider registration">Provider registration</option>
              <option value="Recommendation">Recommendation</option>
              <option value="Report a problem">Report a problem</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Your message *</label>
            <textarea required rows={5} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Tell us what's on your mind..." maxLength={2000} />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={sending}>
            {sending ? 'Sending...' : 'Send to Mishelanu'}
          </button>
        </form>
      </div>

      <div className="text-center mt-3" style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
        <p>You can also reach us directly at <a href="mailto:boaz@bless.network" style={{ color: 'var(--teal)' }}>boaz@bless.network</a></p>
      </div>
    </div>
  );
}
