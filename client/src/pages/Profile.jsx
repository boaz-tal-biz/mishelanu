import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { api } from '../hooks/useApi.js';

export default function Profile() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = searchParams.get('token');
  const ref = searchParams.get('ref');

  const [provider, setProvider] = useState(null);
  const [managed, setManaged] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchManagement = useCallback(async () => {
    try {
      const data = await api.get(`/providers/${slug}/manage?token=${encodeURIComponent(token)}`);
      setManaged(data);
      setProvider(null);
      return true;
    } catch {
      return false;
    }
  }, [slug, token]);

  const fetchPublic = useCallback(async () => {
    const url = ref ? `/providers/${slug}?ref=${ref}` : `/providers/${slug}`;
    try {
      const data = await api.get(url);
      setProvider(data);
      setManaged(null);
    } catch (err) {
      setError(err.message);
    }
  }, [slug, ref]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    (async () => {
      if (token) {
        const ok = await fetchManagement();
        if (!ok) {
          // Bad token — strip it from URL and fall back to public view
          const next = new URLSearchParams(searchParams);
          next.delete('token');
          setSearchParams(next, { replace: true });
          await fetchPublic();
        }
      } else {
        await fetchPublic();
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, token]);

  if (loading) return <div className="container text-center mt-4"><span className="loading-text">Mishelanu is loading this profile...</span></div>;
  if (error && !provider && !managed) {
    return <div className="container text-center mt-4" style={{ color: 'var(--coral)' }}>{error}</div>;
  }

  if (managed) {
    return <ManagementView managed={managed} refresh={fetchManagement} />;
  }

  return <PublicView provider={provider} />;
}

// ────────────────────────────────────────────────────────────────────────────
// Public view (existing behaviour — unchanged shape)
// ────────────────────────────────────────────────────────────────────────────
function PublicView({ provider }) {
  if (!provider) return null;

  if (provider.status === 'pending') {
    return (
      <div className="container text-center mt-4">
        <div className="card card-accent-gold" style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>&#x1F527;</div>
          <h2 style={{ color: 'var(--navy)' }}>Mishelanu is getting this profile ready</h2>
          <p style={{ color: 'var(--gray-500)', marginTop: '0.5rem' }}>{provider.message}</p>
        </div>
      </div>
    );
  }

  if (provider.status === 'suspended' || provider.status === 'awaiting_payment') {
    return (
      <div className="container text-center mt-4">
        <div className="card" style={{ maxWidth: '480px', margin: '0 auto' }}>
          <h2 style={{ color: 'var(--navy)' }}>This profile is currently unavailable</h2>
          <p style={{ color: 'var(--gray-500)', marginTop: '0.5rem' }}>{provider.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '640px' }}>
      <ProfileBody provider={provider} />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Management view (token-authenticated, the provider's own dashboard)
// ────────────────────────────────────────────────────────────────────────────
function ManagementView({ managed, refresh }) {
  const isLive = !!managed.live_at;
  const profileUrl = `${window.location.origin}/provider/${managed.slug}`;
  const recommendationUrl = `${window.location.origin}/recommend/${managed.recommendation_token}`;

  return (
    <div className="container" style={{ maxWidth: '640px' }}>
      {isLive ? (
        <LiveBanner profileUrl={profileUrl} />
      ) : (
        <ApplicationBanner managed={managed} refresh={refresh} profileUrl={profileUrl} recommendationUrl={recommendationUrl} />
      )}

      {/* When live, render the public-facing profile content below the banner */}
      {isLive && <ProfileBody provider={{ ...managed, full_name: managed.full_name }} />}
    </div>
  );
}

function LiveBanner({ profileUrl }) {
  return (
    <div className="card" style={{
      background: 'var(--cream)',
      borderLeft: '4px solid var(--teal)',
      marginBottom: '1.5rem',
    }}>
      <h2 style={{ color: 'var(--navy)', marginBottom: '0.5rem' }}>Your profile is live!</h2>
      <p style={{ color: 'var(--gray-700)', marginBottom: '1rem' }}>
        Mazel tov — Mishelanu is now matching you with people who need your services.
      </p>
      <CopyRow label="Your public profile" value={profileUrl} />
      <p style={{ color: 'var(--gray-500)', fontSize: '0.8125rem', marginTop: '0.75rem', fontStyle: 'italic' }}>
        Bookmark this page to check your status anytime.
      </p>
    </div>
  );
}

function ApplicationBanner({ managed, refresh, profileUrl, recommendationUrl }) {
  const recCount = managed.recommendation_count || 0;
  const adminApproved = !!managed.admin_approved;

  return (
    <div className="card" style={{
      background: 'var(--cream)',
      borderLeft: '4px solid var(--navy)',
      marginBottom: '1rem',
    }}>
      <h2 style={{ color: 'var(--navy)', marginBottom: '0.25rem' }}>Your profile is not yet active</h2>
      <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
        Mishelanu is helping you get ready. Here's where you are.
      </p>

      <ProgressBar recCount={recCount} adminApproved={adminApproved} />

      <div style={{ marginTop: '1.5rem' }}>
        <CopyRow label="Your public profile link" value={profileUrl} />
      </div>

      <div style={{ marginTop: '1rem' }}>
        <CopyRow label="Recommendation link" value={recommendationUrl} />
        <p style={{ color: 'var(--gray-500)', fontSize: '0.8125rem', marginTop: '0.375rem' }}>
          Share this link with people who can recommend you. You need at least 3 recommendations within 72 hours.
        </p>
      </div>

      <DeadlineBlock managed={managed} refresh={refresh} />

      {recCount >= 3 && !adminApproved && (
        <PingAdminBlock slug={managed.slug} token={managed.recommendation_token /* not used; we read management from URL */} />
      )}

      <p style={{ color: 'var(--gray-500)', fontSize: '0.75rem', marginTop: '1rem', fontStyle: 'italic' }}>
        Bookmark this page to check your application status.
      </p>
    </div>
  );
}

function ProgressBar({ recCount, adminApproved }) {
  // Stage colours: complete = teal, current = navy, pending = light grey
  const colours = {
    complete: 'var(--teal)',
    current: 'var(--navy)',
    pending: '#e0e0e0',
  };

  const recsComplete = recCount >= 3;
  const adminCurrent = recsComplete && !adminApproved;
  const adminComplete = adminApproved;
  const liveComplete = false; // banner is only shown when not live

  const stages = [
    { label: 'Registered', state: 'complete' },
    {
      label: 'Recommendations',
      sub: `${recCount} of 3 received`,
      state: recsComplete ? 'complete' : (recCount > 0 ? 'current' : 'current'),
      partial: recCount / 3,
    },
    {
      label: 'Admin Review',
      sub: recsComplete ? (adminApproved ? 'Approved' : 'Awaiting review') : null,
      state: adminComplete ? 'complete' : (adminCurrent ? 'current' : 'pending'),
    },
    {
      label: 'Live',
      state: liveComplete ? 'complete' : 'pending',
    },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', alignItems: 'flex-end' }}>
        {stages.map((s, i) => {
          const fillColor = colours[s.state];
          const partial = s.partial !== undefined ? Math.min(1, Math.max(0, s.partial)) : 1;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <div style={{
                height: '6px', borderRadius: '3px',
                background: '#e0e0e0', position: 'relative', overflow: 'hidden',
              }}>
                {s.state !== 'pending' && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    width: `${partial * 100}%`,
                    background: fillColor,
                    borderRadius: '3px',
                    transition: 'width 0.3s ease',
                  }} />
                )}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: s.state === 'pending' ? 'var(--gray-500)' : 'var(--navy)' }}>
                {s.label}
              </div>
              {s.sub && (
                <div style={{ fontSize: '0.6875rem', color: s.state === 'complete' ? 'var(--teal-dark, var(--teal))' : 'var(--navy)' }}>
                  {s.sub}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DeadlineBlock({ managed, refresh }) {
  const { application_deadline, restart_count, application_expired } = managed;
  const [now, setNow] = useState(() => Date.now());
  const [restarting, setRestarting] = useState(false);
  const [restartError, setRestartError] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const deadlineMs = application_deadline ? new Date(application_deadline).getTime() : null;
  const remainingMs = deadlineMs ? deadlineMs - now : null;
  const expired = remainingMs !== null && remainingMs <= 0;

  if (application_expired) {
    return (
      <div style={{ marginTop: '1rem', padding: '0.875rem 1rem', background: 'var(--white)', borderRadius: 'var(--radius)', border: '1.5px solid var(--coral)' }}>
        <p style={{ color: 'var(--coral)', fontWeight: 500, marginBottom: '0.5rem' }}>
          Your application has expired.
        </p>
        <p style={{ color: 'var(--gray-700)', fontSize: '0.875rem' }}>
          Please contact us to re-register. <Link to="/contact" style={{ color: 'var(--navy)', fontWeight: 500 }}>Send Mishelanu a message</Link>.
        </p>
      </div>
    );
  }

  if (expired) {
    if (restart_count < 2) {
      return (
        <div style={{ marginTop: '1rem', padding: '0.875rem 1rem', background: 'var(--white)', borderRadius: 'var(--radius)', border: '1.5px solid var(--coral)' }}>
          <p style={{ color: 'var(--coral)', fontWeight: 500, marginBottom: '0.5rem' }}>
            Your 72-hour window has lapsed.
          </p>
          <p style={{ color: 'var(--gray-700)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
            You have {2 - restart_count} restart{2 - restart_count === 1 ? '' : 's'} remaining.
          </p>
          {restartError && <div className="msg-error" style={{ marginBottom: '0.5rem' }}>{restartError}</div>}
          <button
            type="button"
            disabled={restarting}
            onClick={async () => {
              setRestarting(true);
              setRestartError(null);
              try {
                const params = new URLSearchParams(window.location.search);
                const token = params.get('token');
                await api.post(`/providers/${managed.slug}/restart`, { management_token: token });
                await refresh();
              } catch (err) {
                setRestartError(err.message);
              } finally {
                setRestarting(false);
              }
            }}
            className="btn btn-primary"
          >
            {restarting ? 'Restarting...' : 'Restart Application'}
          </button>
        </div>
      );
    }
    // Should never hit if backend is doing its job — but render expired state
    return (
      <div style={{ marginTop: '1rem', padding: '0.875rem 1rem', background: 'var(--white)', borderRadius: 'var(--radius)', border: '1.5px solid var(--coral)' }}>
        <p style={{ color: 'var(--coral)', fontWeight: 500 }}>Your application has expired.</p>
        <p style={{ color: 'var(--gray-700)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          <Link to="/contact" style={{ color: 'var(--navy)', fontWeight: 500 }}>Contact Mishelanu</Link> to re-register.
        </p>
      </div>
    );
  }

  // Countdown
  const hoursLeft = remainingMs / (1000 * 60 * 60);
  const warning = hoursLeft < 12;
  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
        Time remaining
      </div>
      <div style={{
        fontSize: '1.25rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
        color: warning ? 'var(--coral)' : 'var(--navy)',
      }}>
        {formatRemaining(remainingMs)}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.125rem' }}>
        {restart_count > 0 && `Restart ${restart_count} of 2 used. `}
        Mishelanu's 72-hour window for getting your first recommendations.
      </div>
    </div>
  );
}

function formatRemaining(ms) {
  if (ms === null || ms <= 0) return '0h 0m';
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours >= 12) return `${hours}h ${minutes}m`;
  return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

function PingAdminBlock({ slug }) {
  const lsKey = `mishelanu:ping:${slug}`;
  const [lastPing, setLastPing] = useState(() => {
    const v = localStorage.getItem(lsKey);
    return v ? Number(v) : 0;
  });
  const [pinging, setPinging] = useState(false);
  const [pingError, setPingError] = useState(null);

  const blockedUntil = lastPing + 24 * 60 * 60 * 1000;
  const blocked = Date.now() < blockedUntil;

  async function ping() {
    setPinging(true);
    setPingError(null);
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      await api.post(`/providers/${slug}/ping-admin`, { management_token: token });
      const now = Date.now();
      localStorage.setItem(lsKey, String(now));
      setLastPing(now);
    } catch (err) {
      // Backend rate-limit returns 429 with a message — treat as 'already pinged'
      if (/already received your nudge/i.test(err.message)) {
        const now = Date.now();
        localStorage.setItem(lsKey, String(now));
        setLastPing(now);
      } else {
        setPingError(err.message);
      }
    } finally {
      setPinging(false);
    }
  }

  return (
    <div style={{ marginTop: '1.25rem', padding: '0.875rem 1rem', background: 'var(--white)', borderRadius: 'var(--radius)', border: '1.5px solid var(--gray-200)' }}>
      {blocked ? (
        <p style={{ color: 'var(--navy)', fontWeight: 500, fontSize: '0.875rem' }}>
          Admin has been notified — we'll review your profile shortly.
        </p>
      ) : (
        <>
          <p style={{ color: 'var(--gray-700)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            You have 3 recommendations and are waiting for Mishelanu to approve your profile.
          </p>
          {pingError && <div className="msg-error" style={{ marginBottom: '0.5rem' }}>{pingError}</div>}
          <button type="button" onClick={ping} disabled={pinging} className="btn btn-secondary">
            {pinging ? 'Notifying admin...' : 'Ping Admin'}
          </button>
        </>
      )}
    </div>
  );
}

function CopyRow({ label, value }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      {label && <label style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', fontWeight: 500 }}>{label}</label>}
      <div className="flex items-center gap-1">
        <code style={{ flex: 1, padding: '0.625rem', background: 'var(--white)', border: '1px solid var(--gray-200)', borderRadius: '8px', fontSize: '0.8125rem', wordBreak: 'break-all' }}>
          {value}
        </code>
        <button
          type="button"
          className="btn btn-outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              // clipboard unavailable (HTTP, etc.) — show fallback by selecting the code
            }
          }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Shared profile body (rendered on the public path AND on the live management view)
// ────────────────────────────────────────────────────────────────────────────
function ProfileBody({ provider }) {
  return (
    <div className="card card-accent">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 style={{ color: 'var(--navy)', fontSize: '1.5rem' }}>{provider.full_name}</h1>
          {provider.business_name && (
            <p style={{ color: 'var(--gray-500)', fontSize: '0.9375rem' }}>{provider.business_name}</p>
          )}
        </div>
        {provider.verified && (
          <span className="badge badge-teal" style={{ fontSize: '0.8125rem', padding: '0.375rem 0.875rem' }}>
            &#x2B50; Community Verified
          </span>
        )}
      </div>

      {provider.service_categories?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {provider.service_categories.map(cat => (
            <span key={cat} className="badge badge-navy">{cat}</span>
          ))}
        </div>
      )}

      {provider.profile_html ? (
        <div className="mb-3" dangerouslySetInnerHTML={{ __html: provider.profile_html }} />
      ) : provider.parsed_profile ? (
        <div className="mb-3">
          {provider.parsed_profile.experience && <p><strong>Experience:</strong> {provider.parsed_profile.experience}</p>}
          {provider.parsed_profile.specialisations && <p><strong>Specialisations:</strong> {provider.parsed_profile.specialisations}</p>}
          {provider.parsed_profile.service_areas && <p><strong>Areas served:</strong> {provider.parsed_profile.service_areas}</p>}
          {provider.parsed_profile.languages && <p><strong>Languages:</strong> {provider.parsed_profile.languages}</p>}
          {provider.parsed_profile.qualifications && <p><strong>Qualifications:</strong> {provider.parsed_profile.qualifications}</p>}
        </div>
      ) : null}

      {provider.raw_external_links && (
        <div className="mb-3">
          <h3 style={{ fontSize: '0.9375rem', color: 'var(--navy)', marginBottom: '0.375rem' }}>Find me online</h3>
          {provider.raw_external_links.split(/[\n,]+/).filter(Boolean).map((link, i) => {
            const url = link.trim();
            return (
              <div key={i}>
                <a href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noopener noreferrer">
                  {url}
                </a>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-1 mb-3">
        <a href={`tel:${provider.mobile_phone}`} className="btn btn-primary">
          &#x1F4DE; Call
        </a>
        <a href={`https://wa.me/${provider.whatsapp_number?.replace(/[^0-9]/g, '')}`}
          className="btn btn-secondary" target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>
      </div>

      <div>
        <h3 style={{ fontSize: '0.9375rem', color: 'var(--navy)', marginBottom: '0.75rem' }}>
          Community Recommendations ({provider.recommendation_count}/3)
        </h3>
        {provider.recommendations?.length > 0 ? (
          provider.recommendations.map((rec, i) => (
            <div key={i} style={{
              padding: '0.875rem',
              background: 'var(--gray-100)',
              borderRadius: 'var(--radius)',
              marginBottom: '0.5rem'
            }}>
              <div className="flex items-center justify-between mb-1">
                <strong style={{ fontSize: '0.875rem' }}>{rec.recommender_name}</strong>
                <span className="badge badge-navy">{rec.relationship}</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--gray-700)' }}>{rec.recommendation_text}</p>
            </div>
          ))
        ) : (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <p>Waiting for the first community recommendation.</p>
          </div>
        )}
      </div>
    </div>
  );
}
