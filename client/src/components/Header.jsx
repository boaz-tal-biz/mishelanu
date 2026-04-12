import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin') || location.pathname.startsWith('/monitor');
  const isSim = location.pathname.startsWith('/sim');

  return (
    <header style={{
      background: 'var(--navy)',
      padding: '0.75rem 0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div className="container flex items-center justify-between">
        <Link to="/" style={{
          color: 'var(--white)',
          fontSize: '1.25rem',
          fontWeight: 600,
          textDecoration: 'none',
          letterSpacing: '-0.02em',
        }}>
          Mishelanu
        </Link>

        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/register" style={{ color: 'var(--teal)', fontSize: '0.875rem', textDecoration: 'none' }}>
            Register
          </Link>
          {(isAdmin || isSim) && (
            <>
              <Link to="/admin" style={{ color: 'var(--gray-300)', fontSize: '0.875rem', textDecoration: 'none' }}>
                Admin
              </Link>
              <Link to="/monitor" style={{ color: 'var(--gray-300)', fontSize: '0.875rem', textDecoration: 'none' }}>
                Monitor
              </Link>
              <Link to="/sim/group" style={{ color: 'var(--gray-300)', fontSize: '0.875rem', textDecoration: 'none' }}>
                Simulation
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
