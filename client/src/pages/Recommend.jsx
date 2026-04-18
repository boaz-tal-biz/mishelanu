import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../hooks/useApi.js';

const RELATIONSHIP_OPTIONS = [
  { value: 'personal_work',  label: 'They did work for me' },
  { value: 'personal_known', label: 'I know them personally' },
  { value: 'personal_both',  label: 'Both — they did work for me and I know them personally' },
  { value: 'hearsay',        label: "I've heard about them from others" },
];

export default function Recommend() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form state
  const [knowsThem, setKnowsThem] = useState(null); // null | true | false
  const [form, setForm] = useState({
    relationship_type: '',
    recommender_first_name: '',
    recommender_surname: '',
    recommender_email: '',
    recommender_phone: '',
    how_long_known: '',
    last_service_date: '',
    service_description: '',
    opt_in_provider: false,
    opt_in_user: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitted, setSubmitted] = useState(null); // null | { threshold_reached: bool }

  useEffect(() => {
    api.get(`/recommendations/${token}`)
      .then(setInfo)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="container text-center mt-4">
        <span className="loading-text">Mishelanu is loading...</span>
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="container text-center mt-4" style={{ maxWidth: '480px' }}>
        <div className="card">
          <h2 style={{ color: 'var(--navy)' }}>This link isn't working</h2>
          <p style={{ color: 'var(--gray-500)', marginTop: '0.5rem' }}>{error}</p>
        </div>
      </div>
    );
  }

  const providerFirst = info.provider_first_name || info.provider_name?.split(' ')[0] || 'this provider';
  const providerSurname = info.provider_surname || '';
  const providerFull = `${providerFirst}${providerSurname ? ' ' + providerSurname : ''}`;

  // Already has 3 recommendations
  if (!info.accepting) {
    return (
      <div className="container text-center mt-4" style={{ maxWidth: '520px' }}>
        <div className="card card-accent">
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>&#x2B50;</div>
          <h2 style={{ color: 'var(--navy)' }}>{providerFull}</h2>
          <p style={{ color: 'var(--gray-500)', marginTop: '0.5rem' }}>
            {providerFirst} already has the full set of community recommendations. Kol hakavod for being willing to vouch for them — Mishelanu has it covered.
          </p>
        </div>
      </div>
    );
  }

  // Submitted
  if (submitted) {
    return <ThankYou providerFirst={providerFirst} thresholdReached={submitted.threshold_reached} />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError(null);

    // Light client-side validation; backend re-validates.
    if (!form.relationship_type) {
      setSubmitError('Please choose how you know ' + providerFirst + '.');
      return;
    }
    const personal = form.relationship_type.startsWith('personal_');
    if (personal && !form.service_description.trim()) {
      setSubmitError('Please describe the service ' + providerFirst + ' provided.');
      return;
    }
    if (!personal && !form.service_description.trim() && !form.how_long_known.trim()) {
      // For hearsay, we still want at least one piece of context.
      // Backend doesn't enforce this; nudge here.
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/recommendations/${token}`, form);
      setSubmitted({ threshold_reached: !!res.threshold_reached });
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const showServiceProvided = form.relationship_type === 'personal_work'
    || form.relationship_type === 'personal_both'
    || form.relationship_type === 'personal_known';
  const showLastServiceDate = form.relationship_type === 'personal_work'
    || form.relationship_type === 'personal_both';
  const isHearsay = form.relationship_type === 'hearsay';

  return (
    <div className="container" style={{ maxWidth: '640px' }}>

      <Intro providerFirst={providerFirst} />

      <ConfirmationGate
        providerFull={providerFull}
        knowsThem={knowsThem}
        setKnowsThem={setKnowsThem}
      />

      {knowsThem === false && (
        <div className="card" style={{ marginTop: '1rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--navy)', fontWeight: 500, marginBottom: '0.5rem' }}>
            No worries — this link may have reached you by mistake.
          </p>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
            If you think you received this in error, you can close this page.
          </p>
        </div>
      )}

      {knowsThem === true && (
        <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>

          <Section title={`How do you know ${providerFirst}?`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {RELATIONSHIP_OPTIONS.map(opt => (
                <label key={opt.value} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
                  padding: '0.75rem 1rem',
                  border: form.relationship_type === opt.value ? '1.5px solid var(--teal)' : '1.5px solid var(--gray-200)',
                  borderRadius: 'var(--radius)',
                  background: form.relationship_type === opt.value ? 'var(--teal-glow)' : 'var(--white)',
                  cursor: 'pointer', fontWeight: 400, margin: 0,
                  transition: 'all 0.12s ease',
                }}>
                  <input
                    type="radio"
                    name="relationship_type"
                    value={opt.value}
                    checked={form.relationship_type === opt.value}
                    onChange={() => setForm(f => ({ ...f, relationship_type: opt.value }))}
                    style={{ marginTop: '0.25rem' }}
                  />
                  <span style={{ fontSize: '0.9375rem', color: 'var(--gray-700)' }}>{opt.label}</span>
                </label>
              ))}
            </div>
          </Section>

          <Section title="Your details">
            <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginTop: '-0.5rem', marginBottom: '0.75rem' }}>
              We need your details to verify this recommendation.
            </p>

            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label>First name *</label>
                <input required value={form.recommender_first_name}
                  onChange={e => setForm(f => ({ ...f, recommender_first_name: e.target.value }))}
                  placeholder="Sarah" />
              </div>
              <div>
                <label>Surname *</label>
                <input required value={form.recommender_surname}
                  onChange={e => setForm(f => ({ ...f, recommender_surname: e.target.value }))}
                  placeholder="Cohen" />
              </div>
            </div>

            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label>Email *</label>
                <input required type="email" value={form.recommender_email}
                  onChange={e => setForm(f => ({ ...f, recommender_email: e.target.value }))}
                  placeholder="you@example.com" />
              </div>
              <div>
                <label>Phone *</label>
                <input required type="tel" value={form.recommender_phone}
                  onChange={e => setForm(f => ({ ...f, recommender_phone: e.target.value }))}
                  placeholder="07700 900 000" />
              </div>
            </div>

            <PrivacyNotice providerFirst={providerFirst} />
          </Section>

          <Section title={`Tell us about your experience with ${providerFirst}`}>
            <div className="form-group">
              <label>How long have you known {providerFirst} or their business?</label>
              <input
                value={form.how_long_known}
                onChange={e => setForm(f => ({ ...f, how_long_known: e.target.value }))}
                placeholder="e.g. About 3 years, Since 2019"
              />
            </div>

            {showLastServiceDate && (
              <div className="form-group">
                <label>When did you last use their services?</label>
                <input
                  value={form.last_service_date}
                  onChange={e => setForm(f => ({ ...f, last_service_date: e.target.value }))}
                  placeholder="e.g. Last month, Summer 2025"
                />
              </div>
            )}

            {showServiceProvided && !isHearsay && (
              <div className="form-group">
                <label>What service did they provide?{form.relationship_type !== 'personal_known' && ' *'}</label>
                <textarea
                  rows={4}
                  required={form.relationship_type === 'personal_work' || form.relationship_type === 'personal_both'}
                  value={form.service_description}
                  onChange={e => setForm(f => ({ ...f, service_description: e.target.value }))}
                  placeholder="e.g. Kitchen renovation, Boiler repair, Tax return preparation"
                />
              </div>
            )}

            {isHearsay && (
              <div className="form-group">
                <label>What have you heard about their work?</label>
                <textarea
                  rows={4}
                  value={form.service_description}
                  onChange={e => setForm(f => ({ ...f, service_description: e.target.value }))}
                  placeholder="e.g. My neighbour used them for plumbing and was very happy"
                />
              </div>
            )}
          </Section>

          <Section title="Interested in joining Mishelanu yourself?">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', cursor: 'pointer', fontWeight: 400, margin: 0 }}>
                <input
                  type="checkbox"
                  checked={form.opt_in_provider}
                  onChange={e => setForm(f => ({ ...f, opt_in_provider: e.target.checked }))}
                  style={{ marginTop: '0.2rem' }}
                />
                <span style={{ fontSize: '0.9375rem', color: 'var(--gray-700)' }}>I'd like to register as a service provider on Mishelanu</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', cursor: 'pointer', fontWeight: 400, margin: 0 }}>
                <input
                  type="checkbox"
                  checked={form.opt_in_user}
                  onChange={e => setForm(f => ({ ...f, opt_in_user: e.target.checked }))}
                  style={{ marginTop: '0.2rem' }}
                />
                <span style={{ fontSize: '0.9375rem', color: 'var(--gray-700)' }}>I'd like to learn more about joining Mishelanu as a user</span>
              </label>
            </div>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.8125rem', marginTop: '0.75rem' }}>
              We'll reach out to you about this separately.
            </p>
          </Section>

          {submitError && (
            <div className="msg-error" style={{ marginBottom: '1rem' }}>{submitError}</div>
          )}

          <button type="submit" className="btn btn-primary" disabled={submitting}
            style={{ width: '100%', fontSize: '1rem', padding: '0.875rem' }}>
            {submitting ? 'Sending your recommendation...' : 'Submit Recommendation'}
          </button>
        </form>
      )}
    </div>
  );
}

function Intro({ providerFirst }) {
  return (
    <div className="card" style={{
      background: 'var(--cream)',
      borderLeft: '4px solid var(--teal)',
      padding: '1.5rem 1.5rem 1.25rem',
      marginBottom: '1.5rem',
    }}>
      <h1 style={{ color: 'var(--navy)', fontSize: '1.375rem', marginBottom: '0.75rem', lineHeight: 1.3 }}>
        Someone you know wants to join Mishelanu
      </h1>
      <p style={{ color: 'var(--gray-700)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
        Mishelanu is a community trust network for Jewish and Israeli service providers in the UK. We connect our community with trusted tradespeople, professionals, and service providers — all recommended by people like you.
      </p>
      <p style={{ color: 'var(--gray-700)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
        <strong>{providerFirst}</strong> has asked to join and has listed you as someone who can vouch for them. Your recommendation helps our community know they can trust {providerFirst}'s work.
      </p>
      <p style={{ color: 'var(--gray-700)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
        This only takes a few minutes, and it means a lot — both to {providerFirst} and to the community. It's time-sensitive: please complete your recommendation within 48 hours so {providerFirst}'s application can move forward.
      </p>
      <p style={{ color: 'var(--navy)', fontSize: '0.9375rem', fontWeight: 500, marginBottom: 0 }}>
        Thank you for helping us keep our community connected.
      </p>
    </div>
  );
}

function ConfirmationGate({ providerFull, knowsThem, setKnowsThem }) {
  return (
    <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
      <h2 style={{ color: 'var(--navy)', fontSize: '1.125rem', marginBottom: '0.875rem', textAlign: 'center' }}>
        Do you know {providerFull}?
      </h2>
      <div className="flex gap-1" style={{ justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => setKnowsThem(true)}
          className={knowsThem === true ? 'btn btn-primary' : 'btn btn-outline'}
          style={{ minWidth: '120px' }}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => setKnowsThem(false)}
          className={knowsThem === false ? 'btn btn-secondary' : 'btn btn-outline'}
          style={{ minWidth: '120px' }}
        >
          No
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: '1rem', padding: '1.25rem 1.5rem' }}>
      <h3 style={{ color: 'var(--navy)', fontSize: '1rem', marginBottom: '1rem' }}>{title}</h3>
      {children}
    </div>
  );
}

function PrivacyNotice({ providerFirst }) {
  return (
    <div style={{
      background: 'var(--cream)',
      borderLeft: '4px solid var(--teal)',
      padding: '0.875rem 1rem',
      borderRadius: 'var(--radius)',
      marginTop: '0.5rem',
    }}>
      <p style={{ fontSize: '0.8125rem', color: 'var(--gray-700)', lineHeight: 1.55, margin: 0 }}>
        Your contact details are used only to verify this recommendation. We may contact you to confirm what you've shared. Once {providerFirst}'s profile is approved (or if their application doesn't go ahead), your email, phone, and surname are permanently deleted from our system. Only your first name and recommendation are kept.
      </p>
    </div>
  );
}

function ThankYou({ providerFirst, thresholdReached }) {
  return (
    <div className="container text-center mt-4" style={{ maxWidth: '520px' }}>
      <div className="card card-accent" style={{ padding: '2rem 1.5rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>&#x1F64F;</div>
        <h2 style={{ color: 'var(--teal-dark, var(--teal))', marginBottom: '0.75rem' }}>Thank you!</h2>
        <p style={{ color: 'var(--gray-700)', fontSize: '1rem', lineHeight: 1.55, marginBottom: '0.75rem' }}>
          Your recommendation for <strong>{providerFirst}</strong> has been submitted. You're helping build a stronger community. {providerFirst} is one step closer to being part of Mishelanu.
        </p>
        {thresholdReached && (
          <p style={{
            color: 'var(--navy)', fontSize: '0.9375rem', lineHeight: 1.55,
            marginTop: '1rem', padding: '0.875rem 1rem', background: 'var(--teal-glow)',
            borderRadius: 'var(--radius)', borderLeft: '4px solid var(--teal)',
          }}>
            Great news — {providerFirst} now has enough recommendations and their profile is being reviewed.
          </p>
        )}
      </div>
    </div>
  );
}
