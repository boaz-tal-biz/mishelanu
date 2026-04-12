import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../hooks/useApi.js';

export default function Profile() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const [provider, setProvider] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = searchParams.get('ref');
    const url = ref ? `/providers/${slug}?ref=${ref}` : `/providers/${slug}`;
    api.get(url)
      .then(setProvider)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug, searchParams]);

  if (loading) return <div className="container text-center mt-4">Loading...</div>;
  if (error) return <div className="container text-center mt-4" style={{ color: 'var(--coral)' }}>{error}</div>;

  // Not live states
  if (provider.status === 'pending') {
    return (
      <div className="container text-center mt-4">
        <div className="card" style={{ maxWidth: '480px', margin: '0 auto' }}>
          <h2 style={{ color: 'var(--navy)' }}>Profile in Progress</h2>
          <p style={{ color: 'var(--gray-500)', marginTop: '0.5rem' }}>{provider.message}</p>
        </div>
      </div>
    );
  }

  if (provider.status === 'suspended' || provider.status === 'awaiting_payment') {
    return (
      <div className="container text-center mt-4">
        <div className="card" style={{ maxWidth: '480px', margin: '0 auto' }}>
          <h2 style={{ color: 'var(--navy)' }}>Unavailable</h2>
          <p style={{ color: 'var(--gray-500)', marginTop: '0.5rem' }}>{provider.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '640px' }}>
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 style={{ color: 'var(--navy)', fontSize: '1.5rem' }}>{provider.full_name}</h1>
            {provider.business_name && (
              <p style={{ color: 'var(--gray-500)', fontSize: '0.9375rem' }}>{provider.business_name}</p>
            )}
          </div>
          {provider.verified && (
            <span className="badge badge-teal" style={{ fontSize: '0.8125rem' }}>
              Community Verified
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
            <h3 style={{ fontSize: '0.9375rem', color: 'var(--navy)', marginBottom: '0.375rem' }}>External Profiles</h3>
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

        {/* Contact buttons */}
        <div className="flex gap-1 mb-3">
          <a href={`tel:${provider.mobile_phone}`} className="btn btn-primary">
            Call
          </a>
          <a href={`https://wa.me/${provider.whatsapp_number?.replace(/[^0-9]/g, '')}`}
            className="btn btn-secondary" target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
        </div>

        {/* Recommendations */}
        <div>
          <h3 style={{ fontSize: '0.9375rem', color: 'var(--navy)', marginBottom: '0.75rem' }}>
            Recommendations ({provider.recommendation_count}/3)
          </h3>
          {provider.recommendations?.length > 0 ? (
            provider.recommendations.map((rec, i) => (
              <div key={i} style={{
                padding: '0.75rem',
                background: 'var(--gray-100)',
                borderRadius: '8px',
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
            <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>No recommendations yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
