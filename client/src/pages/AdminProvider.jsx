import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../hooks/useApi.js';

const STATUS_LABELS = {
  active: 'Active',
  suspended: 'Paused',
  awaiting_payment: 'Payment Due',
  deleted: 'Removed',
};

const STATUS_COLOURS = {
  active: 'var(--teal)',
  suspended: 'var(--coral)',
  awaiting_payment: 'var(--gold)',
  deleted: '#888',
};

const ENRICHMENT_LABELS = {
  pending: 'Being Prepared',
  processed: 'Ready for Review',
  reviewed: 'Reviewed',
};

export default function AdminProvider() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/admin/check').catch(() => navigate('/admin/login'));
    loadProvider();
  }, [id]);

  async function loadProvider() {
    try {
      const p = await api.get(`/admin/providers/${id}`);
      setProvider(p);
      setForm({
        first_name: p.first_name || '',
        surname: p.surname || '',
        business_name: p.business_name || '',
        address: p.address || '',
        area_covered: p.area_covered || '',
        mobile_phone: p.mobile_phone || '',
        whatsapp_number: p.whatsapp_number || '',
        business_phone: p.business_phone || '',
        email: p.email || '',
        raw_description: p.raw_description || '',
        raw_external_links: p.raw_external_links || '',
        profile_html: p.profile_html || '',
        enrichment_status: p.enrichment_status || 'pending',
        vat_number: p.vat_number || '',
        companies_house_number: p.companies_house_number || '',
        sole_trader_utr: p.sole_trader_utr || '',
        years_in_business: p.years_in_business ?? '',
        affiliations: p.affiliations || '',
      });
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveEdits() {
    try {
      await api.put(`/admin/providers/${id}`, form);
      setEditing(false);
      loadProvider();
    } catch (err) {
      setError(err.message);
    }
  }

  async function statusAction(action, body = {}) {
    if (!confirm(`Are you sure you want to ${action} this provider?`)) return;
    try {
      await api.post(`/admin/providers/${id}/${action}`, body);
      loadProvider();
    } catch (err) {
      setError(err.message);
    }
  }

  async function downloadPdf() {
    const res = await fetch(`/api/admin/providers/${id}/report/pdf`, { credentials: 'include' });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${provider.full_name.replace(/\s+/g, '-')}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const EDIT_FIELD_LABELS = {
    first_name: 'First name',
    surname: 'Surname',
    business_name: 'Business name',
    address: 'Location',
    area_covered: 'Areas covered',
    mobile_phone: 'Mobile phone',
    whatsapp_number: 'WhatsApp number',
    business_phone: 'Business phone',
    email: 'Email',
    vat_number: 'VAT number',
    companies_house_number: 'Companies House number',
    sole_trader_utr: 'Sole trader UTR',
    years_in_business: 'Years in business',
    affiliations: 'Affiliations & credentials',
  };

  if (error && !provider) return <div className="container mt-4" style={{ color: 'var(--coral)' }}>{error}</div>;
  if (!provider) return <div className="container mt-4"><span className="loading-text">Mishelanu is loading...</span></div>;

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <button className="btn btn-outline mb-2" onClick={() => navigate('/admin')} style={{ fontSize: '0.8125rem' }}>
        &#x2190; Back to Dashboard
      </button>

      <div className="card mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <h1 style={{ color: 'var(--navy)', fontSize: '1.375rem', margin: 0 }}>{provider.full_name}</h1>
            <span style={{
              padding: '0.375rem 1rem',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.875rem',
              fontWeight: 600,
              background: STATUS_COLOURS[provider.status] || '#888',
              color: 'white',
            }}>
              {STATUS_LABELS[provider.status] || provider.status}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {provider.business_name && <span style={{ color: 'var(--gray-500)' }}>{provider.business_name}</span>}
            <span className="badge badge-gold">{ENRICHMENT_LABELS[provider.enrichment_status] || provider.enrichment_status}</span>
          </div>
        </div>

        {/* Status actions */}
        <div className="flex gap-1 flex-wrap mb-3">
          {provider.status !== 'suspended' && (
            <button className="btn btn-danger" style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
              onClick={() => {
                const reason = prompt('Reason for pausing:');
                if (reason !== null) statusAction('suspend', { reason });
              }}>
              Pause
            </button>
          )}
          {provider.status !== 'awaiting_payment' && (
            <button className="btn btn-outline" style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
              onClick={() => statusAction('awaiting-payment')}>
              Mark Payment Due
            </button>
          )}
          {(provider.status === 'suspended' || provider.status === 'awaiting_payment') && (
            <button className="btn btn-primary" style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
              onClick={() => statusAction('reactivate')}>
              Reactivate
            </button>
          )}
          {provider.status !== 'deleted' && (
            <button className="btn btn-danger" style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
              onClick={() => statusAction('delete')}>
              Remove
            </button>
          )}
          <button className="btn btn-outline" style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
            onClick={downloadPdf}>
            &#x1F4C4; Download Report
          </button>
        </div>

        {error && <div className="msg-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {/* Stats row */}
        <div className="flex gap-1 flex-wrap mb-3">
          {[
            { label: 'Recommendations', value: provider.recommendation_count },
            { label: 'Profile views', value: provider.total_visits },
            { label: 'Matched views', value: provider.matched_visits },
            { label: 'Leads sent', value: provider.leads_sent },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Edit toggle */}
        <div className="flex justify-between items-center mb-2">
          <h3 className="section-heading" style={{ marginBottom: 0 }}>Provider Details</h3>
          <button className="btn btn-outline" style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
            onClick={() => editing ? saveEdits() : setEditing(true)}>
            {editing ? 'Save Changes' : 'Edit'}
          </button>
        </div>

        {editing ? (
          <div>
            {Object.entries(EDIT_FIELD_LABELS).map(([field, label]) => (
              <div className="form-group" key={field}>
                <label>{label}</label>
                <input value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
              </div>
            ))}
            <div className="form-group">
              <label>Description (original)</label>
              <textarea rows={4} value={form.raw_description} onChange={e => setForm(f => ({ ...f, raw_description: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Online profiles and links</label>
              <textarea rows={2} value={form.raw_external_links} onChange={e => setForm(f => ({ ...f, raw_external_links: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Profile content (auto-generated)</label>
              <textarea rows={6} value={form.profile_html} onChange={e => setForm(f => ({ ...f, profile_html: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Profile stage</label>
              <select value={form.enrichment_status} onChange={e => setForm(f => ({ ...f, enrichment_status: e.target.value }))}>
                <option value="pending">Being Prepared</option>
                <option value="processed">Ready for Review</option>
                <option value="reviewed">Reviewed</option>
              </select>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
              {[
                ['Email', provider.email],
                ['Mobile', provider.mobile_phone],
                ['WhatsApp', provider.whatsapp_number],
                ['Business phone', provider.business_phone || '—'],
                ['Location', provider.address || '—'],
                ['Live since', provider.live_at ? new Date(provider.live_at).toLocaleDateString('en-GB') : 'Getting ready'],
                ['Joined', new Date(provider.created_at).toLocaleDateString('en-GB')],
                ['Profile link', `/provider/${provider.slug}`],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ color: 'var(--gray-500)', fontSize: '0.75rem' }}>{label}</div>
                  <div>{val}</div>
                </div>
              ))}
            </div>

            {provider.service_categories?.length > 0 && (
              <div className="mt-2">
                <div style={{ color: 'var(--gray-500)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Services</div>
                <div className="flex flex-wrap gap-1">
                  {provider.service_categories.map(c => <span key={c} className="badge badge-navy">{c}</span>)}
                </div>
              </div>
            )}

            {provider.raw_description && (
              <div className="mt-2">
                <div style={{ color: 'var(--gray-500)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Original description</div>
                <p style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{provider.raw_description}</p>
              </div>
            )}

            {provider.profile_html && (
              <div className="mt-2">
                <div style={{ color: 'var(--gray-500)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Profile preview</div>
                <div style={{ padding: '1rem', background: 'var(--gray-100)', borderRadius: 'var(--radius)' }}
                  dangerouslySetInnerHTML={{ __html: provider.profile_html }} />
              </div>
            )}

            {provider.parsed_profile && (
              <div className="mt-2">
                <div style={{ color: 'var(--gray-500)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Structured profile data</div>
                <pre style={{ fontSize: '0.75rem', background: 'var(--gray-100)', padding: '0.75rem', borderRadius: 'var(--radius)', overflow: 'auto' }}>
                  {JSON.stringify(provider.parsed_profile, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="card">
        <h3 className="section-heading">
          Community Recommendations ({provider.recommendations?.length || 0}/3)
        </h3>
        {provider.recommendations?.map(rec => (
          <div key={rec.id} style={{ padding: '0.875rem', background: 'var(--gray-100)', borderRadius: 'var(--radius)', marginBottom: '0.5rem' }}>
            <div className="flex items-center justify-between">
              <strong style={{ fontSize: '0.875rem' }}>{rec.recommender_name}</strong>
              <span className="badge badge-navy">{rec.relationship}</span>
            </div>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{rec.recommendation_text}</p>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
              {new Date(rec.created_at).toLocaleDateString('en-GB')}
              {rec.recommender_email && ` — ${rec.recommender_email}`}
            </div>
          </div>
        ))}
        {(!provider.recommendations || provider.recommendations.length === 0) && (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <p>Waiting for community recommendations.</p>
          </div>
        )}
      </div>
    </div>
  );
}
