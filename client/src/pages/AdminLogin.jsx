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
            <input type="password" placeholder="Enter password" value={password}
              onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>
            Log In
          </button>
        </form>
      </div>
    </div>
  );
}
