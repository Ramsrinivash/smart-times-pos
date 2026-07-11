import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Search, Wifi, WifiOff, Menu, Download, CloudOff, RefreshCw } from 'lucide-react';
import { pwaInstall } from '../../utils/pwaInstall';
import { syncQueue } from '../../utils/syncQueue';
import { offlineDetector } from '../../utils/offlineDetector';

const Header = ({ searchVal, setSearchVal, searchPlaceholder = "Global Search..." }) => {
  const { theme, toggleTheme } = useTheme();
  const useMock = import.meta.env.VITE_USE_MOCK !== 'false';

  const [installAvailable, setInstallAvailable] = useState(pwaInstall.isAvailable());
  const [isOnline, setIsOnline] = useState(offlineDetector.isOnline());
  const [pendingSync, setPendingSync] = useState(syncQueue.count());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const unsubInstall = pwaInstall.onAvailabilityChange(setInstallAvailable);
    const unsubOnline = offlineDetector.onChange(setIsOnline);
    const unsubQueue = syncQueue.onChange((q) => setPendingSync(q.length));
    return () => { unsubInstall(); unsubOnline(); unsubQueue(); };
  }, []);

  const handleInstall = async () => {
    await pwaInstall.prompt();
  };

  const handleManualSync = async () => {
    if (syncing || !isOnline) return;
    setSyncing(true);
    const { api } = await import('../../services/api');
    await syncQueue.process(api);
    setSyncing(false);
  };

  const triggerSidebar = () => {
    window.dispatchEvent(new Event('toggle-sidebar'));
  };

  return (
    <>
      {/* Offline Banner */}
      {!isOnline && (
        <div style={{
          background: 'rgba(239,68,68,0.95)',
          color: '#fff',
          padding: '0.5rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          zIndex: 1000
        }}>
          <CloudOff size={16} />
          <span>You are offline. Bills and service jobs will be saved locally and synced when you reconnect.</span>
        </div>
      )}
      {/* Sync Pending Banner */}
      {isOnline && pendingSync > 0 && (
        <div style={{
          background: 'rgba(245,158,11,0.12)',
          border: '1px solid var(--warning)',
          color: 'var(--warning)',
          padding: '0.45rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.82rem',
          fontWeight: 600
        }}>
          <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
          <span>{pendingSync} offline action(s) pending sync.</span>
          <button onClick={handleManualSync} disabled={syncing} style={{ marginLeft: 'auto', background: 'var(--warning)', color: '#000', border: 'none', borderRadius: '4px', padding: '0.25rem 0.75rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}>
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      )}

      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
          <button 
            onClick={triggerSidebar}
            className="btn btn-secondary mobile-menu-btn" 
            style={{ display: 'none', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', alignItems: 'center', justifyContent: 'center' }}
            title="Toggle Sidebar Menu"
          >
            <Menu size={20} />
          </button>

          <div className="header-search" style={{ flex: 1, maxWidth: '400px' }}>
            <Search size={18} style={{ color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder={searchPlaceholder} 
              value={searchVal || ''} 
              onChange={(e) => setSearchVal && setSearchVal(e.target.value)} 
            />
          </div>
        </div>

        <div className="header-actions">
          {/* Install App Button — appears when Chrome install is available */}
          {installAvailable && !pwaInstall.isInstalled() && (
            <button
              id="pwa-install-btn"
              onClick={handleInstall}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
              title="Install Smart Times as a desktop app"
            >
              <Download size={14} />
              Install App
            </button>
          )}

          {/* Online/Offline indicator */}
          <div 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.4rem', 
              fontSize: '0.8rem', padding: '0.3rem 0.6rem', borderRadius: '4px', 
              background: !isOnline ? 'rgba(239,68,68,0.15)' : useMock ? 'var(--warning-bg)' : 'var(--success-bg)', 
              color: !isOnline ? 'var(--error)' : useMock ? 'var(--warning)' : 'var(--success)' 
            }}
            title={!isOnline ? 'No internet connection' : useMock ? "Running on local mock database" : "Connected to Live Laravel REST API"}
          >
            {!isOnline ? <WifiOff size={14} /> : useMock ? <WifiOff size={14} /> : <Wifi size={14} />}
            <span>{!isOnline ? 'Offline' : useMock ? 'Mock Mode' : 'API Online'}</span>
          </div>

          <button 
            onClick={toggleTheme} 
            className="btn btn-secondary" 
            style={{ padding: '0.5rem', borderRadius: '50%', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {theme === 'dark' ? <Sun size={18} color="#d4af37" /> : <Moon size={18} />}
          </button>
        </div>
      </header>
    </>
  );
};

export default Header;
