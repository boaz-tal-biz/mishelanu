import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="container text-center" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
      <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>&#x2721;</div>
      <h1 style={{ color: 'var(--navy)', fontSize: '2.25rem', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
        Mishelanu
      </h1>
      <p style={{ color: 'var(--teal-dark)', fontSize: '1.125rem', fontWeight: 500, marginBottom: '0.25rem' }}>
        From our community, for our community.
      </p>
      <p style={{ color: 'var(--gray-500)', fontSize: '1rem', maxWidth: '480px', margin: '0 auto 2.5rem' }}>
        Trusted service providers, personally recommended by people you know.
        Need a plumber? An accountant? A tutor? Mishelanu connects you with someone the community already trusts.
      </p>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3rem' }}>
        <Link to="/register" className="btn btn-primary" style={{ fontSize: '1.0625rem', padding: '0.875rem 2.25rem' }}>
          Join as a Provider
        </Link>
        <Link to="/contact" className="btn btn-outline" style={{ fontSize: '1.0625rem', padding: '0.875rem 2.25rem' }}>
          Get in Touch
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', maxWidth: '720px', margin: '0 auto' }}>
        {[
          { icon: '&#x1F91D;', title: 'Community Trust', desc: 'Every provider is recommended by real community members.' },
          { icon: '&#x26A1;', title: 'Quick Matching', desc: 'Tell us what you need. Mishelanu finds the right person.' },
          { icon: '&#x2B50;', title: 'Verified Quality', desc: 'Community Verified badge for providers with 3 recommendations.' },
        ].map(item => (
          <div key={item.title} className="card text-center" style={{ padding: '1.5rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }} dangerouslySetInnerHTML={{ __html: item.icon }} />
            <h3 style={{ color: 'var(--navy)', fontSize: '0.9375rem', marginBottom: '0.375rem' }}>{item.title}</h3>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.8125rem', lineHeight: 1.5 }}>{item.desc}</p>
          </div>
        ))}
      </div>

      <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginTop: '3rem', fontStyle: 'italic' }}>
        B'ezrat Hashem, connecting our community one recommendation at a time.
      </p>
    </div>
  );
}
