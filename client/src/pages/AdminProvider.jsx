import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../hooks/useApi.js';

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
        full_name: p.full_name || '',
        business_name: p.business_name || '',
        address: p.address || '',
        mobile_phone: p.mobile_phone || '',
        whatsapp_number: p.whatsapp_number || '',
        business_phone: p.business_phone || '',
        email: p.email || '',
        raw_description: p.raw_description || '',
        raw_external_links: p.raw_external_links || '',
        profile_html: p.profile_html || '',
        enrichment_status: p.enrichment_status || 'pending',
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

  if (error && !provider) return <div className="container mt-4" style={{ color: 'var(--coral)' }}>{error}</div>;
  if (!provider) return <div className="container mt-4">Loading...</div>;

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <button className="btn btn-outline mb-2" onClick={() => navigate('/admin')} style={{ fontSize: '0.8125rem' }}>
        Back to Dashboard
      </button>

      <div className="card mb-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 style={{ color: 'var(--navy)', fontSize: '1.375rem' }}>{provider.full_name}</h1>
            {provider.business_name && <p style={{ color: 'var(--gray-500)' }}>{provider.business_name}</p>}
          </div>
          <div className="flex gap-1">
            <span className={`badge ${provider.status === 'active' ? 'badge-teal' : 'badge-coral'}`}>{provider.status}</span>
            <span className="badge badge-navy">{provider.enrichment_status}</span>
          </div>
        </div>

        {/* Status actions */}
        <div className="flex gap-1 flex-wrap mb-3">
          {provider.status !== 'suspended' && (
            <button className="btn btn-danger" style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
              onClick={() => {
                const reason = prompt('Suspension reason:');
                if (reason !== null) statusAction('suspend', { reason });
              }}>
              Suspend
            </button>
          )}
          {provider.status !== 'awaiting_payment' && (
            <button className="btn btn-outline" style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
              onClick={() => statusAction('awaiting-payment')}>
              Awaiting Payment
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
              Delete
            </button>
          )}
          <button className="btn btn-outline" style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
            onClick={downloadPdf}>
            Download Report PDF
          </button>
        </div>

        {error && <div style={{ color: 'var(--coral)', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</div>}

        {/* Stats row */}
        <div className="flex gap-1 flex-wrap mb-3">
          {[
            { label: 'Recommendations', value: provider.recommendation_count },
            { label: 'Total visits', value: provider.total_visits },
            { label: 'Matched visits', value: provider.matched_visits },
            { label: 'Leads sent', value: provider.leads_sent },
          ].map(s => (
            <div key={s.label} style={{ padding: '0.75rem', background: 'var(--gray-100)', borderRadius: '8px', textAlign: 'center', flex: '1 1 100px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--navy)' }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Edit toggle */}
        <div className="flex justify-between items-center mb-2">
          <h3 style={{ color: 'var(--navy)', fontSize: '1rem' }}>Provider Details</h3>
          <button className="btn btn-outline" style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
            onClick={() => editing ? saveEdits() : setEditing(true)}>
            {editing ? 'Save' : 'Edit'}
          </button>
        </div>

        {editing ? (
          <div>
            {['full_name', 'business_name', 'address', 'mobile_phone', 'whatsapp_number', 'business_phone', 'email'].map(field => (
              <div className="form-group" key={field}>
                <label>{field.replace(/_/g, ' ')}</label>
                <input value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
              </div>
            ))}
            <div className="form-group">
              <label>Raw description</label>
              <textarea rows={4} value={form.raw_description} onChange={e => setForm(f => ({ ...f, raw_description: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>External links</label>
              <textarea rows={2} value={form.raw_external_links} onChange={e => setForm(f => ({ ...f, raw_external_links: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Profile HTML (LLM-generated)</label>
              <textarea rows={6} value={form.profile_html} onChange={e => setForm(f => ({ ...f, profile_html: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Enrichment status</label>
              <select value={form.enrichment_status} onChange={e => setForm(f => ({ ...f, enrichment_status: e.target.value }))}>
                <option value="pending">Pending</option>
                <option value="processed">Processed</option>
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
                ['Address', provider.address || '—'],
                ['Live since', provider.live_at ? new Date(provider.live_at).toLocaleDateString('en-GB') : 'Not yet'],
                ['Registered', new Date(provider.created_at).toLocaleDateString('en-GB')],
                ['Slug', provider.slug],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ color: 'var(--gray-500)', fontSize: '0.75rem' }}>{label}</div>
                  <div>{val}</div>
                </div>
              ))}
            </div>

            {provider.service_categories?.length > 0 && (
              <div className="mt-2">
                <div style={{ color: 'var(--gray-500)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Categories</div>
                <div className="flex flex-wrap gap-1">
                  {provider.service_categories.map(c => <span key={c} className="badge badge-navy">{c}</span>)}
                </div>
              </div>
            )}

            {provider.raw_description && (
              <div className="mt-2">
                <div style={{ color: 'var(--gray-500)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Raw description</div>
                <p style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{provider.raw_description}</p>
              </div>
            )}

            {provider.profile_html && (
              <div className="mt-2">
                <div style={{ color: 'var(--gray-500)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Profile HTML (preview)</div>
                <div style={{ padding: '1rem', background: 'var(--gray-100)', borderRadius: '8px' }}
                  dangerouslySetInnerHTML={{ __html: provider.profile_html }} />
              </div>
            )}

            {provider.parsed_profile && (
              <div className="mt-2">
                <div style={{ color: 'var(--gray-500)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Parsed profile (JSON)</div>
                <pre style={{ fontSize: '0.75rem', background: 'var(--gray-100)', padding: '0.75rem', borderRadius: '8px', overflow: 'auto' }}>
                  {JSON.stringify(provider.parsed_profile, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="card">
        <h3 style={{ color: 'var(--navy)', fontSize: '1rem', marginBottom: '0.75rem' }}>
          Recommendations ({provider.recommendations?.length || 0}/3)
        </h3>
        {provider.recommendations?.map(rec => (
          <div key={rec.id} style={{ padding: '0.75rem', background: 'var(--gray-100)', borderRadius: '8px', marginBottom: '0.5rem' }}>
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
          <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>No recommendations yet.</p>
        )}
      </div>
    </div>
  );
}
