import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Header from '../components/Layout/Header';
import { useAuth } from '../context/AuthContext';
import { PackageMinus, History, AlertTriangle } from 'lucide-react';
import { alertService } from '../utils/alert';

const ADJUST_REASONS = [
  { value: 'damage', label: 'Damage / Defect' },
  { value: 'loss', label: 'Lost / Theft' },
  { value: 'display', label: 'Moved to Display' },
  { value: 'internal_use', label: 'Internal / Staff Use' },
  { value: 'found', label: 'Found / Located' },
  { value: 'repair_returned', label: 'Returned from Repair' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = ['in_stock', 'damaged', 'display', 'reserved', 'refurbishing'];

const StockAdjustment = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [adjustmentLogs, setAdjustmentLogs] = useState([]);
  const [watchSearch, setWatchSearch] = useState('');
  const [selectedWatch, setSelectedWatch] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('damage');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const logs = await api.getStockAdjustmentLogs();
      setAdjustmentLogs(logs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchWatch = async () => {
    if (!watchSearch.trim()) return;
    try {
      const inv = await api.getInventory(watchSearch.trim(), '');
      if (!inv || inv.length === 0) {
        alertService.error('Not Found', 'No watches found matching your query.');
        setSearchResults([]);
        setSelectedWatch(null);
        return;
      }
      setSearchResults(inv);
      // If there is an exact unique ID match, auto-select it
      const exactMatch = inv.find(w => w.id.toLowerCase() === watchSearch.toLowerCase().trim());
      if (exactMatch) {
        setSelectedWatch(exactMatch);
        setNewStatus(exactMatch.status);
      } else {
        setSelectedWatch(null);
      }
      setSuccess('');
    } catch (err) {
      alertService.error('Error', 'Search failed: ' + err.message);
    }
  };

  const handleSubmitAdjustment = async () => {
    if (!selectedWatch) {
      alertService.warning('Watch Required', 'Select a watch first.');
      return;
    }
    if (!newStatus || newStatus === selectedWatch.status) {
      alertService.warning('Status Choice', 'Please select a different status to adjust to.');
      return;
    }
    if (!remarks.trim()) {
      alertService.warning('Remarks Required', 'Please enter remarks for this adjustment.');
      return;
    }
    setLoading(true);
    try {
      await api.adjustStock(selectedWatch.id, newStatus, reason, remarks);
      alertService.success('Success', `Watch ${selectedWatch.id} adjusted: ${selectedWatch.status} → ${newStatus}`);
      setSuccess(`✅ Watch ${selectedWatch.id} adjusted: ${selectedWatch.status} → ${newStatus}`);
      setSelectedWatch(null);
      setSearchResults([]);
      setRemarks('');
      setWatchSearch('');
      await loadLogs();
    } catch (err) {
      alertService.error('Error', err.message || 'Adjustment failed.');
    }
    setLoading(false);
  };

  const statusBadge = (s) => {
    const map = {
      in_stock: 'success', sold: 'info', damaged: 'danger',
      display: 'warning', reserved: 'warning', refurbishing: 'info', exchanged_returned: 'warning'
    };
    return map[s] || 'info';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
      <Header searchPlaceholder="Stock adjustment..." />
      <div className="page-container">
        <h1 className="page-title">Stock Adjustment Log</h1>
        <p className="page-subtitle">Record damage, loss, display transfers, and other stock movements.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '1.5rem' }}>

          {/* Adjustment Form */}
          <div className="card">
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PackageMinus size={18} /> Record Adjustment
            </h3>

            {success && (
              <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid var(--success)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '1rem', color: 'var(--success)', fontSize: '0.85rem' }}>
                {success}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Search Watch (Brand, Model, or Serial ID) *</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Rolex, 0838, or Serial No..."
                  value={watchSearch}
                  onChange={e => setWatchSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearchWatch()}
                />
                <button className="btn btn-secondary" onClick={handleSearchWatch}>Search</button>
              </div>
            </div>

            {/* Search Results Drawer */}
            {searchResults.length > 0 && (
              <div style={{ background: 'var(--surface-card)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--primary-gold)', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Search Results ({searchResults.length} found)
                </h4>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
                  <span className="badge badge-info">{searchResults.length} Total</span>
                  <span className="badge badge-success">{searchResults.filter(w => w.status === 'in_stock').length} In Stock</span>
                  <span className="badge badge-secondary">{searchResults.filter(w => w.status === 'sold').length} Sold</span>
                  {searchResults.filter(w => w.status !== 'in_stock' && w.status !== 'sold').length > 0 && (
                    <span className="badge badge-warning">{searchResults.filter(w => w.status !== 'in_stock' && w.status !== 'sold').length} Other</span>
                  )}
                </div>
                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                  <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '0.4rem 0.5rem' }}>Unique Serial ID</th>
                        <th style={{ padding: '0.4rem 0.5rem' }}>Brand & Model</th>
                        <th style={{ padding: '0.4rem 0.5rem' }}>Status</th>
                        <th style={{ padding: '0.4rem 0.5rem', textAlign: 'right' }}>Select</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.map(w => (
                        <tr key={w.id} style={{ borderBottom: '1px solid var(--border-color)', background: selectedWatch?.id === w.id ? 'rgba(212, 175, 55, 0.08)' : 'transparent' }}>
                          <td style={{ padding: '0.4rem 0.5rem', fontFamily: 'monospace', fontWeight: 600 }}>{w.id}</td>
                          <td style={{ padding: '0.4rem 0.5rem' }}>{w.brand} {w.model}</td>
                          <td style={{ padding: '0.4rem 0.5rem' }}>
                            <span className={`badge badge-${statusBadge(w.status)}`} style={{ fontSize: '0.7rem' }}>
                              {(w.status || '').replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right' }}>
                            <button
                              className="btn btn-secondary btn-xs"
                              style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem', minHeight: 'auto' }}
                              onClick={() => {
                                setSelectedWatch(w);
                                setNewStatus(w.status);
                              }}
                            >
                              {selectedWatch?.id === w.id ? 'Selected' : 'Choose'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedWatch && (
              <div style={{ background: 'rgba(212, 175, 55, 0.05)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-gold)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                <p style={{ margin: '0.1rem 0', fontWeight: 700, color: 'var(--primary-gold)' }}>Active Selection:</p>
                <p style={{ margin: '0.1rem 0', fontWeight: 600 }}>{selectedWatch.brand} {selectedWatch.model}</p>
                <p style={{ margin: '0.1rem 0', fontFamily: 'monospace' }}>Serial / ID: {selectedWatch.id}</p>
                <p style={{ margin: '0.1rem 0' }}>
                  Current Status: <span className={`badge badge-${statusBadge(selectedWatch.status)}`}>{(selectedWatch.status || '').replace('_', ' ')}</span>
                </p>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Adjustment Reason *</label>
                <select className="form-control" value={reason} onChange={e => setReason(e.target.value)}>
                  {ADJUST_REASONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">New Status *</label>
                <select className="form-control" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                  <option value="">-- Select --</option>
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Remarks / Details *</label>
              <textarea
                className="form-control"
                rows="3"
                placeholder="Describe the adjustment in detail..."
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
              />
            </div>

            <button
              onClick={handleSubmitAdjustment}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem' }}
              disabled={loading || !selectedWatch}
            >
              <PackageMinus size={15} /> Save Adjustment
            </button>
          </div>

          {/* Adjustment Log History */}
          <div className="card">
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={18} /> Adjustment History ({adjustmentLogs.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '600px' }}>
              {adjustmentLogs.length > 0 ? adjustmentLogs.map(log => (
                <div key={log.id} style={{ background: 'var(--surface-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--primary-gold)' }}>{log.watch_id}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{new Date(log.created_at).toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <span className={`badge badge-${statusBadge(log.old_status)}`}>{(log.old_status || '').replace('_', ' ')}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>→</span>
                    <span className={`badge badge-${statusBadge(log.new_status)}`}>{(log.new_status || '').replace('_', ' ')}</span>
                  </div>
                  <p style={{ margin: '0.2rem 0', fontSize: '0.82rem' }}>Reason: <strong>{ADJUST_REASONS.find(r => r.value === log.reason)?.label || log.reason}</strong></p>
                  <p style={{ margin: '0.1rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{log.remarks}</p>
                  <p style={{ margin: '0.1rem 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>By: {log.user?.name || 'System'}</p>
                </div>
              )) : (
                <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No adjustments recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockAdjustment;
