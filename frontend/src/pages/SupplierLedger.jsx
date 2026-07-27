import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Header from '../components/Layout/Header';
import { CreditCard, CheckCircle, Clock, AlertTriangle, Search } from 'lucide-react';
import { alertService } from '../utils/alert';

const SupplierLedger = () => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [marking, setMarking] = useState(null);
  const [payRef, setPayRef] = useState({});

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getPurchases();
      setPurchases(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleMarkPaid = async (id) => {
    if (marking) return;
    setMarking(id);
    try {
      await api.updatePurchasePayment(id, 'paid');
      alertService.success('Success', 'Supplier payment marked as paid.');
      await loadData();
    } catch (err) {
      alertService.error('Error', 'Failed to update payment: ' + err.message);
    } finally {
      setMarking(null);
    }
  };

  const filtered = purchases.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (p.supplier_name || '').toLowerCase().includes(q) ||
      (p.invoice_number || '').toLowerCase().includes(q) ||
      String(p.id).includes(q);
    const matchStatus = !filterStatus || p.payment_status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPending = filtered
    .filter(p => p.payment_status === 'pending')
    .reduce((acc, p) => acc + Number(p.total_amount || 0), 0);

  const totalPaid = filtered
    .filter(p => p.payment_status === 'paid')
    .reduce((acc, p) => acc + Number(p.total_amount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
      <Header searchPlaceholder="Search supplier ledger..." />
      <div className="page-container">
        <h1 className="page-title">Supplier Payment Ledger</h1>
        <p className="page-subtitle">Track and settle payments due to watch suppliers.</p>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card">
            <span className="card-title">Total Pending</span>
            <h2 className="card-value" style={{ color: 'var(--error)', fontSize: '1.4rem' }}>
              ₹{totalPending.toLocaleString('en-IN')}
            </h2>
            <div className="card-footer">{filtered.filter(p => p.payment_status === 'pending').length} purchase(s)</div>
          </div>
          <div className="card">
            <span className="card-title">Total Paid</span>
            <h2 className="card-value" style={{ color: 'var(--success)', fontSize: '1.4rem' }}>
              ₹{totalPaid.toLocaleString('en-IN')}
            </h2>
            <div className="card-footer">{filtered.filter(p => p.payment_status === 'paid').length} purchase(s)</div>
          </div>
          <div className="card">
            <span className="card-title">Total Purchases</span>
            <h2 className="card-value" style={{ fontSize: '1.4rem' }}>{filtered.length}</h2>
            <div className="card-footer">Filtered results</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px', background: 'var(--surface-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.75rem' }}>
            <Search size={16} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder="Search supplier, invoice..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', width: '100%', fontSize: '0.875rem' }}
            />
          </div>
          <select
            className="form-control"
            style={{ width: '160px', fontSize: '0.875rem' }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: '2rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Loading supplier ledger...</div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Supplier</th>
                  <th>Invoice No.</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                      No purchase records found.
                    </td>
                  </tr>
                ) : (
                  filtered.map(p => (
                    <tr key={p.id} style={{ opacity: p.payment_status === 'paid' ? 0.7 : 1 }}>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary-gold)' }}>#{p.id}</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{p.supplier_name || '—'}</span>
                        {p.remarks && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.remarks}</div>}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{p.invoice_number || '—'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{p.purchase_date}</td>
                      <td>
                        <span className="badge badge-info">
                          {p.watches ? p.watches.length : (p.item_count || '—')} pcs
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: p.payment_status === 'pending' ? 'var(--error)' : 'var(--success)' }}>
                          ₹{Number(p.total_amount || 0).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td>
                        {p.payment_status === 'paid' ? (
                          <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}>
                            <CheckCircle size={12} /> Paid
                          </span>
                        ) : (
                          <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}>
                            <Clock size={12} /> Pending
                          </span>
                        )}
                      </td>
                      <td>
                        {p.payment_status === 'pending' ? (
                          <button
                            id={`mark-paid-${p.id}`}
                            className="btn btn-primary"
                            style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                            disabled={marking === p.id}
                            onClick={() => handleMarkPaid(p.id)}
                          >
                            {marking === p.id ? '...' : 'Mark Paid'}
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Settled</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierLedger;
