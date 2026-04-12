import { Link, useLocation } from 'react-router-dom';

export default function SimNav() {
  const location = useLocation();
  const path = location.pathname;

  const links = [
    { to: '/sim/group', label: 'Group Chat' },
    { to: '/sim/provider/%2B447700900001', label: 'Provider Inbox' },
    { to: '/sim/requester/%2B447700100003', label: 'Requester Inbox' },
    { to: '/monitor', label: 'Monitor' },
  ];

  return (
    <div className="flex gap-1 mb-2 flex-wrap">
      {links.map(link => {
        const isActive = path === link.to || path === decodeURIComponent(link.to) ||
          (link.to === '/monitor' && path === '/monitor') ||
          (link.to.includes('/sim/provider') && path.startsWith('/sim/provider')) ||
          (link.to.includes('/sim/requester') && path.startsWith('/sim/requester')) ||
          (link.to === '/sim/group' && path === '/sim/group');

        return (
          <Link key={link.to} to={link.to}
            className={`btn ${isActive ? 'btn-secondary' : 'btn-outline'}`}
            style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}>
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
