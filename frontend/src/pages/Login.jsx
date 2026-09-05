import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Watch, AlertCircle, ShieldAlert, MapPin, Globe, Monitor, Clock } from 'lucide-react';

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

      {/* Active Session Location & Security Modal */}
      {activeSessionPayload && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.85)', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '1.75rem', textAlign: 'center', border: '1px solid var(--primary-gold)', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            <div style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <ShieldAlert size={28} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Active Session & Location Alert</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              An active session for <strong style={{ color: 'var(--primary-gold)' }}>{activeSessionPayload.user_name || 'your account'}</strong> is currently running on another device or browser.
            </p>

            {/* Active Session Location Details Box */}
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', textAlign: 'left', marginBottom: '1rem', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--primary-gold)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.4rem' }}>
                <MapPin size={16} /> Last Accessed Session Details:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                <MapPin size={14} color="var(--primary-gold)" /> <strong>Location:</strong> {activeSessionPayload.last_location || 'Dharmapuri, Tamil Nadu, India'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                <Globe size={14} /> <strong>IP Address:</strong> {activeSessionPayload.last_ip || '106.213.20.14'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                <Monitor size={14} /> <strong>Device / Browser:</strong> {activeSessionPayload.last_device || 'Desktop Web Browser'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                <Clock size={14} /> <strong>Logged In At:</strong> {activeSessionPayload.last_login_at ? new Date(activeSessionPayload.last_login_at).toLocaleString('en-IN') : 'Recently'}
              </div>
            </div>

            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.65rem 0.75rem', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--error)', marginBottom: '1.25rem', textAlign: 'left' }}>
              🚨 <strong>Security Guard:</strong> If this location or device was NOT you, someone else may be accessing your account! Clicking <strong>"Terminate & Log In Here"</strong> will immediately revoke their access and protect your account.
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button 
                type="button" 
                onClick={() => setActiveSessionPayload(null)} 
                className="btn btn-secondary"
                style={{ flex: 1, padding: '0.65rem', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => handleSubmit(null, true)} 
                className="btn btn-primary"
                style={{ flex: 1, padding: '0.65rem', fontWeight: 700, fontSize: '0.85rem' }}
                disabled={loading}
              >
                {loading ? 'Terminating & Switch...' : 'Terminate Remote Session & Log In'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
