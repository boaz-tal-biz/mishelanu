import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{
      background: 'var(--navy)',
      color: 'rgba(255, 255, 255, 0.8)',
      padding: '2rem 0 1.5rem',
      marginTop: '3rem',
    }}>
      <div className="container" style={{ maxWidth: '800px' }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1.5rem',
          marginBottom: '1.5rem',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.375rem' }}>
              <img src="/assets/mishelanu-logo-sm.png" alt="Mishelanu" height={28} style={{ display: 'block' }} />
              <span style={{
                color: 'white',
                fontWeight: 800,
                fontSize: '1.125rem',
                fontFamily: '"Rubik", "Heebo", system-ui, sans-serif',
              }}>Mishelanu</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
              From our community, for our community.
            </p>
          </div>

          <nav style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem 1.25rem',
            fontSize: '0.8125rem',
          }}>
            <Link to="/privacy" style={{ color: 'var(--teal)', textDecoration: 'none' }}>Privacy Policy</Link>
            <Link to="/terms" style={{ color: 'var(--teal)', textDecoration: 'none' }}>Terms &amp; Conditions</Link>
            <Link to="/disclaimer" style={{ color: 'var(--teal)', textDecoration: 'none' }}>Disclaimer</Link>
            <Link to="/contact" style={{ color: 'var(--teal)', textDecoration: 'none' }}>Contact Us</Link>
          </nav>
        </div>

        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.15)',
          paddingTop: '1rem',
          fontSize: '0.75rem',
          color: 'rgba(255,255,255,0.4)',
          textAlign: 'center',
        }}>
          &copy; 2026 Mishelanu. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
