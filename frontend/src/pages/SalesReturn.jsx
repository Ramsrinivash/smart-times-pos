import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Header from '../components/Layout/Header';
import { useAuth } from '../context/AuthContext';
import { Search, RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react';

const SalesReturn = () => {
  const { user } = useAuth();
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [foundSale, setFoundSale] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [refundMode, setRefundMode] = useState('cash');
  const [reason, setReason] = useState('');
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadReturns();
  }, []);

  const loadReturns = async () => {
    try {
      const data = await api.getSalesReturns();
      setReturns(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLookup = async () => {
    setLookupError('');
    setFoundSale(null);
    setSelectedItemId('');
    if (!invoiceSearch.trim()) return;
    setLoading(true);
    try {
      const sale = await api.getSale(invoiceSearch.trim());
      if (!sale) throw new Error('Invoice not found.');
      // Only show non-returned items
      const returnableItems = sale.items?.filter(si => !si.is_returned) || [];
      if (returnableItems.length === 0) {
        setLookupError('All items on this invoice have already been returned.');
      } else {
        setFoundSale({ ...sale, items: returnableItems });
      }
    } catch (err) {
      setLookupError(err.message || 'Invoice not found.');
    }
    setLoading(false);
  };

  const selectedItem = foundSale?.items?.find(si => si.watch_id === selectedItemId);
  const refundAmount = selectedItem ? (selectedItem.price_sold - selectedItem.discount_amount) : 0;

  const handleSubmitReturn = async () => {
    if (!foundSale || !selectedItemId) {
      alert('Please select the item to return.');
      return;
    }
    if (!reason.trim()) {
      alert('Please enter a reason for the return.');
      return;
    }

    try {
      await api.addSalesReturn({
        original_sale_id: foundSale.id,
        watch_id: selectedItemId,
        customer_id: foundSale.customer_id,
        refund_amount: refundAmount,
        refund_mode: refundMode,
        reason
      });
      setSuccess(`✅ Return processed successfully. Refund of ₹${refundAmount.toLocaleString()} via ${refundMode}.`);
      setFoundSale(null);
      setInvoiceSearch('');
      setSelectedItemId('');
      setReason('');
      await loadReturns();
    } catch (err) {
      alert(err.message || 'Return failed.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
      <Header searchPlaceholder="Search returns..." />
      <div className="page-container">
        <h1 className="page-title">Sales Returns</h1>
        <p className="page-subtitle">Process watch returns against a previous invoice.</p>

        {success && (
          <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
            <CheckCircle size={18} /> {success}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '1.5rem' }}>

          {/* Return Form */}
          <div className="card">
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RotateCcw size={18} /> Process Return
            </h3>

            {/* Invoice Lookup */}
            <div className="form-group">
              <label className="form-label">Search Invoice Number</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. ST-RETL-2627-0001"
                  value={invoiceSearch}
                  onChange={e => setInvoiceSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLookup()}
                  style={{ fontFamily: 'monospace' }}
                />
                <button className="btn btn-secondary" onClick={handleLookup} disabled={loading}>
                  <Search size={15} />
                </button>
              </div>
              {lookupError && (
                <p style={{ color: 'var(--error)', fontSize: '0.82rem', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <AlertTriangle size={13} /> {lookupError}
                </p>
              )}
            </div>

            {/* Invoice Found */}
            {foundSale && (
              <>
                <div style={{ background: 'var(--surface-card)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  <p style={{ margin: '0.15rem 0', fontWeight: 700 }}>Invoice: {foundSale.id}</p>
                  <p style={{ margin: '0.15rem 0', color: 'var(--text-secondary)' }}>Customer: {foundSale.customer?.name} ({foundSale.customer?.phone})</p>
                  <p style={{ margin: '0.15rem 0', color: 'var(--text-secondary)' }}>Date: {foundSale.invoice_date} | Net Paid: ₹{foundSale.net_amount?.toLocaleString()}</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Select Watch to Return *</label>
                  <select className="form-control" value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)}>
                    <option value="">-- Select Item --</option>
                    {foundSale.items.map(si => (
                      <option key={si.watch_id} value={si.watch_id}>
                        {si.watch?.brand} {si.watch?.model} (ID: {si.watch_id}) — ₹{(si.price_sold - si.discount_amount).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedItem && (
                  <div style={{ background: 'rgba(239,68,68,0.07)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.3)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                    <p style={{ margin: '0.1rem 0', color: 'var(--error)' }}>Refund Amount: <strong>₹{refundAmount.toLocaleString()}</strong></p>
                    <p style={{ margin: '0.1rem 0', color: 'var(--text-secondary)' }}>Watch will be returned to inventory for review.</p>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Refund Mode</label>
                  <select className="form-control" value={refundMode} onChange={e => setRefundMode(e.target.value)}>
                    <option value="cash">Cash Refund</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="store_credit">Store Credit (Outstanding)</option>
                    <option value="loyalty_points">Convert to Loyalty Points</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Return Reason *</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Customer complaint or reason for return..."
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    required
                  />
                </div>

                <button
                  onClick={handleSubmitReturn}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '1rem', background: 'var(--error)' }}
                >
                  <RotateCcw size={15} /> Confirm Return & Refund
                </button>
              </>
            )}
          </div>

          {/* Returns History */}
          <div className="card">
            <h3 style={{ marginBottom: '1.25rem' }}>Returns History ({returns.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '600px' }}>
              {returns.length > 0 ? returns.map(ret => (
                <div key={ret.id} style={{ background: 'var(--surface-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--primary-gold)' }}>Return #{ret.id}</span>
                    <span className="badge badge-danger">Return</span>
                  </div>
                  <p style={{ margin: '0.15rem 0', fontSize: '0.85rem' }}>Original Invoice: <strong>{ret.original_sale_id}</strong></p>
                  <p style={{ margin: '0.15rem 0', fontSize: '0.85rem' }}>Customer: <strong>{ret.customer?.name}</strong> ({ret.customer?.phone})</p>
                  <p style={{ margin: '0.15rem 0', fontSize: '0.85rem' }}>Watch: <strong>{ret.watch_id}</strong></p>
                  <p style={{ margin: '0.15rem 0', fontSize: '0.85rem', color: 'var(--error)' }}>Refund: <strong>₹{Number(ret.refund_amount).toLocaleString()}</strong> via {ret.refund_mode}</p>
                  <p style={{ margin: '0.15rem 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Reason: {ret.reason}</p>
                  <p style={{ margin: '0.15rem 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{ret.return_date}</p>
                </div>
              )) : (
                <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No returns processed yet.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SalesReturn;
