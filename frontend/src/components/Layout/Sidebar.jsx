import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Watch, 
  ShoppingBag, 
  Calculator, 
  RefreshCw, 
  Wrench, 
  Users, 
  TrendingUp, 
  Settings, 
  LogOut,
  RotateCcw,
  ShieldCheck,
  PackageMinus,
  CreditCard,
  X
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    const handleClose = () => setIsOpen(false);
    window.addEventListener('toggle-sidebar', handleToggle);
    window.addEventListener('close-sidebar', handleClose);
    return () => {
      window.removeEventListener('toggle-sidebar', handleToggle);
      window.removeEventListener('close-sidebar', handleClose);
    };
  }, []);

  if (!user) return null;

  const links = [
    { to: '/dashboard',              label: 'Dashboard',         icon: LayoutDashboard, roles: ['admin', 'manager', 'sales'] },
    { to: '/inventory',              label: 'Inventory',         icon: Watch,           roles: ['admin', 'manager', 'sales'] },
    { to: '/inventory/adjustments',  label: 'Stock Adjustment',  icon: PackageMinus,    roles: ['admin', 'manager'] },
    { to: '/purchase',               label: 'Purchase Ledger',   icon: ShoppingBag,     roles: ['admin', 'manager'] },
    { to: '/supplier-ledger',         label: 'Supplier Ledger',   icon: CreditCard,      roles: ['admin', 'manager'] },
    { to: '/sales',                  label: 'Sales POS',         icon: Calculator,      roles: ['admin', 'manager', 'sales'] },
    { to: '/returns',                label: 'Sales Returns',     icon: RotateCcw,       roles: ['admin', 'manager', 'sales'] },
    { to: '/exchanges',              label: 'Exchanges',         icon: RefreshCw,       roles: ['admin', 'manager', 'sales'] },
    { to: '/services',               label: 'Service & Repair',  icon: Wrench,          roles: ['admin', 'manager', 'sales'] },
    { to: '/customers',              label: 'Customers (CRM)',   icon: Users,           roles: ['admin', 'manager', 'sales'] },
    { to: '/warranty',               label: 'Warranty Cards',    icon: ShieldCheck,     roles: ['admin', 'manager', 'sales'] },
    { to: '/reports',                label: 'Reports',           icon: TrendingUp,      roles: ['admin', 'manager', 'sales'] },
    { to: '/settings',               label: 'Settings',          icon: Settings,        roles: ['admin'] }
  ];

  const visibleLinks = links.filter(link => link.roles.includes(user.role));

  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div 
          className="sidebar-overlay"
          onClick={closeSidebar}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 99,
            backdropFilter: 'blur(2px)'
          }}
        />
      )}

      <div className={`sidebar${isOpen ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <Watch size={28} color="#d4af37" />
          <span className="sidebar-logo-text">SMART TIMES</span>
          {/* Close button — visible on mobile only */}
          <button
            onClick={closeSidebar}
            className="sidebar-close-btn"
            title="Close Menu"
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'none',
              padding: '0.25rem'
            }}
          >
            <X size={20} />
          </button>
        </div>
        
        <ul className="sidebar-menu">
          {visibleLinks.map(link => {
            const Icon = link.icon;
            return (
              <li key={link.to} className="sidebar-item">
                <NavLink 
                  to={link.to} 
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={closeSidebar}
                >
                  <Icon size={18} />
                  <span>{link.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.name}</span>
            <span className="badge badge-info" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', width: 'fit-content' }}>
              {user.role}
            </span>
          </div>
          <button 
            onClick={logout} 
            className="btn btn-secondary btn-sm" 
            title="Logout"
            style={{ padding: '0.4rem', borderRadius: '50%' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
