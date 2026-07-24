import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { api } from '../services/api';
import { Clock } from 'lucide-react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(120);

  const lastActivityRef = useRef(Date.now());
  const showWarningRef = useRef(false);

  // Session timeout configurations
  const INACTIVITY_TIMEOUT = Number(import.meta.env.VITE_SESSION_TIMEOUT_MINS || 30) * 60 * 1000;
  const WARNING_THRESHOLD = INACTIVITY_TIMEOUT > 2 * 60 * 1000 ? 2 * 60 * 1000 : INACTIVITY_TIMEOUT / 5;
  const WARNING_TIMEOUT = INACTIVITY_TIMEOUT - WARNING_THRESHOLD;

  useEffect(() => {
    showWarningRef.current = showWarning;
  }, [showWarning]);

  useEffect(() => {
    const storedUser = sessionStorage.getItem('watch_user');
    const storedToken = sessionStorage.getItem('watch_auth_token');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) {
      setShowWarning(false);
      return;
    }

    lastActivityRef.current = Date.now();

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    
    const resetTimer = () => {
      // If warning modal is shown, do not auto-extend through background events
      // User must explicitly click "Stay Logged In"
      if (!showWarningRef.current) {
        lastActivityRef.current = Date.now();
      }
    };

    events.forEach(event => window.addEventListener(event, resetTimer));

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= INACTIVITY_TIMEOUT) {
        sessionStorage.setItem('watch_logout_reason', 'inactivity');
        logout();
        setShowWarning(false);
      } else if (elapsed >= WARNING_TIMEOUT) {
        setShowWarning(true);
        const remaining = Math.max(0, Math.ceil((INACTIVITY_TIMEOUT - elapsed) / 1000));
        setSecondsRemaining(remaining);
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      clearInterval(interval);
    };
  }, [user]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await api.login(email, password);
      setUser(response.user);
      sessionStorage.setItem('watch_user', JSON.stringify(response.user));
      sessionStorage.setItem('watch_auth_token', response.access_token);
      return response.user;
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('watch_user');
    sessionStorage.removeItem('watch_auth_token');
  };

  const handleExtendSession = () => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
  };

  const handleManualLogout = () => {
    logout();
    setShowWarning(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
      {showWarning && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
            {/* Custom keyframes injected via style tag */}
            <style>{`
              @keyframes pulse-clock {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.8; }
              }
            `}</style>
            
            <div style={{ background: 'var(--warning-bg)', color: 'var(--warning)', padding: '1rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem', animation: 'pulse-clock 2s infinite ease-in-out' }}>
              <Clock size={36} />
            </div>
            
            <h3 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-title)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Session Expiring
            </h3>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', margin: '0' }}>
              You have been inactive for a while. For your security, you will be automatically logged out in:
            </p>
            
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--primary-gold)', fontFamily: 'var(--font-title)', margin: '0.5rem 0' }}>
              {formatTime(secondsRemaining)}
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '0.5rem' }}>
              <button 
                onClick={handleExtendSession} 
                className="btn btn-primary" 
                style={{ flex: 1, padding: '0.75rem', fontWeight: 600 }}
              >
                Stay Logged In
              </button>
              <button 
                onClick={handleManualLogout} 
                className="btn btn-secondary" 
                style={{ flex: 1, padding: '0.75rem', fontWeight: 600 }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

