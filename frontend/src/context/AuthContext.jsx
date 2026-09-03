import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { api } from '../services/api';
import { Clock } from 'lucide-react';
import { alertService } from '../utils/alert';

const AUTH_USER_KEY = 'watch_auth_user';
const AUTH_TOKEN_KEY = 'watch_auth_token';

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
    // Use localStorage for token (cross-window sharing in same browser profile)
    const storedUser = localStorage.getItem(AUTH_USER_KEY);
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);

    // Clear token on browser close (security)
    const handleUnload = () => {
      localStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
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

    // BroadcastChannel: instant cross-tab session revocation (same browser)
    let bc = null;
    try {
      bc = new BroadcastChannel('smarttimes_session');
      bc.onmessage = (event) => {
        if (event.data && event.data.type === 'SESSION_REVOKED' && event.data.userId === user.id) {
          localStorage.setItem('watch_logout_reason', 'concurrent_login');
          logout();
          alertService.warning('Session Closed', 'Your account logged in from another window. This session has been closed.');
        }
      };
    } catch (e) { /* BroadcastChannel not supported */ }

    // Cross-system / multi-device active session listener (localStorage change)
    const handleStorageChange = (e) => {
      if (e.key === 'watch_showroom_db' && e.newValue && user) {
        try {
          const db = JSON.parse(e.newValue);
          const currentToken = localStorage.getItem(AUTH_TOKEN_KEY);
          if (db.active_sessions && db.active_sessions[user.id]) {
            const activeToken = db.active_sessions[user.id];
            if (currentToken && currentToken.startsWith('mock-session-') && activeToken !== currentToken) {
              localStorage.setItem('watch_logout_reason', 'concurrent_login');
              logout();
              alertService.warning('Session Terminated', 'Your account was logged in from another browser or device. This session has been closed.');
            }
          }
        } catch (err) {
          console.error('Session sync error:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Periodic & window focus active session heartbeat check
    const verifySession = async () => {
      if (!user) return;
      const currentToken = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!currentToken) return;
      try {
        await api.checkSession(user.id, currentToken);
      } catch (err) {
        if (err.message === 'SESSION_TERMINATED' || (err.response && err.response.status === 401)) {
          localStorage.setItem('watch_logout_reason', 'concurrent_login');
          logout();
          alertService.warning('Session Terminated', 'Your account was logged in from another browser. This session has been closed for security.');
        }
      }
    };

    window.addEventListener('focus', verifySession);

    const interval = setInterval(() => {
      verifySession();
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
    }, 2000);

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', verifySession);
      clearInterval(interval);
      if (bc) bc.close();
    };
  }, [user]);

  const login = async (email, password, force = false) => {
    setLoading(true);
    try {
      const response = await api.login(email, password, force);
      if (response && response.active_session_exists) {
        return response;
      }
      setUser(response.user);
      // Use localStorage so cross-window detection in same browser works
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user));
      localStorage.setItem(AUTH_TOKEN_KEY, response.access_token);

      // If force login, broadcast to other tabs to log them out
      if (force) {
        try {
          const bc = new BroadcastChannel('smarttimes_session');
          bc.postMessage({ type: 'SESSION_REVOKED', userId: response.user.id });
          bc.close();
        } catch (e) { /* not supported */ }
      }
      return response;
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
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

