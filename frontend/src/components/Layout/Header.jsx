import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Search, Wifi, WifiOff, Menu } from 'lucide-react';

const Header = ({ searchVal, setSearchVal, searchPlaceholder = "Global Search..." }) => {
  const { theme, toggleTheme } = useTheme();
  const useMock = import.meta.env.VITE_USE_MOCK !== 'false';

  const triggerSidebar = () => {
    window.dispatchEvent(new Event('toggle-sidebar'));
  };

  return (
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
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.4rem', 
            fontSize: '0.8rem', 
            padding: '0.3rem 0.6rem', 
            borderRadius: '4px', 
            background: useMock ? 'var(--warning-bg)' : 'var(--success-bg)', 
            color: useMock ? 'var(--warning)' : 'var(--success)' 
          }}
          title={useMock ? "Running on local mock database (localStorage)" : "Connected to Live Laravel REST API"}
        >
          {useMock ? <WifiOff size={14} /> : <Wifi size={14} />}
          <span>{useMock ? 'Mock Mode' : 'API Online'}</span>
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
  );
};

export default Header;
