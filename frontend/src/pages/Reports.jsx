import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Header from '../components/Layout/Header';
import { useAuth } from '../context/AuthContext';
import { Download, FileText, BarChart2, TrendingUp, RefreshCw, Users, Wrench, Truck } from 'lucide-react';
import { exportCSV, exportExcel } from '../utils/exportUtils';

const Reports = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('sales');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [gstMonth, setGstMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [gstYear, setGstYear] = useState(String(new Date().getFullYear()));

  const [salesData, setSalesData] = useState([]);
  const [profitData, setProfitData] = useState([]);
  const [stockData, setStockData] = useState(null);
  const [purchaseLedger, setPurchaseLedger] = useState([]);
  const [exchangeData, setExchangeData] = useState([]);
  const [loyaltyData, setLoyaltyData] = useState([]);
  const [serviceData, setServiceData] = useState([]);
  const [supplierDues, setSupplierDues] = useState([]);
  const [gstData, setGstData] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadReport = async (tabId) => {
    setLoading(true);
    try {
      switch (tabId) {
        case 'sales': {
          const data = await api.getSalesReport(startDate || null, endDate || null);
          setSalesData(data);
          break;
        }
        case 'profit': {
          const data = await api.getProfitReport(startDate || null, endDate || null);
          setProfitData(data);
          break;
        }
        case 'stock': {
          const data = await api.getStockValuation();
          setStockData(data);
          break;
        }
        case 'purchase': {
          const data = await api.getPurchaseLedger();
          setPurchaseLedger(data);
          break;
        }
        case 'exchange': {
          const data = await api.getExchangeReport();
          setExchangeData(data);
          break;
        }
        case 'loyalty': {
          const data = await api.getLoyaltyReport();
          setLoyaltyData(data);
          break;
        }
        case 'services': {
          const data = await api.getPendingServiceReport();
          setServiceData(data);
          break;
        }
        case 'supplier_dues': {
          const data = await api.getSupplierDuesReport();
          setSupplierDues(data);
          break;
        }
        case 'gst': {
          const data = await api.getGstReport(gstMonth, gstYear);
          setGstData(data);
          break;
        }
        default: break;
      }
    } catch (err) {
      console.error('Report load error:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadReport(activeTab);
  }, [activeTab]);

  const switchTab = (tabId) => {
    setActiveTab(tabId);
  };

  const tabStyle = (t) => ({
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 600,
    fontSize: '0.82rem',
    cursor: 'pointer',
    border: 'none',
    background: activeTab === t ? 'var(--primary-gold)' : 'var(--surface-card)',
    color: activeTab === t ? '#000' : 'var(--text-primary)',
    transition: 'all 0.2s'
  });

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const tabs = [
    { id: 'sales', label: 'Daily/Monthly Sales', icon: <BarChart2 size={14} /> },
    ...(user.role !== 'sales' ? [
      { id: 'profit', label: 'Profit Margin', icon: <TrendingUp size={14} /> },
      { id: 'stock', label: 'Stock Valuation', icon: <FileText size={14} /> },
      { id: 'purchase', label: 'Purchase Ledger', icon: <FileText size={14} /> },
    ] : []),
    { id: 'exchange', label: 'Exchange Report', icon: <RefreshCw size={14} /> },
    { id: 'loyalty', label: 'Loyalty Points', icon: <Users size={14} /> },
    { id: 'services', label: 'Pending Repairs', icon: <Wrench size={14} /> },
    ...(user.role !== 'sales' ? [
      { id: 'supplier_dues', label: 'Supplier Dues', icon: <Truck size={14} /> },
      { id: 'gst', label: 'GST Report', icon: <FileText size={14} /> },
    ] : [])
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
      <Header searchPlaceholder="Search reports..." />
      <div className="page-container">
        <h1 className="page-title">Reports & Analytics</h1>
        <p className="page-subtitle">Business intelligence — exportable in Excel (.xlsx) and CSV formats.</p>

        {/* Date Filters */}
        {['sales', 'profit'].includes(activeTab) && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">From Date</label>
              <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">To Date</label>
              <input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <button className="btn btn-secondary" onClick={() => loadReport(activeTab)} style={{ height: '42px' }}>Apply Filter</button>
            <button className="btn btn-secondary" onClick={() => { setStartDate(''); setEndDate(''); setTimeout(() => loadReport(activeTab), 100); }} style={{ height: '42px' }}>Clear</button>
          </div>
        )}
        {activeTab === 'gst' && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Month</label>
              <select className="form-control" value={gstMonth} onChange={e => setGstMonth(e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => {
                  const m = String(i + 1).padStart(2, '0');
                  return <option key={m} value={m}>{new Date(2000, i).toLocaleString('en-IN', { month: 'long' })}</option>;
                })}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Year</label>
              <input type="number" className="form-control" value={gstYear} onChange={e => setGstYear(e.target.value)} style={{ width: '100px' }} />
            </div>
            <button className="btn btn-secondary" onClick={() => loadReport('gst')} style={{ height: '42px' }}>Load GST Report</button>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button key={tab.id} style={tabStyle(tab.id)} onClick={() => switchTab(tab.id)}>
              {tab.icon} <span style={{ marginLeft: '0.25rem' }}>{tab.label}</span>
            </button>
          ))}
        </div>

        {loading && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading report data...</div>}

        {/* ── SALES REPORT ── */}
        {activeTab === 'sales' && !loading && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Sales Report ({salesData.length} invoices)</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(
                  ['Invoice No', 'Date', 'Customer', 'Phone', 'Invoice Type', 'Subtotal', 'Discount', 'GST', 'Net Amount', 'Payment Mode'],
                  salesData.map(s => [s.id, s.invoice_date, s.customer?.name, s.customer?.phone, s.invoice_type, s.subtotal, s.discount_amount, s.gst_amount, s.net_amount, s.payment_mode]),
                  'sales_report'
                )}>
                  <Download size={13} /> Export CSV
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => exportExcel(
                  ['Invoice No', 'Date', 'Customer', 'Phone', 'Invoice Type', 'Subtotal', 'Discount', 'GST', 'Net Amount', 'Payment Mode'],
                  salesData.map(s => [s.id, s.invoice_date, s.customer?.name, s.customer?.phone, s.invoice_type, s.subtotal, s.discount_amount, s.gst_amount, s.net_amount, s.payment_mode]),
                  'sales_report', 'Sales Report'
                )}>
                  <Download size={13} /> Export Excel
                </button>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead><tr>
                  <th>Invoice No</th><th>Date</th><th>Customer</th><th>Type</th>
                  <th>Subtotal</th><th>Discount</th><th>GST</th><th>Net Amount</th><th>Mode</th>
                </tr></thead>
                <tbody>
                  {salesData.length > 0 ? salesData.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{s.id}</td>
                      <td>{s.invoice_date}</td>
                      <td>{s.customer?.name}<br /><small style={{ color: 'var(--text-secondary)' }}>{s.customer?.phone}</small></td>
                      <td><span className={`badge badge-${s.invoice_type === 'gst' ? 'success' : 'info'}`}>{s.invoice_type.toUpperCase()}</span></td>
                      <td>{fmt(s.subtotal)}</td>
                      <td style={{ color: 'var(--error)' }}>{fmt(s.discount_amount || 0)}</td>
                      <td>{fmt(s.gst_amount)}</td>
                      <td style={{ fontWeight: 700 }}>{fmt(s.net_amount)}</td>
                      <td style={{ textTransform: 'capitalize' }}>{s.payment_mode}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No sales data for selected period.</td></tr>
                  )}
                </tbody>
                {salesData.length > 0 && (
                  <tfoot>
                    <tr style={{ fontWeight: 700, background: 'var(--surface-card)' }}>
                      <td colSpan="4">Total ({salesData.length} invoices)</td>
                      <td>{fmt(salesData.reduce((a, s) => a + Number(s.subtotal || 0), 0))}</td>
                      <td style={{ color: 'var(--error)' }}>{fmt(salesData.reduce((a, s) => a + Number(s.discount_amount || 0), 0))}</td>
                      <td>{fmt(salesData.reduce((a, s) => a + Number(s.gst_amount || 0), 0))}</td>
                      <td>{fmt(salesData.reduce((a, s) => a + Number(s.net_amount || 0), 0))}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* ── PROFIT REPORT ── */}
        {activeTab === 'profit' && !loading && user.role !== 'sales' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Profit Margin Report</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(
                  ['Invoice No', 'Date', 'Customer', 'Net Amount', 'Cost', 'Profit', 'Margin %'],
                  profitData.map(s => {
                    const cost = s.items.reduce((a, si) => a + Number(si.cost_price || 0), 0);
                    const margin = Number(s.net_amount) > 0 ? ((Number(s.total_profit) / Number(s.net_amount)) * 100).toFixed(1) : 0;
                    return [s.id, s.invoice_date, s.customer?.name, s.net_amount, cost, s.total_profit, margin + '%'];
                  }),
                  'profit_report'
                )}>
                  <Download size={13} /> Export CSV
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => exportExcel(
                  ['Invoice No', 'Date', 'Customer', 'Net Amount', 'Cost', 'Profit', 'Margin %'],
                  profitData.map(s => {
                    const cost = s.items.reduce((a, si) => a + Number(si.cost_price || 0), 0);
                    const margin = Number(s.net_amount) > 0 ? ((Number(s.total_profit) / Number(s.net_amount)) * 100).toFixed(1) : 0;
                    return [s.id, s.invoice_date, s.customer?.name, s.net_amount, cost, s.total_profit, margin + '%'];
                  }),
                  'profit_report', 'Profit Report'
                )}>
                  <Download size={13} /> Export Excel
                </button>
              </div>
            </div>
            <table className="data-table">
              <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Net Sale</th><th>Total Cost</th><th>Profit</th><th>Margin %</th></tr></thead>
              <tbody>
                {profitData.length > 0 ? profitData.map(s => {
                  const cost = s.items.reduce((a, si) => a + Number(si.cost_price || 0), 0);
                  const margin = Number(s.net_amount) > 0 ? ((Number(s.total_profit) / Number(s.net_amount)) * 100).toFixed(1) : 0;
                  return (
                    <tr key={s.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{s.id}</td>
                      <td>{s.invoice_date}</td>
                      <td>{s.customer?.name}</td>
                      <td>{fmt(s.net_amount)}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{fmt(cost)}</td>
                      <td style={{ color: Number(s.total_profit || 0) >= 0 ? 'var(--success)' : 'var(--error)', fontWeight: 700 }}>{fmt(s.total_profit)}</td>
                      <td><span className={`badge badge-${Number(margin) > 20 ? 'success' : Number(margin) > 10 ? 'warning' : 'danger'}`}>{margin}%</span></td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No profit data for selected period.</td></tr>
                )}
              </tbody>
              {profitData.length > 0 && (
                <tfoot>
                  <tr style={{ fontWeight: 700 }}>
                    <td colSpan="3">Total</td>
                    <td>{fmt(profitData.reduce((a, s) => a + Number(s.net_amount || 0), 0))}</td>
                    <td>{fmt(profitData.reduce((a, s) => a + s.items.reduce((b, si) => b + Number(si.cost_price || 0), 0), 0))}</td>
                    <td style={{ color: 'var(--success)' }}>{fmt(profitData.reduce((a, s) => a + Number(s.total_profit || 0), 0))}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* ── STOCK VALUATION ── */}
        {activeTab === 'stock' && !loading && stockData && user.role !== 'sales' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div className="card" style={{ textAlign: 'center' }}>
                <span className="card-title">Units In Stock</span>
                <h2 className="card-value">{stockData.total_in_stock_count}</h2>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <span className="card-title">Cost Valuation</span>
                <h2 className="card-value" style={{ color: 'var(--primary-gold)' }}>{fmt(stockData.total_cost_valuation)}</h2>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <span className="card-title">MRP Valuation</span>
                <h2 className="card-value">{fmt(stockData.total_mrp_valuation)}</h2>
              </div>
            </div>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3>Brand-wise Stock Breakdown</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(
                    ['Brand', 'Units', 'Cost Value', 'MRP Value'],
                    stockData.breakdown_by_brand.map(b => [b.brand, b.count, b.cost_value, b.mrp_value]),
                    'stock_valuation'
                  )}><Download size={13} /> Export CSV</button>
                  <button className="btn btn-primary btn-sm" onClick={() => exportExcel(
                    ['Brand', 'Units', 'Cost Value', 'MRP Value'],
                    stockData.breakdown_by_brand.map(b => [b.brand, b.count, b.cost_value, b.mrp_value]),
                    'stock_valuation', 'Stock Valuation'
                  )}><Download size={13} /> Export Excel</button>
                </div>
              </div>
              <table className="data-table">
                <thead><tr><th>Brand</th><th>Units In Stock</th><th>Cost Valuation</th><th>MRP Valuation</th></tr></thead>
                <tbody>
                  {stockData.breakdown_by_brand.map((b, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{b.brand}</td>
                      <td>{b.count}</td>
                      <td>{fmt(b.cost_value)}</td>
                      <td>{fmt(b.mrp_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PURCHASE LEDGER ── */}
        {activeTab === 'purchase' && !loading && user.role !== 'sales' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3>Purchase Ledger ({purchaseLedger.length} units)</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(
                  ['Watch Serial', 'Brand', 'Model', 'Supplier', 'Purchase Date', 'Invoice Ref', 'MRP', 'Discount %', 'Cost Price', 'Selling Price', 'GST Rate', 'Status'],
                  purchaseLedger.map(r => [r.watch_id, r.brand, r.model, r.supplier_name, r.purchase_date, r.invoice_number, r.mrp, r.discount_percent, r.cost_price, r.selling_price, r.gst_rate + '%', r.watch_status]),
                  'purchase_ledger'
                )}><Download size={13} /> Export CSV</button>
                <button className="btn btn-primary btn-sm" onClick={() => exportExcel(
                  ['Watch Serial', 'Brand', 'Model', 'Supplier', 'Purchase Date', 'Invoice Ref', 'MRP', 'Discount %', 'Cost Price', 'Selling Price', 'GST Rate', 'Status'],
                  purchaseLedger.map(r => [r.watch_id, r.brand, r.model, r.supplier_name, r.purchase_date, r.invoice_number, r.mrp, r.discount_percent, r.cost_price, r.selling_price, r.gst_rate + '%', r.watch_status]),
                  'purchase_ledger', 'Purchase Ledger'
                )}><Download size={13} /> Export Excel</button>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead><tr>
                  <th>Watch ID</th><th>Brand / Model</th><th>Supplier</th><th>Date</th>
                  <th>MRP</th><th>Disc %</th><th>Cost Price</th><th>Selling Price</th><th>GST</th><th>Status</th>
                </tr></thead>
                <tbody>
                  {purchaseLedger.map((r, idx) => (
                    <tr key={idx}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{r.watch_id}</td>
                      <td><strong>{r.brand}</strong><br /><small style={{ color: 'var(--text-secondary)' }}>{r.model}</small></td>
                      <td>{r.supplier_name}</td>
                      <td>{r.purchase_date}</td>
                      <td>{fmt(r.mrp)}</td>
                      <td>{r.discount_percent}%</td>
                      <td style={{ color: 'var(--primary-gold)' }}>{fmt(r.cost_price)}</td>
                      <td>{fmt(r.selling_price)}</td>
                      <td>{r.gst_rate}%</td>
                      <td><span className={`badge badge-${r.watch_status === 'in_stock' ? 'success' : r.watch_status === 'sold' ? 'info' : 'warning'}`}>{r.watch_status.replace('_', ' ')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── EXCHANGE REPORT ── */}
        {activeTab === 'exchange' && !loading && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3>Exchange Report ({exchangeData.length} exchanges)</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(
                  ['Date', 'Customer', 'Orig Invoice', 'Returned Watch', 'Replacement Watch', 'Difference ₹', 'Type', 'Within Window'],
                  exchangeData.map(ex => [ex.exchange_date, ex.customer?.name, ex.original_sale_id, ex.returned_watch_id, ex.replacement_watch_id, ex.difference_amount, ex.exchange_type, ex.within_exchange_window ? 'Yes' : 'No']),
                  'exchange_report'
                )}><Download size={13} /> Export CSV</button>
                <button className="btn btn-primary btn-sm" onClick={() => exportExcel(
                  ['Date', 'Customer', 'Orig Invoice', 'Returned Watch', 'Replacement Watch', 'Difference ₹', 'Type', 'Within Window'],
                  exchangeData.map(ex => [ex.exchange_date, ex.customer?.name, ex.original_sale_id, ex.returned_watch_id, ex.replacement_watch_id, ex.difference_amount, ex.exchange_type, ex.within_exchange_window ? 'Yes' : 'No']),
                  'exchange_report', 'Exchange Report'
                )}><Download size={13} /> Export Excel</button>
              </div>
            </div>
            <table className="data-table">
              <thead><tr>
                <th>Date</th><th>Customer</th><th>Orig Invoice</th><th>Returned</th><th>Replacement</th><th>Difference</th><th>Type</th><th>Status</th>
              </tr></thead>
              <tbody>
                {exchangeData.length > 0 ? exchangeData.map(ex => (
                  <tr key={ex.id}>
                    <td>{ex.exchange_date}</td>
                    <td>{ex.customer?.name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{ex.original_sale_id}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--error)' }}>{ex.returned_watch_id}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--success)' }}>{ex.replacement_watch_id}</td>
                    <td style={{ color: ex.difference_amount >= 0 ? 'var(--success)' : 'var(--error)' }}>{fmt(Math.abs(ex.difference_amount))}{ex.difference_amount < 0 ? ' (Refund)' : ''}</td>
                    <td><span className="badge badge-info">{ex.exchange_type.replace('_', ' ')}</span></td>
                    <td><span className={`badge badge-${ex.status === 'resellable' ? 'success' : ex.status === 'pending_review' ? 'warning' : 'info'}`}>{ex.status.replace('_', ' ')}</span></td>
                  </tr>
                )) : (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No exchanges recorded.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── LOYALTY POINTS REPORT ── */}
        {activeTab === 'loyalty' && !loading && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3>Loyalty Points Ledger ({loyaltyData.length} transactions)</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(
                  ['Date', 'Customer', 'Phone', 'Type', 'Points Earned', 'Points Redeemed', 'Reference', 'Remarks'],
                  loyaltyData.map(l => [l.created_at, l.customer?.name, l.customer?.phone, l.transaction_type, l.points_earned, l.points_redeemed, l.reference_id, l.remarks]),
                  'loyalty_report'
                )}><Download size={13} /> Export CSV</button>
                <button className="btn btn-primary btn-sm" onClick={() => exportExcel(
                  ['Date', 'Customer', 'Phone', 'Type', 'Points Earned', 'Points Redeemed', 'Reference', 'Remarks'],
                  loyaltyData.map(l => [l.created_at, l.customer?.name, l.customer?.phone, l.transaction_type, l.points_earned, l.points_redeemed, l.reference_id, l.remarks]),
                  'loyalty_report', 'Loyalty Report'
                )}><Download size={13} /> Export Excel</button>
              </div>
            </div>
            <table className="data-table">
              <thead><tr>
                <th>Date</th><th>Customer</th><th>Type</th><th>Earned</th><th>Redeemed</th><th>Reference</th>
              </tr></thead>
              <tbody>
                {loyaltyData.length > 0 ? loyaltyData.map(l => (
                  <tr key={l.id}>
                    <td>{l.created_at}</td>
                    <td>{l.customer?.name}<br /><small style={{ color: 'var(--text-secondary)' }}>{l.customer?.phone}</small></td>
                    <td><span className={`badge badge-${l.transaction_type === 'purchase' ? 'success' : l.transaction_type === 'redemption' ? 'warning' : 'danger'}`}>{l.transaction_type}</span></td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>{l.points_earned > 0 ? `+${l.points_earned} pts` : '—'}</td>
                    <td style={{ color: 'var(--error)', fontWeight: 600 }}>{l.points_redeemed > 0 ? `-${l.points_redeemed} pts` : '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{l.reference_id}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No loyalty transactions yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── PENDING SERVICE JOBS ── */}
        {activeTab === 'services' && !loading && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3>Pending Service Jobs ({serviceData.length})</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(
                  ['Job Card No', 'Customer', 'Phone', 'Watch', 'Issue', 'Status', 'Due Date', 'Overdue', 'Estimate ₹'],
                  serviceData.map(j => [
                    j.id, j.customer?.name, j.customer?.phone,
                    j.watch_id || `${j.watch_details?.brand} ${j.watch_details?.model}`,
                    j.issue_reported, j.status, j.expected_delivery_date, j.is_overdue ? 'YES' : 'No', j.estimated_cost
                  ]),
                  'pending_services'
                )}><Download size={13} /> Export CSV</button>
                <button className="btn btn-primary btn-sm" onClick={() => exportExcel(
                  ['Job Card No', 'Customer', 'Phone', 'Watch', 'Issue', 'Status', 'Due Date', 'Overdue', 'Estimate ₹'],
                  serviceData.map(j => [
                    j.id, j.customer?.name, j.customer?.phone,
                    j.watch_id || `${j.watch_details?.brand} ${j.watch_details?.model}`,
                    j.issue_reported, j.status, j.expected_delivery_date, j.is_overdue ? 'YES' : 'No', j.estimated_cost
                  ]),
                  'pending_services', 'Service Report'
                )}><Download size={13} /> Export Excel</button>
              </div>
            </div>
            <table className="data-table">
              <thead><tr>
                <th>Job Card</th><th>Customer</th><th>Watch</th><th>Issue</th><th>Status</th><th>Due Date</th><th>Estimate</th>
              </tr></thead>
              <tbody>
                {serviceData.length > 0 ? serviceData.map(j => (
                  <tr key={j.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{j.id}</td>
                    <td>{j.customer?.name}<br /><small>{j.customer?.phone}</small></td>
                    <td style={{ fontSize: '0.85rem' }}>{j.watch_id || `${j.watch_details?.brand} ${j.watch_details?.model}`}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '200px' }}>{j.issue_reported}</td>
                    <td><span className={`badge badge-${j.status === 'received' ? 'danger' : j.status === 'in_repair' ? 'warning' : 'success'}`}>{j.status.replace('_', ' ')}</span></td>
                    <td style={{ color: j.is_overdue ? 'var(--error)' : 'inherit', fontWeight: j.is_overdue ? 700 : 400 }}>
                      {j.expected_delivery_date || 'N/A'}
                      {j.is_overdue && <span className="badge badge-danger" style={{ marginLeft: '0.5rem' }}>OVERDUE</span>}
                    </td>
                    <td>{fmt(j.estimated_cost)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No pending repair jobs.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── SUPPLIER DUES ── */}
        {activeTab === 'supplier_dues' && !loading && user.role !== 'sales' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3>Supplier Outstanding Dues ({supplierDues.length} bills)</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(
                  ['Purchase ID', 'Supplier', 'Invoice Ref', 'Date', 'Total Amount', 'Status'],
                  supplierDues.map(p => [p.id, p.supplier_name, p.invoice_number, p.purchase_date, p.total_amount, p.payment_status]),
                  'supplier_dues'
                )}><Download size={13} /> Export CSV</button>
                <button className="btn btn-primary btn-sm" onClick={() => exportExcel(
                  ['Purchase ID', 'Supplier', 'Invoice Ref', 'Date', 'Total Amount', 'Status'],
                  supplierDues.map(p => [p.id, p.supplier_name, p.invoice_number, p.purchase_date, p.total_amount, p.payment_status]),
                  'supplier_dues', 'Supplier Dues'
                )}><Download size={13} /> Export Excel</button>
              </div>
            </div>
            {supplierDues.length > 0 ? (
              <table className="data-table">
                <thead><tr>
                  <th>Purchase ID</th><th>Supplier</th><th>Invoice Ref</th><th>Date</th><th>Amount Due</th><th>Units</th>
                </tr></thead>
                <tbody>
                  {supplierDues.map(p => (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td><strong>{p.supplier_name}</strong></td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{p.invoice_number}</td>
                      <td>{p.purchase_date}</td>
                      <td style={{ color: 'var(--error)', fontWeight: 700 }}>{fmt(p.total_amount)}</td>
                      <td>{p.watches?.length || 0} units</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 700 }}>
                    <td colSpan="4">Total Outstanding</td>
                    <td style={{ color: 'var(--error)' }}>{fmt(supplierDues.reduce((a, p) => a + Number(p.total_amount || 0), 0))}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--success)' }}>No pending supplier dues — all purchase bills settled.</p>
            )}
          </div>
        )}

        {/* ── GST REPORT ── */}
        {activeTab === 'gst' && !loading && user.role !== 'sales' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3>GST Output Report — {new Date(2000, Number(gstMonth) - 1).toLocaleString('en-IN', { month: 'long' })} {gstYear}</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(
                  ['Invoice No', 'Date', 'Customer', 'GSTIN', 'Watch Serial', 'HSN', 'Taxable Value', 'CGST', 'SGST', 'Total GST', 'Invoice Total'],
                  gstData.flatMap(s => s.items.map(si => [
                    s.id, s.invoice_date, s.customer?.name, s.customer?.gstin || 'N/A',
                    si.watch_id, si.watch?.hsn_code || '9102', (si.price_sold - si.discount_amount), si.gst_amount / 2, si.gst_amount / 2, si.gst_amount, s.net_amount
                  ])),
                  'gst_report'
                )}><Download size={13} /> Export CSV</button>
                <button className="btn btn-primary btn-sm" onClick={() => exportExcel(
                  ['Invoice No', 'Date', 'Customer', 'GSTIN', 'Watch Serial', 'HSN', 'Taxable Value', 'CGST', 'SGST', 'Total GST', 'Invoice Total'],
                  gstData.flatMap(s => s.items.map(si => [
                    s.id, s.invoice_date, s.customer?.name, s.customer?.gstin || 'N/A',
                    si.watch_id, si.watch?.hsn_code || '9102', (si.price_sold - si.discount_amount), si.gst_amount / 2, si.gst_amount / 2, si.gst_amount, s.net_amount
                  ])),
                  'gst_report', 'GST Report'
                )}><Download size={13} /> Export Excel</button>
              </div>
            </div>
            <table className="data-table">
              <thead><tr>
                <th>Invoice No</th><th>Date</th><th>Customer</th><th>Watch</th>
                <th>Taxable Amt</th><th>CGST</th><th>SGST</th><th>Total GST</th>
              </tr></thead>
              <tbody>
                {gstData.length > 0 ? gstData.flatMap(s => s.items.map((si, idx) => (
                  <tr key={`${s.id}-${idx}`}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{s.id}</td>
                    <td>{s.invoice_date}</td>
                    <td>{s.customer?.name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{si.watch_id}</td>
                    <td>{fmt(si.price_sold - si.discount_amount)}</td>
                    <td>{fmt(si.gst_amount / 2)}</td>
                    <td>{fmt(si.gst_amount / 2)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary-gold)' }}>{fmt(si.gst_amount)}</td>
                  </tr>
                ))) : (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No GST invoices for selected month/year.</td></tr>
                )}
              </tbody>
              {gstData.length > 0 && (
                <tfoot>
                  <tr style={{ fontWeight: 700 }}>
                    <td colSpan="4">Total</td>
                    <td></td>
                    <td>{fmt(gstData.flatMap(s => s.items).reduce((a, si) => a + Number(si.gst_amount || 0) / 2, 0))}</td>
                    <td>{fmt(gstData.flatMap(s => s.items).reduce((a, si) => a + Number(si.gst_amount || 0) / 2, 0))}</td>
                    <td style={{ color: 'var(--primary-gold)' }}>{fmt(gstData.flatMap(s => s.items).reduce((a, si) => a + Number(si.gst_amount || 0), 0))}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

      </div>
    </div>
  );
};

export default Reports;
