import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { 
  Sun, Moon, Search, Wifi, WifiOff, Menu, Download, CloudOff, 
  RefreshCw, User, FileText, Watch, Share2, Printer,
  Bell, AlertTriangle, Cake, CheckCircle, Info
} from 'lucide-react';
import { pwaInstall } from '../../utils/pwaInstall';
import { syncQueue } from '../../utils/syncQueue';
import { offlineDetector } from '../../utils/offlineDetector';
import { alertService } from '../../utils/alert';

const Header = ({ searchVal, setSearchVal, searchPlaceholder = "Global Search..." }) => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const useMock = import.meta.env.VITE_USE_MOCK !== 'false';

  const [installAvailable, setInstallAvailable] = useState(pwaInstall.isAvailable());
  const [isOnline, setIsOnline] = useState(offlineDetector.isOnline());
  const [pendingSync, setPendingSync] = useState(syncQueue.count());
  const [syncing, setSyncing] = useState(false);

  // Unified global search states
  const [localQuery, setLocalQuery] = useState('');
  const [suggestions, setSuggestions] = useState({ watches: [], sales: [], customers: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [settings, setSettings] = useState(null);

  // Notifications states
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  const searchContainerRef = useRef(null);
  const activeQuery = setSearchVal ? searchVal : localQuery;

  const getDismissedNotifications = () => {
    try {
      const data = localStorage.getItem('dismissed_notifications');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  };

  const dismissNotification = (id) => {
    try {
      const dismissed = getDismissedNotifications();
      const todayStr = new Date().toISOString().split('T')[0];
      dismissed[id] = todayStr;
      localStorage.setItem('dismissed_notifications', JSON.stringify(dismissed));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const stats = await api.getDashboardStats(user.role);
      const list = [];
      const dismissed = getDismissedNotifications();
      const todayStr = new Date().toISOString().split('T')[0];

      const isDismissed = (id) => dismissed[id] === todayStr;

      // Low Stock alerts
      if (stats?.low_stock_alerts && stats.low_stock_alerts.length > 0) {
        stats.low_stock_alerts.forEach(item => {
          const notifId = `low-stock-${item.model}`;
          if (!isDismissed(notifId)) {
            list.push({
              id: notifId,
              type: 'warning',
              title: 'Low Stock',
              message: `${item.model} has only ${item.count} items left.`,
              path: '/inventory'
            });
          }
        });
      }

      // Service/Repair statuses
      if (stats?.jobs_overdue > 0) {
        const notifId = 'jobs-overdue';
        if (!isDismissed(notifId)) {
          list.push({
            id: notifId,
            type: 'error',
            title: 'Overdue Repair Jobs',
            message: `There are ${stats.jobs_overdue} repair jobs overdue.`,
            path: '/services'
          });
        }
      }
      if (stats?.jobs_due_today > 0) {
        const notifId = 'jobs-due-today';
        if (!isDismissed(notifId)) {
          list.push({
            id: notifId,
            type: 'info',
            title: 'Repair Jobs Due Today',
            message: `${stats.jobs_due_today} repair jobs due today.`,
            path: '/services'
          });
        }
      }
      if (stats?.jobs_ready > 0) {
        const notifId = 'jobs-ready';
        if (!isDismissed(notifId)) {
          list.push({
            id: notifId,
            type: 'success',
            title: 'Repairs Ready',
            message: `${stats.jobs_ready} repair jobs ready for pickup.`,
            path: '/services'
          });
        }
      }

      // Birthdays Today
      if (stats?.birthdays_today && stats.birthdays_today.length > 0) {
        stats.birthdays_today.forEach(c => {
          const notifId = `birthday-${c.id}`;
          if (!isDismissed(notifId)) {
            list.push({
              id: notifId,
              type: 'info',
              title: `Birthday: ${c.name}`,
              message: `Today is ${c.name}'s birthday (${c.phone}).`,
              path: '/customers'
            });
          }
        });
      }

      // Sync Queue
      if (pendingSync > 0) {
        const notifId = 'pending-sync';
        if (!isDismissed(notifId)) {
          list.push({
            id: notifId,
            type: 'warning',
            title: 'Sync Pending',
            message: `${pendingSync} action(s) saved offline and pending sync.`,
            actionType: 'sync'
          });
        }
      }

      setNotifications(list);
    } catch (err) {
      console.error('Error compiling notifications:', err);
    }
  };

  useEffect(() => {
    const unsubInstall = pwaInstall.onAvailabilityChange(setInstallAvailable);
    const unsubOnline = offlineDetector.onChange(setIsOnline);
    const unsubQueue = syncQueue.onChange((q) => setPendingSync(q.length));
    
    // Fetch settings for global printable modal
    const fetchSettings = async () => {
      try {
        const s = await api.getSettings();
        setSettings(s);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSettings();

    // Compile initial notifications and poll
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);

    // Click outside listener for global search suggestions
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    // Click outside listener for notifications dropdown
    const handleNotifClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleNotifClickOutside);

    return () => {
      unsubInstall();
      unsubOnline();
      unsubQueue();
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('mousedown', handleNotifClickOutside);
    };
  }, [user, pendingSync]);

  // Debounced query lookups
  useEffect(() => {
    if (!activeQuery || activeQuery.trim().length < 2) {
      setSuggestions({ watches: [], sales: [], customers: [] });
      setShowSuggestions(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const q = activeQuery.trim();
        const [inventory, sales, customers] = await Promise.all([
          api.getInventory(q),
          api.getSales(q),
          api.getCustomers(q)
        ]);

        const matchedWatches = (inventory || []).slice(0, 5);
        const matchedSales = (sales || []).slice(0, 5);
        const matchedCustomers = (customers || []).slice(0, 5);

        setSuggestions({
          watches: matchedWatches,
          sales: matchedSales,
          customers: matchedCustomers
        });
        
        setShowSuggestions(
          matchedWatches.length > 0 || 
          matchedSales.length > 0 || 
          matchedCustomers.length > 0
        );
      } catch (err) {
        console.error('Unified search suggestions fetch failed:', err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [activeQuery]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    if (setSearchVal) {
      setSearchVal(value);
    } else {
      setLocalQuery(value);
    }
  };

  const handleWatchClick = (watch) => {
    setShowSuggestions(false);
    sessionStorage.setItem('inventory_search', watch.id);
    if (window.location.pathname === '/inventory') {
      window.dispatchEvent(new Event('refresh-inventory-search'));
    } else {
      navigate('/inventory');
    }
  };

  const handleCustomerClick = (customer) => {
    setShowSuggestions(false);
    sessionStorage.setItem('customer_search', customer.phone);
    if (window.location.pathname === '/customers') {
      window.dispatchEvent(new Event('refresh-customer-search'));
    } else {
      navigate('/customers');
    }
  };

  const handleInvoiceClick = async (sale) => {
    setShowSuggestions(false);
    try {
      const detail = await api.getSale(sale.id);
      setSelectedInvoice(detail);
    } catch (err) {
      alertService.error('Error', 'Failed to load invoice details.');
    }
  };

  const handleInstall = async () => {
    await pwaInstall.prompt();
  };

  const handleManualSync = async () => {
    if (syncing || !isOnline) return;
    setSyncing(true);
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

          <div className="header-search" ref={searchContainerRef} style={{ flex: 1, maxWidth: '400px', position: 'relative' }}>
            <Search size={18} style={{ color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder={searchPlaceholder} 
              value={activeQuery} 
              onChange={handleInputChange} 
              onFocus={() => {
                if (activeQuery.trim().length >= 2) {
                  setShowSuggestions(suggestions.watches.length > 0 || suggestions.sales.length > 0 || suggestions.customers.length > 0);
                }
              }}
            />

            {showSuggestions && (
              <div 
                className="suggestions-dropdown" 
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'var(--surface-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                  zIndex: 9999,
                  marginTop: '0.5rem',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  padding: '0.5rem 0',
                  textAlign: 'left'
                }}
              >
                <style>{`
                  .suggestion-item {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.6rem 1rem;
                    cursor: pointer;
                    transition: background-color var(--transition-fast);
                    border-bottom: 1px solid var(--border-color);
                  }
                  .suggestion-item:hover {
                    background-color: var(--surface-card) !important;
                  }
                  .suggestion-item:last-child {
                    border-bottom: none;
                  }
                `}</style>

                {suggestions.watches.length > 0 && (
                  <div>
                    <div style={{ padding: '0.5rem 1rem 0.25rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary-gold)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      Stock Watches
                    </div>
                    {suggestions.watches.map(w => (
                      <div 
                        key={w.id} 
                        onClick={() => handleWatchClick(w)}
                        className="suggestion-item"
                      >
                        <Watch size={15} style={{ color: 'var(--text-secondary)' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{w.brand} {w.model}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: {w.id}</div>
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary-gold)' }}>₹{Number(w.selling_price).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                {suggestions.sales.length > 0 && (
                  <div>
                    <div style={{ padding: '0.5rem 1rem 0.25rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary-gold)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      Invoices / Bills
                    </div>
                    {suggestions.sales.map(s => (
                      <div 
                        key={s.id} 
                        onClick={() => handleInvoiceClick(s)}
                        className="suggestion-item"
                      >
                        <FileText size={15} style={{ color: 'var(--text-secondary)' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>Bill #{s.id}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {s.customer?.name} • {s.invoice_date}
                          </div>
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>₹{Number(s.net_amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                {suggestions.customers.length > 0 && (
                  <div>
                    <div style={{ padding: '0.5rem 1rem 0.25rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary-gold)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      Customers CRM
                    </div>
                    {suggestions.customers.map(c => (
                      <div 
                        key={c.id} 
                        onClick={() => handleCustomerClick(c)}
                        className="suggestion-item"
                      >
                        <User size={15} style={{ color: 'var(--text-secondary)' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{c.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Phone: {c.phone}</div>
                        </div>
                        <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>{c.points_balance || 0} pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {loadingSuggestions && (
              <div 
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'var(--surface-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                  zIndex: 9999,
                  marginTop: '0.5rem',
                  padding: '0.75rem 1rem',
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Searching all datasets...</span>
              </div>
            )}
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

          {/* Notification Bell */}
          <div className="notification-bell-container" ref={notificationRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="btn btn-secondary" 
              style={{ padding: '0.5rem', borderRadius: '50%', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
              title="Notifications"
            >
              <Bell size={18} />
              {notifications.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: 'var(--error)',
                  color: '#fff',
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 4px rgba(239, 68, 68, 0.4)'
                }}>
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {showNotifications && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <span className="notification-header-title">Notifications</span>
                  {notifications.length > 0 && (
                    <span className="notification-header-count">{notifications.length} active</span>
                  )}
                </div>
                <ul className="notification-list">
                  {notifications.length > 0 ? (
                    notifications.map(notif => {
                      let iconEl = <Info size={16} />;
                      if (notif.type === 'warning') iconEl = <AlertTriangle size={16} />;
                      if (notif.type === 'error') iconEl = <AlertTriangle size={16} />;
                      if (notif.type === 'success') iconEl = <CheckCircle size={16} />;
                      if (notif.id.startsWith('birthday-')) iconEl = <Cake size={16} />;

                      return (
                        <li 
                          key={notif.id} 
                          className="notification-item"
                          onClick={() => {
                            setShowNotifications(false);
                            dismissNotification(notif.id);
                            fetchNotifications();
                            if (notif.path) {
                              navigate(notif.path);
                            } else if (notif.actionType === 'sync') {
                              handleManualSync();
                            }
                          }}
                        >
                          <div className={`notification-icon-wrapper ${notif.type}`}>
                            {iconEl}
                          </div>
                          <div className="notification-item-content">
                            <div className="notification-item-title">{notif.title}</div>
                            <div className="notification-item-msg">{notif.message}</div>
                          </div>
                        </li>
                      );
                    })
                  ) : (
                    <div className="notification-empty">
                      <CheckCircle size={24} style={{ color: 'var(--success)' }} />
                      <span>No pending notifications</span>
                    </div>
                  )}
                </ul>
              </div>
            )}
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

      {/* Printable Invoice Receipt Modal overlay accessible globally */}
      {selectedInvoice && (
        <div className="modal-overlay" style={{ zIndex: 99999 }}>
          <div className="modal-content printable-area" style={{ maxWidth: '750px', background: '#ffffff', color: '#000000', padding: '2.5rem', textAlign: 'left' }}>
            
            {/* Receipt Header */}
            <div style={{ borderBottom: '2px solid #333', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ color: '#d4af37', fontSize: '1.8rem', margin: 0 }}>{settings?.store_name || 'SMART TIMES'}</h2>
                  <h4 style={{ margin: '0.1rem 0 0', color: '#444' }}>{settings?.tagline || 'Showroom Invoice'}</h4>
                  <p style={{ margin: '0.1rem 0', fontSize: '0.8rem', color: '#555' }}>
                    {settings?.address || '108, Pennagaram Main Road, (Next to R.C. Chruch), DHARMAPURI - 636 701. • Call: 97512 85945, 86672 88021'}
                  </p>
                  {settings?.gstin && <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600 }}>GSTIN: {settings.gstin}</p>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h3 style={{ margin: 0, textTransform: 'uppercase', color: '#333' }}>Tax Invoice</h3>
                  <p style={{ margin: '0.1rem 0', fontWeight: 600 }}>Bill Invoice No: {selectedInvoice.id}</p>
                  <p style={{ margin: 0 }}>Date: {selectedInvoice.invoice_date}</p>
                </div>
              </div>
            </div>

            {/* Customer and Payment details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              <div style={{ borderRight: '1px solid #ddd', paddingRight: '1.5rem' }}>
                <h4 style={{ textTransform: 'uppercase', color: '#666', marginBottom: '0.4rem' }}>Billed To:</h4>
                <p style={{ margin: '0.1rem 0', fontWeight: 600 }}>{selectedInvoice.customer?.name}</p>
                <p style={{ margin: '0.1rem 0' }}>Customer ID: #{selectedInvoice.customer?.id || 'N/A'}</p>
                <p style={{ margin: '0.1rem 0' }}>Phone: {selectedInvoice.customer?.phone}</p>
                <p style={{ margin: '0.1rem 0' }}>{selectedInvoice.customer?.address || 'Counter Sale'}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h4 style={{ textTransform: 'uppercase', color: '#555', marginBottom: '0.5rem' }}>Payment Info:</h4>
                <p style={{ margin: '0.1rem 0' }}>Mode: <strong>{selectedInvoice.payment_mode.toUpperCase()}</strong></p>
                <p style={{ margin: '0.1rem 0' }}>Salesperson: {selectedInvoice.user?.name || 'Staff'}</p>
              </div>
            </div>

            {/* Items list */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #333' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#333' }}>Watch ID / Serial</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#333' }}>Model Description</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', color: '#333' }}>Unit Price (₹)</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', color: '#333' }}>Discount (₹)</th>
                  {selectedInvoice.invoice_type === 'gst' && <th style={{ padding: '0.75rem', textAlign: 'right', color: '#333' }}>GST %</th>}
                  <th style={{ padding: '0.75rem', textAlign: 'right', color: '#333' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.items?.map(item => (
                  <tr key={item.watch_id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{item.watch_id}</td>
                    <td style={{ padding: '0.75rem' }}>{item.watch?.brand} - {item.watch?.model} (HSN: {item.watch?.hsn_code || '9102'})</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>₹{Number(item.price_sold).toLocaleString()}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>₹{Number(item.discount_amount).toLocaleString()}</td>
                    {selectedInvoice.invoice_type === 'gst' && <td style={{ padding: '0.75rem', textAlign: 'right' }}>{item.gst_rate}%</td>}
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      ₹{(item.price_sold - item.discount_amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Tax splits and totals */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem', fontSize: '0.9rem' }}>
              <div>
                {selectedInvoice.invoice_type === 'gst' && (
                  <div style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '4px', border: '1px solid #eee' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#555' }}>GST HSN Breakdown</h4>
                    {(() => {
                      const hsnBreakdown = {};
                      selectedInvoice.items?.forEach(si => {
                        const hsn = si.watch?.hsn_code || '9102';
                        if (!hsnBreakdown[hsn]) {
                          hsnBreakdown[hsn] = 0;
                        }
                        hsnBreakdown[hsn] += Number(si.gst_amount || 0);
                      });
                      return Object.entries(hsnBreakdown).map(([hsn, gstAmt]) => (
                        <div key={hsn} style={{ marginBottom: '0.5rem', borderBottom: '1px dashed #eee', paddingBottom: '0.25rem' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>HSN: {hsn}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', paddingLeft: '0.5rem' }}>
                            <span>CGST (9%)</span>
                            <span>₹{(gstAmt / 2).toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', paddingLeft: '0.5rem', marginTop: '0.1rem' }}>
                            <span>SGST (9%)</span>
                            <span>₹{(gstAmt / 2).toFixed(2)}</span>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
                {selectedInvoice.points_redeemed > 0 && (
                  <p style={{ color: '#666', marginTop: '0.5rem' }}>
                    Redeemed reward points: <strong>{selectedInvoice.points_redeemed}</strong> points (Rs {selectedInvoice.points_value} adjustment)
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'right' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Gross Subtotal</span>
                  <span>₹{selectedInvoice.subtotal.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Discounts & Adjustments</span>
                  <span>-₹{selectedInvoice.discount_amount.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, borderTop: '2px solid #333', paddingTop: '0.5rem', color: '#d4af37' }}>
                  <span>Grand Net Total</span>
                  <span>₹{selectedInvoice.net_amount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Signature Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3.5rem', fontSize: '0.85rem' }}>
              <div style={{ textAlign: 'left' }}>
                <p style={{ margin: 0 }}>Salesperson: <strong>{selectedInvoice.user?.name || 'Staff'}</strong></p>
                <div style={{ borderTop: '1px dashed #333', width: '150px', marginTop: '2.5rem', textAlign: 'center', paddingTop: '0.25rem' }}>
                  Salesperson Signature
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0 }}>For <strong>{settings?.store_name || 'SMART TIMES'}</strong></p>
                <div style={{ borderTop: '1px dashed #333', width: '150px', marginLeft: 'auto', marginTop: '2.5rem', textAlign: 'center', paddingTop: '0.25rem' }}>
                  Authorized Signatory
                </div>
              </div>
            </div>

            {/* Share links */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ccc', paddingTop: '1.5rem', marginTop: '2rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <a 
                  href={`https://wa.me/${selectedInvoice.customer?.phone}?text=${encodeURIComponent(`Dear ${selectedInvoice.customer?.name}, thank you for shopping at ${settings?.store_name || 'Smart Times'}. Your invoice ${selectedInvoice.id} amounting ₹${selectedInvoice.net_amount} is ready.`)}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Share2 size={16} /> WhatsApp Alert
                </a>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => window.print()} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Printer size={16} /> Print Receipt
                </button>
                <button onClick={() => setSelectedInvoice(null)} className="btn btn-secondary">
                  Close Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
