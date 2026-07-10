import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Layout/Header';
import { Search } from 'lucide-react';

const Exchanges = () => {
  const { user } = useAuth();
  
  const [originalSaleId, setOriginalSaleId] = useState('');
  const [originalSale, setOriginalSale] = useState(null);
  const [selectedWatchId, setSelectedWatchId] = useState('');
  const [replacementWatchId, setReplacementWatchId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [exchangesList, setExchangesList] = useState([]);
  
  const [diffCalculation, setDiffCalculation] = useState(null);

  const fetchExchanges = async () => {
    try {
      const list = await api.getExchanges();
      setExchangesList(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchExchanges();
  }, []);

  const handleSearchInvoice = async () => {
    if (!originalSaleId) return;
    try {
      const sale = await api.getSale(originalSaleId);
      setOriginalSale(sale);
      if (sale.items?.length > 0) {
        setSelectedWatchId(sale.items[0].watch_id);
      }
    } catch (err) {
      alert(err.message || 'Invoice not found.');
      setOriginalSale(null);
    }
  };

  useEffect(() => {
    const runCalculation = async () => {
      if (!originalSale || !selectedWatchId || !replacementWatchId) {
        setDiffCalculation(null);
        return;
      }

      try {
        const item = originalSale.items.find(si => si.watch_id === selectedWatchId);
        const inventory = await api.getInventory(replacementWatchId);
        const replacement = inventory.find(w => w.id === replacementWatchId);

        if (!item || !replacement) {
          setDiffCalculation(null);
          return;
        }

        const credit = item.price_sold - item.discount_amount;
        const replaceCost = replacement.selling_price;
        const diff = replaceCost - credit;

        setDiffCalculation({
          credit,
          replaceCost,
          diff,
          replacementBrand: replacement.brand,
          replacementModel: replacement.model
        });
      } catch (err) {
        setDiffCalculation(null);
      }
    };
    runCalculation();
  }, [originalSale, selectedWatchId, replacementWatchId]);

  const handleSubmitExchange = async (e) => {
    e.preventDefault();
    if (!originalSaleId || !selectedWatchId || !replacementWatchId) return;
    try {
      await api.addExchange({
        original_sale_id: originalSaleId,
        returned_watch_id: selectedWatchId,
        replacement_watch_id: replacementWatchId,
        remarks
      });
      alert('Exchange processed successfully!');
      setOriginalSaleId('');
      setOriginalSale(null);
      setReplacementWatchId('');
      setRemarks('');
      setDiffCalculation(null);
      fetchExchanges();
    } catch (err) {
      alert(err.message || 'Exchange submission failed.');
    }
  };

  const handleApproveReturn = async (exchangeId, actionStatus) => {
    try {
      await api.approveExchangeReview(exchangeId, actionStatus);
      alert('Return item audited successfully.');
      fetchExchanges();
    } catch (err) {
      alert(err.message || 'Failed to submit review.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
      <Header searchPlaceholder="Search exchanges..." />
      <div className="page-container">
        <h1 className="page-title">Exchange Management</h1>
        <p className="page-subtitle">Handle post-purchase returns and replacements.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          
          <div className="card" style={{ height: 'fit-content' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>Create Exchange Request</h3>
            
            <div className="form-group">
              <label className="form-label">Search Original Invoice</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. WS-RETL-2627-0001" 
                  value={originalSaleId}
                  onChange={e => setOriginalSaleId(e.target.value)}
                />
                <button type="button" onClick={handleSearchInvoice} className="btn btn-secondary">
                  <Search size={16} /> Lookup
                </button>
              </div>
            </div>

            {originalSale && (
              <form onSubmit={handleSubmitExchange} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '1rem', background: 'var(--surface-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                  <p>Customer: <strong>{originalSale.customer?.name}</strong> ({originalSale.customer?.phone})</p>
                  <p>Invoice Type: <strong>{originalSale.invoice_type.toUpperCase()}</strong></p>
                </div>

                <div className="form-group">
                  <label className="form-label">Select watch being returned</label>
                  <select 
                    className="form-control" 
                    value={selectedWatchId}
                    onChange={e => setSelectedWatchId(e.target.value)}
                  >
                    {originalSale.items?.map(si => (
                      <option key={si.watch_id} value={si.watch_id}>
                        {si.watch?.brand} {si.watch?.model} (Serial: {si.watch_id}) - ₹{(si.price_sold - si.discount_amount).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Replacement Watch ID / Serial *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Enter new Watch ID in stock" 
                    value={replacementWatchId}
                    onChange={e => setReplacementWatchId(e.target.value)}
                    required
                  />
                </div>

                {diffCalculation && (
                  <div style={{ padding: '1rem', background: 'var(--primary-gold-glow)', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-gold)', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                    <h4 style={{ color: 'var(--primary-gold)', marginBottom: '0.25rem' }}>Exchange Calculation:</h4>
                    <p>Returned Credit: ₹{diffCalculation.credit.toLocaleString()}</p>
                    <p>Replacement ({diffCalculation.replacementBrand} {diffCalculation.replacementModel}): ₹{diffCalculation.replaceCost.toLocaleString()}</p>
                    <div style={{ fontWeight: 800, marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                      {diffCalculation.diff > 0 ? (
                        <span style={{ color: 'var(--warning)' }}>Customer Pays Difference: ₹{diffCalculation.diff.toLocaleString()}</span>
                      ) : diffCalculation.diff < 0 ? (
                        <span style={{ color: 'var(--success)' }}>Credit Note Issued: ₹{Math.abs(diffCalculation.diff).toLocaleString()}</span>
                      ) : (
                        <span>Even Exchange (No payment due)</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Remarks / Reason for Return</label>
                  <input type="text" className="form-control" placeholder="Remarks..." value={remarks} onChange={e => setRemarks(e.target.value)} />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  Submit Exchange Transactions
                </button>
              </form>
            )}
          </div>

          <div className="card" style={{ height: 'fit-content' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>Exchanges Log & Audits</h3>
            <div style={{ overflowY: 'auto', maxHeight: '500px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {exchangesList.length > 0 ? (
                exchangesList.map(ex => (
                  <div key={ex.id} style={{ background: 'var(--surface-card)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600 }}>Ref ID: {ex.id}</span>
                      <span className={`badge badge-${ex.status === 'pending_review' ? 'warning' : 'success'}`}>
                        {ex.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p style={{ margin: '0.2rem 0' }}>Returned: <strong>{ex.returnedWatch?.brand} {ex.returnedWatch?.model}</strong> (Serial: {ex.returned_watch_id})</p>
                    <p style={{ margin: '0.2rem 0' }}>Replacement: <strong>{ex.replacementWatch?.brand} {ex.replacementWatch?.model}</strong> (Serial: {ex.replacement_watch_id})</p>
                    <p style={{ margin: '0.2rem 0' }}>Date: {ex.exchange_date}</p>
                    
                    {ex.status === 'pending_review' && (user.role === 'admin' || user.role === 'manager') && (
                      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                        <button onClick={() => handleApproveReturn(ex.id, 'resellable')} className="btn btn-primary btn-sm" style={{ padding: '0.3rem 0.6rem' }}>
                          Mark Resellable
                        </button>
                        <button onClick={() => handleApproveReturn(ex.id, 'refurbish')} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.6rem', border: '1px solid var(--border-color)' }}>
                          Send for Refurbish
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--text-secondary)', padding: '1rem' }}>No past exchange records found.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Exchanges;
