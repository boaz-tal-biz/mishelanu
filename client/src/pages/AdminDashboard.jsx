import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../hooks/useApi.js';

export default function AdminDashboard() {
  const [tab, setTab] = useState('alerts');
  const [alerts, setAlerts] = useState([]);
  const [providers, setProviders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [requests, setRequests] = useState([]);
  const [filters, setFilters] = useState({ status: '', enrichment_status: '', search: '' });
  const [authed, setAuthed] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/admin/check')
      .then(() => setAuthed(true))
      .catch(() => navigate('/admin/login'));
  }, [navigate]);

  useEffect(() => {
    if (!authed) return;
    if (tab === 'alerts') api.get('/admin/alerts').then(setAlerts).catch(() => {});
    if (tab === 'providers') {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.enrichment_status) params.set('enrichment_status', filters.enrichment_status);
      if (filters.search) params.set('search', filters.search);
      api.get(`/admin/providers?${params}`).then(setProviders).catch(() => {});
    }
    if (tab === 'categories') api.get('/admin/categories').then(setCategories).catch(() => {});
    if (tab === 'requests') api.get('/admin/requests').then(setRequests).catch(() => {});
  }, [authed, tab, filters]);

  async function dismissAlert(id) {
    await api.post(`/admin/alerts/${id}/dismiss`);
    setAlerts(a => a.filter(al => al.id !== id));
  }

  async function approveCategory(id) {
    await api.post(`/admin/categories/${id}/approve`);
    setCategories(c => c.map(cat => cat.id === id ? { ...cat, status: 'active' } : cat));
  }

  if (authed === null) return null;

  const tabs = [
    { key: 'alerts', label: `Alerts (${alerts.length})` },
    { key: 'providers', label: 'Providers' },
    { key: 'categories', label: 'Categories' },
    { key: 'requests', label: 'Requests' },
  ];

  return (
    <div className="container">
      <h1 style={{ color: 'var(--navy)', fontSize: '1.5rem', marginBottom: '1rem' }}>Admin Dashboard</h1>

      {/* Tab bar */}
      <div className="flex gap-1 mb-3" style={{ borderBottom: '1.5px solid var(--gray-200)', paddingBottom: '0.5rem' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '0.5rem 1rem', borderRadius: '6px 6px 0 0', border: 'none',
              background: tab === t.key ? 'var(--navy)' : 'transparent',
              color: tab === t.key ? 'var(--white)' : 'var(--gray-500)',
              fontWeight: 500, fontSize: '0.875rem',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {tab === 'alerts' && (
        <div>
          {alerts.length === 0 && <p style={{ color: 'var(--gray-500)' }}>No active alerts.</p>}
          {alerts.map(alert => (
            <div key={alert.id} className="card mb-2 flex items-center justify-between">
              <div>
                <span className={`badge ${alert.alert_type === 'new_registration' ? 'badge-teal' : alert.alert_type === 'category_suggestion' ? 'badge-navy' : 'badge-coral'}`} style={{ marginRight: '0.5rem' }}>
                  {alert.alert_type.replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: '0.875rem' }}>{alert.alert_message}</span>
                {alert.provider_name && (
                  <span style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginLeft: '0.5rem' }}>
                    — {alert.provider_name}
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                {alert.provider_id && (
                  <Link to={`/admin/provider/${alert.provider_id}`} className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}>
                    View
                  </Link>
                )}
                {alert.alert_type === 'category_suggestion' && alert.metadata?.category_id && (
                  <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
                    onClick={() => approveCategory(alert.metadata.category_id)}>
                    Approve
                  </button>
                )}
                <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
                  onClick={() => dismissAlert(alert.id)}>
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Providers */}
      {tab === 'providers' && (
        <div>
          <div className="flex gap-1 mb-2 flex-wrap">
            <input placeholder="Search..." value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              style={{ padding: '0.5rem 0.75rem', border: '1.5px solid var(--gray-200)', borderRadius: '8px', fontSize: '0.875rem' }} />
            <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              style={{ padding: '0.5rem 0.75rem', border: '1.5px solid var(--gray-200)', borderRadius: '8px', fontSize: '0.875rem' }}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="awaiting_payment">Awaiting payment</option>
            </select>
            <select value={filters.enrichment_status} onChange={e => setFilters(f => ({ ...f, enrichment_status: e.target.value }))}
              style={{ padding: '0.5rem 0.75rem', border: '1.5px solid var(--gray-200)', borderRadius: '8px', fontSize: '0.875rem' }}>
              <option value="">All enrichment</option>
              <option value="pending">Pending</option>
              <option value="processed">Processed</option>
              <option value="reviewed">Reviewed</option>
            </select>
          </div>

          <div className="card" style={{ overflow: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Categories</th>
                  <th>Status</th>
                  <th>Enrichment</th>
                  <th>Recs</th>
                  <th>Visits</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {providers.map(p => (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/provider/${p.id}`)}>
                    <td>
                      <strong>{p.full_name}</strong>
                      {p.business_name && <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{p.business_name}</div>}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {(p.service_categories || []).slice(0, 2).map(c => (
                          <span key={c} className="badge badge-navy">{c.split(': ').pop()}</span>
                        ))}
                        {(p.service_categories || []).length > 2 && <span className="badge badge-navy">+{p.service_categories.length - 2}</span>}
                      </div>
                    </td>
                    <td><span className={`badge ${p.status === 'active' ? 'badge-teal' : 'badge-coral'}`}>{p.status}</span></td>
                    <td><span className="badge badge-navy">{p.enrichment_status}</span></td>
                    <td>{p.recommendation_count}</td>
                    <td>{p.total_visits}</td>
                    <td style={{ fontSize: '0.8125rem' }}>{new Date(p.created_at).toLocaleDateString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {providers.length === 0 && <p className="text-center mt-2" style={{ color: 'var(--gray-500)' }}>No providers found.</p>}
          </div>
        </div>
      )}

      {/* Categories */}
      {tab === 'categories' && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Subcategory</th>
                <th>Status</th>
                <th>Suggested by</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {categories.map(c => (
                <tr key={c.id}>
                  <td>{c.category}</td>
                  <td>{c.subcategory}</td>
                  <td><span className={`badge ${c.status === 'active' ? 'badge-teal' : 'badge-coral'}`}>{c.status}</span></td>
                  <td style={{ fontSize: '0.8125rem' }}>{c.suggested_by_name || '—'}</td>
                  <td>
                    {c.status === 'pending_approval' && (
                      <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
                        onClick={() => approveCategory(c.id)}>
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Service Requests */}
      {tab === 'requests' && (
        <div className="card" style={{ overflow: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Message</th>
                <th>Service</th>
                <th>Provider</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id}>
                  <td style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleDateString('en-GB')}</td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.raw_message}
                  </td>
                  <td>{r.parsed_service_needed}</td>
                  <td>{r.matched_provider_name || '—'}</td>
                  <td><span className="badge badge-navy">{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {requests.length === 0 && <p className="text-center mt-2" style={{ color: 'var(--gray-500)' }}>No service requests yet.</p>}
        </div>
      )}
    </div>
  );
}
