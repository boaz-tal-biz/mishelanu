import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="container text-center" style={{ paddingTop: '3rem' }}>
      <h1 style={{ color: 'var(--navy)', fontSize: '2rem', fontWeight: 700, marginBottom: '0.75rem' }}>
        Mishelanu
      </h1>
      <p style={{ color: 'var(--gray-500)', fontSize: '1.125rem', maxWidth: '480px', margin: '0 auto 2rem' }}>
        Trusted service providers, recommended by your community.
      </p>
      <Link to="/register" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}>
        Register as a Provider
      </Link>
    </div>
  );
}
