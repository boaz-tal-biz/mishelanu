import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../hooks/useApi.js';

export default function Header() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    api.get('/admin/check').then(() => setIsAdmin(true)).catch(() => {});
  }, []);

  return (
    <header style={{
      background: 'linear-gradient(135deg, var(--navy) 0%, #2a3f6b 100%)',
      padding: '0.875rem 0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 12px rgba(26, 39, 68, 0.2)',
    }}>
      <div className="container flex items-center justify-between">
        <Link to="/" style={{
          color: 'var(--white)',
          fontSize: '1.375rem',
          fontWeight: 700,
          textDecoration: 'none',
          letterSpacing: '-0.02em',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <span style={{ fontSize: '1.5rem' }}>&#x2721;</span>
          Mishelanu
        </Link>

        <nav style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link to="/register" style={{
            color: 'var(--white)',
            fontSize: '0.875rem',
            fontWeight: 500,
            textDecoration: 'none',
            padding: '0.375rem 0.875rem',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--teal)',
            transition: 'background 0.2s ease',
          }}>
            Join Us
          </Link>
          <Link to="/contact" style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: '0.875rem',
            textDecoration: 'none',
          }}>
            Contact
          </Link>
          {isAdmin && (
            <>
              <Link to="/admin" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', textDecoration: 'none' }}>
                Dashboard
              </Link>
              <Link to="/monitor" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', textDecoration: 'none' }}>
                Monitor
              </Link>
              <Link to="/sim/group" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', textDecoration: 'none' }}>
                Simulation
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
