import { useState } from 'react';

export default function ContactUs() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    // For MVP, just show confirmation — no backend endpoint yet
    setSubmitted(true);
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
          Questions? Ideas? Want to get involved? Mishelanu would love to hear from you.
        </p>
      </div>

      <div className="card card-accent">
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
            <label>Your message *</label>
            <textarea required rows={5} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Tell us what's on your mind..." />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Send to Mishelanu
          </button>
        </form>
      </div>

      <div className="text-center mt-3" style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
        <p>You can also reach us directly at <a href="mailto:hello@mishelanu.com">hello@mishelanu.com</a></p>
      </div>
    </div>
  );
}
