import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const apiFetch = useCallback(async (path, options = {}) => {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api${path}`, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (res.status === 401 && token) {
      setToken(null);
      setUser(null);
      setSessionExpired(true);
      throw new Error('Session expired');
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(data.error || `Request failed: ${res.status}`);
    }

    if (res.headers.get('content-type')?.includes('application/pdf')) {
      return res.blob();
    }

    return res.json();
  }, [token]);

  const authApi = {
    get: (path) => apiFetch(path),
    post: (path, body) => apiFetch(path, { method: 'POST', body }),
    put: (path, body) => apiFetch(path, { method: 'PUT', body }),
    patch: (path, body) => apiFetch(path, { method: 'PATCH', body }),
    del: (path) => apiFetch(path, { method: 'DELETE' }),
  };

  const login = useCallback(async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(data.error || 'Login failed');
    }

    const data = await res.json();
    setToken(data.token);
    setUser(data.user);
    setSessionExpired(false);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    setToken(null);
    setUser(null);
  }, [token]);

  const hasRole = useCallback((role) => {
    if (!user) return false;
    if (role === 'monitor') return true; // all roles can access monitor
    if (role === 'admin') return user.role === 'super_admin' || user.role === 'admin';
    if (role === 'super_admin') return user.role === 'super_admin';
    return false;
  }, [user]);

  // Try to validate token on mount (won't work after page refresh since token is in memory only)
  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      sessionExpired,
      clearSessionExpired: () => setSessionExpired(false),
      login,
      logout,
      hasRole,
      isAuthenticated: !!user && !!token,
      authApi,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
