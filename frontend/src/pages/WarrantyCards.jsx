import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Header from '../components/Layout/Header';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, AlertTriangle, Search } from 'lucide-react';

const WarrantyCards = () => {
  const { user } = useAuth();
  const [warranties, setWarranties] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  const loadWarranties = async () => {
    setLoading(true);
    try {
      const data = await api.getWarrantyCards(search, filterStatus);
      setWarranties(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadWarranties();
  }, [filterStatus]);

  const today = new Date().toISOString().split('T')[0];

  const getStatus = (w) => {
    if (!w.is_active) return { label: 'Expired / Closed', color: 'danger' };
    if (w.expiry_date < today) return { label: 'Expired', color: 'danger' };
    const exp = new Date(w.expiry_date);
    const now = new Date();
    const daysLeft = Math.floor((exp - now) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 30) return { label: `Expiring in ${daysLeft} days`, color: 'warning' };
    return { label: `Valid — ${daysLeft} days left`, color: 'success' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
      <Header searchPlaceholder="Search warranty cards..." />
      <div className="page-container">
        <h1 className="page-title">Warranty Cards</h1>
        <p className="page-subtitle">Track warranty status for every watch sold.</p>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '240px' }}>
            <label className="form-label">Search by Customer / Watch / Invoice</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Name, phone, watch ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadWarranties()}
              />
              <button className="btn btn-secondary" onClick={loadWarranties}><Search size={15} /></button>
            </div>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Status Filter</label>
            <select className="form-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Warranties</option>
              <option value="active">Active Only</option>
              <option value="expiring">Expiring (≤30 days)</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)', padding: '2rem' }}>Loading warranty cards...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {warranties.length > 0 ? warranties.map(w => {
              const status = getStatus(w);
              return (
                <div key={w.id} style={{ background: 'var(--surface-card)', border: `2px solid ${status.color === 'success' ? 'var(--success)' : status.color === 'warning' ? 'var(--warning)' : 'var(--error)'}`, borderRadius: 'var(--radius-md)', padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
                  {/* Gold foil strip */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #d4af37, #f0cc60, #d4af37)' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ShieldCheck size={22} color={status.color === 'success' ? 'var(--success)' : status.color === 'warning' ? 'var(--warning)' : 'var(--error)'} />
                      <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>WARRANTY CARD</span>
                    </div>
                    <span className={`badge badge-${status.color}`}>{status.label}</span>
                  </div>

                  <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <p style={{ margin: 0 }}><strong>Watch ID:</strong> <span style={{ fontFamily: 'monospace', color: 'var(--primary-gold)' }}>{w.watch_id}</span></p>
                    <p style={{ margin: 0 }}><strong>Brand / Model:</strong> {w.watch?.brand} {w.watch?.model}</p>
                    <p style={{ margin: 0 }}><strong>Customer:</strong> {w.customer?.name}</p>
                    <p style={{ margin: 0 }}><strong>Phone:</strong> {w.customer?.phone}</p>
                    <p style={{ margin: 0 }}><strong>Invoice:</strong> <span style={{ fontFamily: 'monospace' }}>{w.sale_id}</span></p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', padding: '0.5rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>SALE DATE</span>
                        <span style={{ fontWeight: 600 }}>{w.sale_date}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>WARRANTY</span>
                        <span style={{ fontWeight: 600 }}>{w.warranty_months} months</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>EXPIRES</span>
                        <span style={{ fontWeight: 600, color: status.color === 'danger' ? 'var(--error)' : 'inherit' }}>{w.expiry_date}</span>
                      </div>
                    </div>
                    {w.notes && <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Note: {w.notes}</p>}
                  </div>
                </div>
              );
            }) : (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <ShieldCheck size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <p>No warranty cards found.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WarrantyCards;
