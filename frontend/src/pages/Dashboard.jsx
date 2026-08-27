import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Layout/Header';
import { 
  TrendingUp, 
  AlertTriangle, 
  Wrench, 
  DollarSign, 
  Plus, 
  RefreshCw,
  Package,
  Users,
  Cake,
  CheckCircle,
  Clock,
  CreditCard,
  Download
} from 'lucide-react';
import { pwaInstall } from '../utils/pwaInstall';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const useMock = import.meta.env.VITE_USE_MOCK !== 'false';

  const [installAvailable, setInstallAvailable] = useState(false);

  useEffect(() => {
    const unsubInstall = pwaInstall.onAvailabilityChange(setInstallAvailable);
    return () => unsubInstall();
  }, []);

  const handleInstall = async () => {
    const installed = await pwaInstall.install();
    if (installed) {
      setInstallAvailable(false);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getDashboardStats(user.role);
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user.role]);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
      <Header searchPlaceholder="Search dashboard..." />
      <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)' }}>
        <div style={{ width: 20, height: 20, border: '2px solid var(--primary-gold)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        Loading Dashboard metrics...
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
      <Header searchPlaceholder="Search dashboard..." />
      <div className="page-container">

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page-title">Welcome back, {user.name}</h1>
            <p className="page-subtitle">Showroom performance overview for today.</p>
          </div>
          {installAvailable && !pwaInstall.isInstalled() && (
            <button
              onClick={handleInstall}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
              title="Install Smart Times as a desktop app"
            >
              <Download size={16} />
              Install App
            </button>
          )}
        </div>

        {/* KPIs Grid — Row 1 */}
        <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>

          {/* Today's Sales */}
          <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/reports')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="card-title">Today's Sales</span>
                <h2 className="card-value">₹{(stats?.today_sales_sum || 0).toLocaleString('en-IN')}</h2>
              </div>
              <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
                <TrendingUp size={24} />
              </div>
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{stats?.today_sales_count || 0} invoice(s) generated today</span>
              {(stats?.month_sales_sum > 0 || stats?.total_sales_sum > 0) && (
                <span style={{ fontSize: '0.78rem', color: 'var(--primary-gold)', fontWeight: 600 }}>
                  This Month: ₹{(stats?.month_sales_sum || stats?.total_sales_sum || 0).toLocaleString('en-IN')}
                </span>
              )}
            </div>
          </div>

          {/* Profit Snapshot (Admin/Manager only) */}
          {(user.role === 'admin' || user.role === 'manager') && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className="card-title">Today's Profit Margin</span>
                  <h2 className="card-value" style={{ color: (stats?.profit_snapshot || 0) >= 0 ? 'var(--primary-gold)' : 'var(--error)' }}>
                    ₹{(stats?.profit_snapshot || 0).toLocaleString('en-IN')}
                  </h2>
                </div>
                <div style={{ background: 'var(--primary-gold-glow)', color: 'var(--primary-gold)', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
                  <DollarSign size={24} />
                </div>
              </div>
              <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Net revenue minus COGS today</span>
                {(stats?.month_profit_snapshot !== undefined && stats?.month_profit_snapshot !== null) && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--primary-gold)', fontWeight: 600 }}>
                    Month Profit: ₹{(stats.month_profit_snapshot).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Repairs Status */}
          <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/services')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="card-title">Repairs Status</span>
                <h2 className="card-value">{stats?.jobs_active || 0}</h2>
              </div>
              <div style={{ background: 'var(--info-bg)', color: 'var(--info)', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
                <Wrench size={24} />
              </div>
            </div>
            <div className="card-footer">
              <span style={{ color: (stats?.jobs_overdue || 0) > 0 ? 'var(--error)' : 'inherit' }}>
                {stats?.jobs_overdue || 0} overdue, {stats?.jobs_ready || 0} ready for pickup
              </span>
            </div>
          </div>

          {/* Customer Outstanding Dues */}
          <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/customers')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="card-title">Customer Dues</span>
                <h2 className="card-value" style={{ color: (stats?.outstanding_dues_total || 0) > 0 ? 'var(--error)' : 'inherit' }}>
                  ₹{(stats?.outstanding_dues_total || 0).toLocaleString('en-IN')}
                </h2>
              </div>
              <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--error)', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
                <AlertTriangle size={24} />
              </div>
            </div>
            <div className="card-footer">
              <span>{stats?.outstanding_dues_count || 0} customer(s) with outstanding balances</span>
            </div>
          </div>

          {/* Supplier Pending Payments (Admin/Manager only) */}
          {(user.role === 'admin' || user.role === 'manager') && (
            <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/supplier-ledger')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className="card-title">Supplier Dues</span>
                  <h2 className="card-value" style={{ color: (stats?.pending_supplier_payments_sum || 0) > 0 ? 'var(--warning)' : 'inherit' }}>
                    ₹{(stats?.pending_supplier_payments_sum || 0).toLocaleString('en-IN')}
                  </h2>
                </div>
                <div style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--warning)', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
                  <CreditCard size={24} />
                </div>
              </div>
              <div className="card-footer">
                <span>{stats?.pending_supplier_payments_count || 0} purchase(s) pending payment → click to settle</span>
              </div>
            </div>
          )}
        </div>

        {/* Row 2: Quick Actions + Alerts + Birthdays */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          
          {/* Quick Actions */}
          <div className="card" style={{ height: 'fit-content' }}>
            <h3 style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              Quick Operations
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              <button id="dash-new-sale" onClick={() => navigate('/sales')} className="btn btn-primary" style={{ height: '64px', fontSize: '0.85rem', flexDirection: 'column', gap: '4px' }}>
                <Plus size={18} /> New Sales Bill
              </button>
              {(user.role === 'admin' || user.role === 'manager') && (
                <button id="dash-record-purchase" onClick={() => navigate('/purchase')} className="btn btn-secondary" style={{ height: '64px', fontSize: '0.85rem', flexDirection: 'column', gap: '4px', border: '1px solid var(--border-color)' }}>
                  <Package size={18} /> Record Purchase
                </button>
              )}
              <button id="dash-new-service" onClick={() => navigate('/services')} className="btn btn-secondary" style={{ height: '64px', fontSize: '0.85rem', flexDirection: 'column', gap: '4px', border: '1px solid var(--border-color)' }}>
                <Wrench size={18} /> New Service Job
              </button>
              <button id="dash-new-exchange" onClick={() => navigate('/exchanges')} className="btn btn-secondary" style={{ height: '64px', fontSize: '0.85rem', flexDirection: 'column', gap: '4px', border: '1px solid var(--border-color)' }}>
                <RefreshCw size={18} /> New Exchange
              </button>
              <button id="dash-customers" onClick={() => navigate('/customers')} className="btn btn-secondary" style={{ height: '64px', fontSize: '0.85rem', flexDirection: 'column', gap: '4px', border: '1px solid var(--border-color)' }}>
                <Users size={18} /> CRM Customers
              </button>
              <button id="dash-inventory" onClick={() => navigate('/inventory')} className="btn btn-secondary" style={{ height: '64px', fontSize: '0.85rem', flexDirection: 'column', gap: '4px', border: '1px solid var(--border-color)' }}>
                <Package size={18} /> View Inventory
              </button>
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="card" style={{ height: 'fit-content' }}>
            <h3 style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} color="var(--warning)" /> Inventory Alerts
            </h3>
            {stats?.low_stock_alerts && stats.low_stock_alerts.length > 0 ? (
              <ul style={{ listStyle: 'none', maxHeight: '220px', overflowY: 'auto' }}>
                {stats.low_stock_alerts.map((alert, idx) => (
                  <li key={idx} style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    padding: '0.625rem 0', 
                    borderBottom: idx === stats.low_stock_alerts.length - 1 ? 'none' : '1px solid var(--border-color)' 
                  }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{alert.model}</span>
                      {alert.brand && <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>{alert.brand}</span>}
                    </div>
                    <span className="badge badge-danger">Low Stock ({alert.count})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--success)', padding: '1rem 0' }}>
                <CheckCircle size={20} />
                <span style={{ fontSize: '0.9rem' }}>All models well supplied. No low stock warnings!</span>
              </div>
            )}
          </div>

          {/* Today's Birthdays */}
          <div className="card" style={{ height: 'fit-content' }}>
            <h3 style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cake size={18} color="var(--primary-gold)" /> Today's Birthdays
            </h3>
            {stats?.birthdays_today && stats.birthdays_today.length > 0 ? (
              <ul style={{ listStyle: 'none' }}>
                {stats.birthdays_today.map((c, idx) => (
                  <li key={c.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.625rem 0',
                    borderBottom: idx === stats.birthdays_today.length - 1 ? 'none' : '1px solid var(--border-color)'
                  }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.name}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'block' }}>{c.phone}</span>
                    </div>
                    <a
                      href={`https://wa.me/91${c.phone}?text=${encodeURIComponent(`Happy Birthday ${c.name}! Wishing you a wonderful day from Smart Times Watch Showroom. Visit us for exclusive birthday offers!`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', textDecoration: 'none' }}
                    >
                      WhatsApp Wish
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={18} />
                No customer birthdays today.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
