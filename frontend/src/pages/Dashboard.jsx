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
  Clock,
  RefreshCw
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const useMock = import.meta.env.VITE_USE_MOCK !== 'false';

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

  if (loading) return <div style={{ padding: '2rem' }}>Loading Dashboard metrics...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
      <Header searchPlaceholder="Search dashboard..." />
      <div className="page-container">
        
        {/* Mock/Live Status Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          background: useMock ? 'var(--warning-bg)' : 'var(--success-bg)',
          border: `1px solid ${useMock ? 'var(--warning)' : 'var(--success)'}`,
          color: useMock ? 'var(--warning)' : 'var(--success)',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
          fontWeight: 500
        }}>
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: useMock ? 'var(--warning)' : 'var(--success)',
            boxShadow: `0 0 10px ${useMock ? 'var(--warning)' : 'var(--success)'}`
          }} />
          <span>
            {useMock 
              ? "Running in Demonstration Mode (Mock Mode): All watch inventory changes, service jobs, CRM loyalty logs, and billing invoices are saved locally in your browser's storage." 
              : "Running in Live Production Mode: Connected directly to the Smart Times MySQL Database API."}
          </span>
        </div>

        <h1 className="page-title">Welcome back, {user.name}</h1>
        <p className="page-subtitle">Showroom performance overview for today.</p>

        {/* KPIs Grid */}
        <div className="dashboard-grid">
          {/* Sales Card */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="card-title">Today's Sales</span>
                <h2 className="card-value">₹{(stats?.today_sales_sum || 0).toLocaleString()}</h2>
              </div>
              <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
                <TrendingUp size={24} />
              </div>
            </div>
            <div className="card-footer">
              <span>{stats?.today_sales_count} invoice(s) generated today</span>
            </div>
          </div>

          {/* Profit Snapshot (Admin/Manager only) */}
          {(user.role === 'admin' || user.role === 'manager') && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className="card-title">Today's Profit Margin</span>
                  <h2 className="card-value" style={{ color: 'var(--primary-gold)' }}>
                    ₹{(stats?.profit_snapshot || 0).toLocaleString()}
                  </h2>
                </div>
                <div style={{ background: 'var(--primary-gold-glow)', color: 'var(--primary-gold)', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
                  <DollarSign size={24} />
                </div>
              </div>
              <div className="card-footer">
                <span>Direct margin calculation based on unit cost</span>
              </div>
            </div>
          )}

          {/* Service status */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="card-title">Repairs Status</span>
                <h2 className="card-value">{stats?.jobs_due_today || 0}</h2>
              </div>
              <div style={{ background: 'var(--info-bg)', color: 'var(--info)', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
                <Wrench size={24} />
              </div>
            </div>
            <div className="card-footer">
              <span style={{ color: stats?.jobs_overdue > 0 ? 'var(--error)' : 'inherit' }}>
                {stats?.jobs_overdue || 0} overdue job(s), {stats?.jobs_ready || 0} ready for pickup
              </span>
            </div>
          </div>

          {/* Outstanding Customer Dues */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="card-title">Customer Dues</span>
                <h2 className="card-value" style={{ color: stats?.outstanding_dues_total > 0 ? 'var(--error)' : 'inherit' }}>
                  ₹{(stats?.outstanding_dues_total || 0).toLocaleString()}
                </h2>
              </div>
              <div style={{ background: 'var(--error-bg, rgba(239,68,68,0.1))', color: 'var(--error)', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
                <AlertTriangle size={24} />
              </div>
            </div>
            <div className="card-footer">
              <span>{stats?.outstanding_dues_count || 0} customer(s) with outstanding balances</span>
            </div>
          </div>
        </div>


        {/* Quick Actions and Alerts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          
          {/* Quick Actions Shortcuts */}
          <div className="card" style={{ height: 'fit-content' }}>
            <h3 style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              Quick Operations
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button onClick={() => navigate('/sales')} className="btn btn-primary" style={{ height: '70px', fontSize: '0.9rem', flexDirection: 'column' }}>
                <Plus size={18} /> New Sales Bill
              </button>
              {(user.role === 'admin' || user.role === 'manager') && (
                <button onClick={() => navigate('/purchase')} className="btn btn-secondary" style={{ height: '70px', fontSize: '0.9rem', flexDirection: 'column', border: '1px solid var(--border-color)' }}>
                  <Plus size={18} /> Record Purchase
                </button>
              )}
              <button onClick={() => navigate('/services')} className="btn btn-secondary" style={{ height: '70px', fontSize: '0.9rem', flexDirection: 'column', border: '1px solid var(--border-color)' }}>
                <Wrench size={18} /> New Service Job
              </button>
              <button onClick={() => navigate('/exchanges')} className="btn btn-secondary" style={{ height: '70px', fontSize: '0.9rem', flexDirection: 'column', border: '1px solid var(--border-color)' }}>
                <RefreshCw size={18} /> New Exchange
              </button>
            </div>
          </div>

          {/* Alerts / Stock Logs */}
          <div className="card" style={{ height: 'fit-content' }}>
            <h3 style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} color="var(--warning)" /> Inventory Alerts
            </h3>
            {stats?.low_stock_alerts && stats.low_stock_alerts.length > 0 ? (
              <ul style={{ listStyle: 'none' }}>
                {stats.low_stock_alerts.map((alert, idx) => (
                  <li 
                    key={idx} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '0.75rem 0', 
                      borderBottom: idx === stats.low_stock_alerts.length - 1 ? 'none' : '1px solid var(--border-color)' 
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600 }}>{alert.model}</span>
                    </div>
                    <span className="badge badge-danger">Low Stock ({alert.count})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '1rem 0' }}>
                No low stock warnings. All models well supplied!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
