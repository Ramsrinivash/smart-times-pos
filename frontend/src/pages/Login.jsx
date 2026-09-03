import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Watch, AlertCircle, ShieldAlert } from 'lucide-react';

const Login = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeSessionPayload, setActiveSessionPayload] = useState(null);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    const reason = localStorage.getItem('watch_logout_reason');
    if (reason === 'inactivity') {
      setInfoMessage('You have been logged out due to inactivity.');
      localStorage.removeItem('watch_logout_reason');
    } else if (reason === 'concurrent_login') {
      setInfoMessage('Your session was closed because your account logged in from another browser or device.');
      localStorage.removeItem('watch_logout_reason');
    }
  }, []);

  const handleSubmit = async (e, force = false) => {
    if (e) e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      const res = await login(email, password, force);
      if (res && res.active_session_exists) {
        setActiveSessionPayload(res);
        setLoading(false);
        return;
      }
      setActiveSessionPayload(null);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100vw', padding: '1rem', background: 'radial-gradient(circle at center, #1c1c24 0%, #0c0c0e 100%)' }}>
      <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '2.5rem', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <div style={{ background: 'var(--primary-gold-glow)', padding: '1rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Watch size={36} color="var(--primary-gold)" />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '1px' }}>SMART TIMES</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Smart Times Showroom</p>
        </div>

        {infoMessage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--warning-bg)', color: 'var(--warning)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
            <AlertCircle size={16} />
            <span>{infoMessage}</span>
          </div>
        )}

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--error-bg)', color: 'var(--error)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e, false)}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-control" 
              placeholder="e.g. admin@smarttimes.in" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>

      {/* Active Session Confirmation Modal */}
      {activeSessionPayload && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.85)', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '1.75rem', textAlign: 'center', border: '1px solid var(--primary-gold)' }}>
            <div style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <ShieldAlert size={28} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Active Session Detected</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              An active session for <strong style={{ color: 'var(--text-primary)' }}>{activeSessionPayload.user_name || 'your account'}</strong> is currently running on another browser or device.
            </p>
            <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', textAlign: 'left' }}>
              💡 <strong>Single Session Policy:</strong> Logging in here will automatically sign out the older session.
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button 
                type="button" 
                onClick={() => setActiveSessionPayload(null)} 
                className="btn btn-secondary"
                style={{ flex: 1, padding: '0.65rem' }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => handleSubmit(null, true)} 
                className="btn btn-primary"
                style={{ flex: 1, padding: '0.65rem', fontWeight: 700 }}
                disabled={loading}
              >
                {loading ? 'Switching...' : 'Yes, Log In Here'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
