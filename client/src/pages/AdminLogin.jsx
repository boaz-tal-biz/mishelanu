import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login, isAuthenticated, hasRole, sessionExpired, clearSessionExpired } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(hasRole('admin') ? '/admin' : '/monitor');
    }
  }, [isAuthenticated, hasRole, navigate]);

  useEffect(() => {
    if (sessionExpired) {
      setError('Session expired — please sign in again');
      clearSessionExpired();
    }
  }, [sessionExpired, clearSessionExpired]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const user = await login(email, password);
      navigate(user.role === 'monitor' ? '/monitor' : '/admin');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="container text-center" style={{ maxWidth: '360px', paddingTop: '3rem' }}>
      <div className="card card-accent">
        <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>&#x1F512;</div>
        <h2 style={{ color: 'var(--navy)', marginBottom: '1.25rem' }}>Mishelanu Admin</h2>
        {error && (
          <div className="msg-error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input type="email" placeholder="Email address" value={email}
              onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="form-group">
            <input type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
