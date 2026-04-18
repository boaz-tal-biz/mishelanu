import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const STATUS_LABELS = {
  active: 'Active',
  suspended: 'Paused',
  awaiting_payment: 'Payment Due',
  deleted: 'Removed',
};

const ENRICHMENT_LABELS = {
  pending: 'Being Prepared',
  processed: 'Ready for Review',
  reviewed: 'Reviewed',
};


const REQUEST_STATUS_LABELS = {
  new: 'New',
  parsed: 'Received',
  sent: 'Sent to Provider',
  provider_interested: 'Provider Interested',
  provider_declined: 'Provider Declined',
  requester_notified: 'Connected',
  completed: 'Completed',
};

const CAT_STATUS_BADGE_STYLE = {
  suggested: { background: 'var(--gold-light, #fff4d6)', color: '#8a6200', border: '1px solid var(--gold, #d4a017)' },
  active: { background: 'var(--teal-glow, #d8f3ed)', color: 'var(--teal-dark, #1a8773)', border: '1px solid var(--teal)' },
  deactivated: { background: '#ececec', color: '#666', border: '1px solid #c7c7c7' },
  pending_approval: { background: 'var(--gold-light, #fff4d6)', color: '#8a6200', border: '1px solid var(--gold, #d4a017)' },
};

const CAT_STATUS_LABEL = {
  suggested: 'Suggested',
  active: 'Active',
  deactivated: 'Deactivated',
  pending_approval: 'Suggested',
};

function RequestCard({ request: r }) {
  const [expanded, setExpanded] = useState(false);
  const statusBadgeClass = ['new', 'parsed'].includes(r.status) ? 'badge-gold'
    : ['provider_interested', 'requester_notified', 'completed'].includes(r.status) ? 'badge-teal'
    : r.status === 'provider_declined' ? 'badge-coral'
    : 'badge-navy';

  return (
    <div className="card-flat mb-2" style={{ padding: '1rem 1.25rem' }}>
      <div className="flex items-center justify-between" style={{ gap: '0.75rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-1" style={{ marginBottom: '0.25rem', flexWrap: 'wrap' }}>
            <span className={`badge ${statusBadgeClass}`}>{REQUEST_STATUS_LABELS[r.status] || r.status}</span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
              {new Date(r.created_at).toLocaleDateString('en-GB')}
            </span>
          </div>
          <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>
            {r.parsed_service_needed || 'Service request'}
          </div>
          {r.parsed_location && (
            <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: '0.125rem' }}>
              {r.parsed_location}
            </div>
          )}
        </div>
        {r.matched_provider_name && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="btn btn-outline"
            style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', whiteSpace: 'nowrap' }}
          >
            {expanded ? 'Hide details' : 'View match'}
          </button>
        )}
      </div>

      {expanded && r.matched_provider_name && (
        <div style={{
          marginTop: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--gray-200)',
          fontSize: '0.875rem',
        }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '0.25rem' }}>
            <span style={{ fontWeight: 500 }}>Matched with: {r.matched_provider_name}</span>
            {r.matched_provider_id && (
              <Link to={`/admin/provider/${r.matched_provider_id}`} className="btn btn-outline"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}>
                Provider profile
              </Link>
            )}
          </div>
          {r.raw_message && (
            <div style={{ marginTop: '0.5rem', padding: '0.625rem 0.875rem', background: 'var(--gray-100)', borderRadius: 'var(--radius)', fontSize: '0.8125rem', color: 'var(--gray-700)' }}>
              {r.raw_message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('alerts');
  const [alerts, setAlerts] = useState([]);
  const [providers, setProviders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [requests, setRequests] = useState([]);
  const [filters, setFilters] = useState({ status: '', enrichment_status: '', search: '' });
  const navigate = useNavigate();
  const { isAuthenticated, hasRole, authApi: api, logout } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
      return;
    }
    if (!hasRole('admin')) {
      navigate('/monitor');
    }
  }, [isAuthenticated, hasRole, navigate]);

  const [alertCounts, setAlertCounts] = useState({ action_required: 0, informational: 0, system_log: 0 });
  const reloadAlertCounts = () => api.get('/admin/alerts/counts').then(setAlertCounts).catch(() => {});
  const reloadCategories = () => api.get('/admin/categories').then(setCategories).catch(() => {});

  useEffect(() => {
    if (!isAuthenticated || !hasRole('admin')) return;
    reloadAlertCounts();
    const interval = setInterval(reloadAlertCounts, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !hasRole('admin')) return;
    if (tab === 'providers') {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.enrichment_status) params.set('enrichment_status', filters.enrichment_status);
      if (filters.search) params.set('search', filters.search);
      api.get(`/admin/providers?${params}`).then(setProviders).catch(() => {});
    }
    if (tab === 'categories') reloadCategories();
    if (tab === 'requests') api.get('/admin/requests').then(setRequests).catch(() => {});
  }, [isAuthenticated, tab, filters]);

  if (!isAuthenticated || !hasRole('admin')) return null;

  const totalAlerts = alertCounts.action_required + alertCounts.informational;
  const tabs = [
    { key: 'alerts', label: `Alerts${totalAlerts > 0 ? ` (${totalAlerts})` : ''}`, icon: '&#x1F514;' },
    { key: 'providers', label: 'Providers', icon: '&#x1F465;' },
    { key: 'categories', label: 'Categories', icon: '&#x1F4C2;' },
    { key: 'requests', label: 'Requests', icon: '&#x1F4E8;' },
    ...(hasRole('super_admin') ? [{ key: 'users', label: 'Users', icon: '&#x1F464;' }] : []),
  ];

  return (
    <div className="container">
      <div className="flex items-center justify-between mb-2">
        <h1 style={{ color: 'var(--navy)', fontSize: '1.5rem' }}>Mishelanu Dashboard</h1>
        <div className="flex gap-1">
          <Link to="/monitor" className="btn btn-primary" style={{ fontSize: '0.875rem', padding: '0.5rem 1.25rem' }}>
            Monitor
          </Link>
          <Link to="/sim/group" className="btn btn-secondary" style={{ fontSize: '0.875rem', padding: '0.5rem 1.25rem' }}>
            Simulation
          </Link>
          <button onClick={() => { logout(); navigate('/admin/login'); }} className="btn btn-outline" style={{ fontSize: '0.875rem', padding: '0.5rem 1.25rem' }}>
            Sign Out
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-3" style={{ borderBottom: '2px solid var(--gray-200)', paddingBottom: '0.5rem' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: 'var(--radius) var(--radius) 0 0', border: 'none',
              background: tab === t.key ? 'var(--navy)' : 'transparent',
              color: tab === t.key ? 'var(--white)' : 'var(--gray-500)',
              fontWeight: 600, fontSize: '0.875rem',
              transition: 'all 0.15s ease',
            }}>
            <span dangerouslySetInnerHTML={{ __html: t.icon }} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'alerts' && (
        <AlertsTab api={api} counts={alertCounts} reloadCounts={reloadAlertCounts} />
      )}

      {tab === 'providers' && (
        <ProvidersTab
          providers={providers}
          filters={filters}
          setFilters={setFilters}
          navigate={navigate}
        />
      )}

      {tab === 'categories' && (
        <CategoriesTab categories={categories} reload={reloadCategories} api={api} />
      )}

      {tab === 'requests' && (
        <div>
          {requests.map(r => (
            <RequestCard key={r.id} request={r} />
          ))}
          {requests.length === 0 && (
            <div className="empty-state">
              <span className="empty-emoji">&#x1F4EC;</span>
              <p>No service requests yet. Use the Monitor to process community messages.</p>
            </div>
          )}
        </div>
      )}

      {tab === 'users' && hasRole('super_admin') && (
        <UsersTab api={api} />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Alerts tab
// ────────────────────────────────────────────────────────────────────────────
const TIER_COLOURS = { action_required: 'var(--coral)', informational: 'var(--teal)', system_log: '#9e9e9e' };
const TIER_LABELS = { action_required: 'Action Required', informational: 'Informational', system_log: 'System Log' };

function timeAgo(dateStr) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 172800) return 'yesterday';
  return new Date(dateStr).toLocaleDateString('en-GB');
}

function AlertsTab({ api, counts, reloadCounts }) {
  const [tierFilter, setTierFilter] = useState('action_required');
  const [alerts, setAlerts] = useState([]);
  const [showResolved, setShowResolved] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const load = () => {
    const params = new URLSearchParams();
    if (tierFilter !== 'all') params.set('tier', tierFilter);
    if (showResolved) params.set('is_resolved', 'all');
    api.get(`/admin/alerts?${params}`).then(setAlerts).catch(() => {});
  };

  useEffect(() => { load(); }, [tierFilter, showResolved]);

  async function doAction(alertId, action) {
    await api.post(`/admin/alerts/${alertId}/action`, { action });
    load();
    reloadCounts();
  }

  async function markRead(alertId) {
    await api.patch(`/admin/alerts/${alertId}/read`);
    setAlerts(a => a.map(al => al.id === alertId ? { ...al, is_read: true } : al));
  }

  async function resolve(alertId) {
    await api.patch(`/admin/alerts/${alertId}/resolve`);
    load();
    reloadCounts();
  }

  async function bulkRead() {
    const ids = [...selected];
    if (ids.length === 0) return;
    await api.patch('/admin/alerts/bulk-read', { alertIds: ids });
    setSelected(new Set());
    load();
  }

  async function bulkResolve() {
    const ids = [...selected];
    if (ids.length === 0) return;
    await api.patch('/admin/alerts/bulk-resolve', { alertIds: ids });
    setSelected(new Set());
    load();
    reloadCounts();
  }

  function toggle(id) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const tierTabs = [
    { key: 'action_required', label: `Action Required (${counts.action_required})`, colour: 'var(--coral)' },
    { key: 'informational', label: `Informational (${counts.informational})`, colour: 'var(--teal)' },
    { key: 'system_log', label: `System Log (${counts.system_log})`, colour: '#9e9e9e' },
    { key: 'all', label: 'All', colour: 'var(--navy)' },
  ];

  const emptyMessages = {
    action_required: 'All clear — nothing requires your attention right now.',
    informational: 'No informational alerts.',
    system_log: 'No system log entries.',
    all: 'No alerts to display.',
  };

  return (
    <div>
      <div className="flex gap-1 mb-2" style={{ flexWrap: 'wrap' }}>
        {tierTabs.map(t => (
          <button key={t.key} onClick={() => setTierFilter(t.key)}
            style={{
              padding: '0.4rem 1rem', borderRadius: 'var(--radius-pill)', border: 'none',
              background: tierFilter === t.key ? t.colour : 'var(--gray-100)',
              color: tierFilter === t.key ? 'white' : 'var(--gray-600)',
              fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 mb-2" style={{ flexWrap: 'wrap' }}>
        <label style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
          <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)}
            style={{ marginRight: '0.25rem' }} />
          Show resolved
        </label>
        {selected.size > 0 && (
          <>
            <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem', marginLeft: 'auto' }}
              onClick={bulkRead}>Mark {selected.size} as Read</button>
            <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }}
              onClick={bulkResolve}>Resolve {selected.size}</button>
          </>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="empty-state">
          <span className="empty-emoji">&#x2705;</span>
          <p>{emptyMessages[tierFilter]}</p>
        </div>
      ) : (
        alerts.map(alert => (
          <AlertCard
            key={alert.id}
            alert={alert}
            selected={selected.has(alert.id)}
            onToggle={() => toggle(alert.id)}
            onAction={(action) => doAction(alert.id, action)}
            onMarkRead={() => markRead(alert.id)}
            onResolve={() => resolve(alert.id)}
          />
        ))
      )}
    </div>
  );
}

function AlertCard({ alert, selected, onToggle, onAction, onMarkRead, onResolve }) {
  const tierColour = TIER_COLOURS[alert.tier] || '#9e9e9e';
  const meta = alert.metadata || {};

  return (
    <div className="card-flat mb-2" style={{
      padding: '0.875rem 1rem 0.875rem 1.25rem',
      borderLeft: `4px solid ${tierColour}`,
      background: alert.is_read ? 'white' : 'var(--cream, #fffdf8)',
      opacity: alert.is_resolved ? 0.6 : 1,
    }}>
      <div className="flex items-start" style={{ gap: '0.75rem' }}>
        <input type="checkbox" checked={selected} onChange={onToggle}
          style={{ marginTop: '0.25rem', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-1" style={{ marginBottom: '0.25rem', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)',
              fontSize: '0.6875rem', fontWeight: 600, background: tierColour, color: 'white',
            }}>{TIER_LABELS[alert.tier]}</span>
            <strong style={{ fontSize: '0.875rem', fontWeight: alert.is_read ? 500 : 700 }}>
              {alert.title}
            </strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{timeAgo(alert.created_at)}</span>
          </div>
          {alert.message && (
            <div style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', marginBottom: '0.375rem' }}>
              {alert.message}
            </div>
          )}
          {alert.provider_name && (
            <Link to={`/admin/provider/${alert.provider_id}`}
              style={{ fontSize: '0.8125rem', color: 'var(--teal)', textDecoration: 'none' }}>
              {alert.provider_name}
            </Link>
          )}

          {/* Contact message detail */}
          {alert.type === 'contact_message' && meta.message && (
            <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--gray-100)', borderRadius: 'var(--radius)', fontSize: '0.8125rem' }}>
              <strong>{meta.name}</strong> · {meta.email}{meta.phone ? ` · ${meta.phone}` : ''}
              {meta.subject && <span style={{ color: 'var(--gray-500)' }}> · {meta.subject}</span>}
              <div style={{ whiteSpace: 'pre-wrap', marginTop: '0.25rem', color: 'var(--gray-700)' }}>{meta.message}</div>
            </div>
          )}

          {/* Opt-in detail */}
          {(alert.type === 'opt_in_provider' || alert.type === 'opt_in_user') && meta.recommender_email && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--gray-600)' }}>
              Contact: {meta.recommender_email}{meta.recommender_phone ? ` · ${meta.recommender_phone}` : ''}
            </div>
          )}
        </div>

        <div className="flex gap-1" style={{ flexShrink: 0, flexWrap: 'wrap' }}>
          {alert.type === 'approval_ready' && alert.provider_id && !alert.is_resolved && (
            <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }}
              onClick={() => onAction('approve_provider')}>Approve</button>
          )}
          {alert.provider_id && (
            <Link to={`/admin/provider/${alert.provider_id}`} className="btn btn-outline"
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }}>View</Link>
          )}
          {!alert.is_read && (
            <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }}
              onClick={onMarkRead}>Read</button>
          )}
          {!alert.is_resolved && (
            <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }}
              onClick={onResolve}>Resolve</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Providers tab (largely unchanged)
// ────────────────────────────────────────────────────────────────────────────
function ProvidersTab({ providers, filters, setFilters, navigate }) {
  return (
    <div>
      <div className="flex gap-1 mb-2 flex-wrap">
        <input placeholder="Search providers..." value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          style={{ padding: '0.625rem 0.875rem', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)', fontSize: '0.875rem' }} />
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          style={{ padding: '0.625rem 0.875rem', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)', fontSize: '0.875rem' }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Paused</option>
          <option value="awaiting_payment">Payment Due</option>
        </select>
        <select value={filters.enrichment_status} onChange={e => setFilters(f => ({ ...f, enrichment_status: e.target.value }))}
          style={{ padding: '0.625rem 0.875rem', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)', fontSize: '0.875rem' }}>
          <option value="">All stages</option>
          <option value="pending">Being Prepared</option>
          <option value="processed">Ready for Review</option>
          <option value="reviewed">Reviewed</option>
        </select>
      </div>

      <div className="card-flat" style={{ overflow: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Services</th>
              <th>Status</th>
              <th>Profile</th>
              <th>Recs</th>
              <th>Visits</th>
              <th>Joined</th>
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
                <td><span className={`badge ${p.status === 'active' ? 'badge-teal' : 'badge-coral'}`}>{STATUS_LABELS[p.status] || p.status}</span></td>
                <td><span className="badge badge-gold">{ENRICHMENT_LABELS[p.enrichment_status] || p.enrichment_status}</span></td>
                <td>{p.recommendation_count}</td>
                <td>{p.total_visits}</td>
                <td style={{ fontSize: '0.8125rem' }}>{new Date(p.created_at).toLocaleDateString('en-GB')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {providers.length === 0 && (
          <div className="empty-state">
            <span className="empty-emoji">&#x1F50D;</span>
            <p>No providers match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Categories tab
// ────────────────────────────────────────────────────────────────────────────
function CategoriesTab({ categories, reload, api }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories.filter(c => {
      if (statusFilter && (c.status !== statusFilter && !(statusFilter === 'suggested' && c.status === 'pending_approval'))) return false;
      if (!q) return true;
      const blob = `${c.category} ${c.subcategory} ${(c.aliases || []).map(a => a.alias).join(' ')}`.toLowerCase();
      return blob.includes(q);
    });
  }, [categories, search, statusFilter]);

  async function changeStatus(id, status) {
    await api.patch(`/admin/categories/${id}/status`, { status });
    reload();
  }

  async function addAlias(id, alias) {
    await api.post(`/admin/categories/${id}/aliases`, { alias });
    reload();
  }

  async function removeAlias(catId, aliasId) {
    await api.del(`/admin/categories/${catId}/aliases/${aliasId}`);
    reload();
  }

  return (
    <div>
      <div className="flex gap-1 mb-2 flex-wrap">
        <input
          placeholder="Search by name or alias..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '0.625rem 0.875rem', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)', fontSize: '0.875rem', minWidth: '220px' }}
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '0.625rem 0.875rem', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)', fontSize: '0.875rem' }}
        >
          <option value="">All statuses</option>
          <option value="suggested">Suggested</option>
          <option value="active">Active</option>
          <option value="deactivated">Deactivated</option>
        </select>
      </div>

      <div className="card-flat" style={{ overflow: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Status</th>
              <th>Providers</th>
              <th>Aliases</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <CategoryRow
                key={c.id}
                cat={c}
                onChangeStatus={changeStatus}
                onAddAlias={addAlias}
                onRemoveAlias={removeAlias}
              />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty-state">
            <span className="empty-emoji">&#x1F4C2;</span>
            <p>No categories match.</p>
          </div>
        )}
      </div>
    </div>
  );
}


function CategoryRow({ cat, onChangeStatus, onAddAlias, onRemoveAlias }) {
  const [aliasInput, setAliasInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState(null);

  const status = cat.status === 'pending_approval' ? 'suggested' : cat.status;
  const statusStyle = CAT_STATUS_BADGE_STYLE[status] || CAT_STATUS_BADGE_STYLE.active;

  async function run(fn) {
    setBusy(true);
    setRowError(null);
    try { await fn(); } catch (err) { setRowError(err.message); } finally { setBusy(false); }
  }

  async function submitAlias(e) {
    if (e) e.preventDefault();
    const trimmed = aliasInput.trim();
    if (!trimmed) return;
    await run(() => onAddAlias(cat.id, trimmed));
    setAliasInput('');
  }

  return (
    <tr>
      <td>
        <strong style={{ fontSize: '0.875rem' }}>{cat.subcategory}</strong>
        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{cat.category}</div>
      </td>
      <td>
        <span style={{
          display: 'inline-block', padding: '0.2rem 0.625rem',
          borderRadius: 'var(--radius-pill)', fontSize: '0.75rem', fontWeight: 600,
          ...statusStyle,
        }}>
          {CAT_STATUS_LABEL[status] || status}
        </span>
      </td>
      <td style={{ fontSize: '0.875rem' }}>{cat.provider_count ?? 0}</td>
      <td style={{ minWidth: '260px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.375rem' }}>
          {(cat.aliases || []).map(a => (
            <AliasChip key={a.id} alias={a.alias} onRemove={() => run(() => onRemoveAlias(cat.id, a.id))} />
          ))}
        </div>
        <form onSubmit={submitAlias} style={{ display: 'flex', gap: '0.25rem' }}>
          <input
            value={aliasInput}
            onChange={e => setAliasInput(e.target.value)}
            placeholder="Add alias and press Enter"
            disabled={busy}
            style={{ flex: 1, padding: '0.375rem 0.625rem', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)', fontSize: '0.8125rem' }}
          />
        </form>
        {rowError && <div style={{ color: 'var(--coral)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{rowError}</div>}
      </td>
      <td>
        <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
          {status === 'suggested' && (
            <>
              <button type="button" disabled={busy} className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }}
                onClick={() => run(() => onChangeStatus(cat.id, 'active'))}>Approve</button>
              <button type="button" disabled={busy} className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }}
                onClick={() => run(() => onChangeStatus(cat.id, 'deactivated'))}>Reject</button>
            </>
          )}
          {status === 'active' && (
            <button type="button" disabled={busy} className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }}
              onClick={() => run(() => onChangeStatus(cat.id, 'deactivated'))}>Deactivate</button>
          )}
          {status === 'deactivated' && (
            <button type="button" disabled={busy} className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }}
              onClick={() => run(() => onChangeStatus(cat.id, 'active'))}>Reactivate</button>
          )}
        </div>
      </td>
    </tr>
  );
}

function AliasChip({ alias, onRemove }) {
  const [hover, setHover] = useState(false);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-pill)', fontSize: '0.75rem',
      background: 'var(--teal)', color: 'var(--white)', fontWeight: 500,
    }}>
      {alias}
      <button
        type="button"
        onClick={onRemove}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-label={`Remove alias ${alias}`}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: hover ? 'var(--coral)' : 'var(--white)',
          fontSize: '0.875rem', lineHeight: 1, padding: 0,
          transition: 'color 0.15s ease',
        }}
      >
        &times;
      </button>
    </span>
  );
}

// ───────────────────────────────────────────────────��────────────────────────
// Users tab (super admin only)
// ────────���─────────────────────────────────────────────────���─────────────────
const ROLE_BADGE = {
  super_admin: { bg: 'var(--navy)', label: 'Super Admin' },
  admin: { bg: 'var(--teal)', label: 'Admin' },
  monitor: { bg: 'var(--gold, #d4a017)', label: 'Monitor' },
};

function UsersTab({ api }) {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [resetId, setResetId] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', first_name: '', surname: '', role: 'admin' });
  const [editForm, setEditForm] = useState({});
  const [resetPw, setResetPw] = useState('');
  const [error, setError] = useState(null);

  const load = () => api.get('/admin/users').then(setUsers).catch(() => {});
  useEffect(() => { load(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/admin/users', form);
      setForm({ email: '', password: '', first_name: '', surname: '', role: 'admin' });
      setShowForm(false);
      load();
    } catch (err) { setError(err.message); }
  }

  async function handleEdit(id) {
    setError(null);
    try {
      await api.patch(`/admin/users/${id}`, editForm);
      setEditId(null);
      load();
    } catch (err) { setError(err.message); }
  }

  async function handleReset(id) {
    setError(null);
    try {
      await api.post(`/admin/users/${id}/reset-password`, { password: resetPw });
      setResetId(null);
      setResetPw('');
    } catch (err) { setError(err.message); }
  }

  async function handleDelete(id) {
    setError(null);
    try {
      await api.del(`/admin/users/${id}`);
      load();
    } catch (err) { setError(err.message); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 style={{ color: 'var(--navy)', margin: 0 }}>Admin Users</h3>
        <button className="btn btn-primary" style={{ fontSize: '0.875rem' }} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {error && <div className="msg-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {showForm && (
        <form onSubmit={handleAdd} className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>First name</label>
              <input required value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Surname</label>
              <input required value={form.surname} onChange={e => setForm(f => ({ ...f, surname: e.target.value }))} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Email</label>
              <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Password</label>
              <input type="password" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="admin">Admin</option>
                <option value="monitor">Monitor</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '0.75rem' }}>Create User</button>
        </form>
      )}

      <div className="card-flat" style={{ overflow: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const rb = ROLE_BADGE[u.role] || { bg: '#999', label: u.role };
              return (
                <tr key={u.id}>
                  <td>
                    {editId === u.id ? (
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <input style={{ width: '80px', padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}
                          value={editForm.first_name ?? u.first_name}
                          onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} />
                        <input style={{ width: '80px', padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}
                          value={editForm.surname ?? u.surname}
                          onChange={e => setEditForm(f => ({ ...f, surname: e.target.value }))} />
                      </div>
                    ) : (
                      <strong>{u.first_name} {u.surname}</strong>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8125rem' }}>{u.email}</td>
                  <td>
                    {editId === u.id && u.role !== 'super_admin' ? (
                      <select style={{ padding: '0.25rem', fontSize: '0.8125rem' }}
                        value={editForm.role ?? u.role}
                        onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                        <option value="admin">Admin</option>
                        <option value="monitor">Monitor</option>
                      </select>
                    ) : (
                      <span style={{
                        display: 'inline-block', padding: '0.2rem 0.625rem', borderRadius: 'var(--radius-pill)',
                        fontSize: '0.75rem', fontWeight: 600, background: rb.bg, color: 'white',
                      }}>{rb.label}</span>
                    )}
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-block', padding: '0.2rem 0.625rem', borderRadius: 'var(--radius-pill)',
                      fontSize: '0.75rem', fontWeight: 600,
                      background: u.is_active ? 'var(--teal-glow, #d8f3ed)' : '#ececec',
                      color: u.is_active ? 'var(--teal-dark, #1a8773)' : '#666',
                    }}>{u.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td style={{ fontSize: '0.8125rem' }}>
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString('en-GB') : '—'}
                  </td>
                  <td>
                    <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                      {editId === u.id ? (
                        <>
                          <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }}
                            onClick={() => handleEdit(u.id)}>Save</button>
                          <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }}
                            onClick={() => setEditId(null)}>Cancel</button>
                        </>
                      ) : resetId === u.id ? (
                        <>
                          <input type="password" placeholder="New password" style={{ width: '120px', padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}
                            value={resetPw} onChange={e => setResetPw(e.target.value)} />
                          <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }}
                            onClick={() => handleReset(u.id)}>Set</button>
                          <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }}
                            onClick={() => { setResetId(null); setResetPw(''); }}>Cancel</button>
                        </>
                      ) : (
                        <>
                          {u.role !== 'super_admin' && (
                            <>
                              <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }}
                                onClick={() => { setEditId(u.id); setEditForm({ first_name: u.first_name, surname: u.surname, role: u.role }); }}>Edit</button>
                              <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }}
                                onClick={() => setResetId(u.id)}>Reset PW</button>
                              {u.is_active ? (
                                <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem', color: 'var(--coral)' }}
                                  onClick={() => handleDelete(u.id)}>Deactivate</button>
                              ) : (
                                <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }}
                                  onClick={() => api.patch(`/admin/users/${u.id}`, { is_active: true }).then(load)}>Reactivate</button>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
