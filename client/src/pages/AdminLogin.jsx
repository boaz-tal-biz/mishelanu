import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../hooks/useApi.js';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/admin/login', { password });
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="container text-center" style={{ maxWidth: '360px', paddingTop: '3rem' }}>
      <div className="card">
        <h2 style={{ color: 'var(--navy)', marginBottom: '1.25rem' }}>Admin Login</h2>
        {error && (
          <div style={{ background: 'rgba(232,90,79,0.08)', color: 'var(--coral)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
