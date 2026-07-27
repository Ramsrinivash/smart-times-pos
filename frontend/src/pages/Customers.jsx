import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Header from '../components/Layout/Header';
import { Phone, MapPin, Award, Plus, Calendar, Printer, X, FileText } from 'lucide-react';
import { alertService } from '../utils/alert';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [searchVal, setSearchVal] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState([]);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [dob, setDob] = useState('');
  const [anniversary, setAnniversary] = useState('');
  const [tags, setTags] = useState('Regular');
  const [notes, setNotes] = useState('');

  const [reprintInvoice, setReprintInvoice] = useState(null);
  const [settings, setSettings] = useState(null);

  const fetchCustomers = async () => {
    try {
      const data = await api.getCustomers(searchVal);
      setCustomers(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const checkSessionSearch = () => {
      const sessionSearch = sessionStorage.getItem('customer_search');
      if (sessionSearch) {
        setSearchVal(sessionSearch);
        sessionStorage.removeItem('customer_search');
      }
    };
    checkSessionSearch();

    window.addEventListener('refresh-customer-search', checkSessionSearch);
    return () => window.removeEventListener('refresh-customer-search', checkSessionSearch);
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [searchVal]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const s = await api.getSettings();
        setSettings(s);
      } catch (err) {
        console.error(err);
      }
    };
    loadSettings();
  }, []);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      await api.addCustomer({ name, phone, email, address, dob, anniversary, tags, notes });
      alertService.success('Success', 'Customer profile created successfully!');
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setDob('');
      setAnniversary('');
      setTags('Regular');
      setNotes('');
      setShowAddModal(false);
      fetchCustomers();
    } catch (err) {
      alertService.error('Error', err.message || 'Failed to add customer.');
    }
  };

  const handleSelectCustomer = async (id) => {
    setSelectedCustomerId(id);
    try {
      const history = await api.getCustomerHistory(id);
      setSelectedHistory(history);
    } catch (err) {
      console.error(err);
    }
  };

  const activeCust = customers.find(c => c.id === selectedCustomerId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
      <Header searchVal={searchVal} setSearchVal={setSearchVal} searchPlaceholder="Search customers by name, phone..." />
      <div className="page-container">
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 className="page-title">CRM Profiles</h1>
            <p className="page-subtitle">Loyalty ledger and customer purchase summaries.</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            <Plus size={16} /> Add Profile
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          
          <div className="card" style={{ height: 'fit-content' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>Customer Profiles</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '550px', overflowY: 'auto' }}>
              {customers.length > 0 ? (
                customers.map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => handleSelectCustomer(c.id)}
                    style={{ 
                      background: selectedCustomerId === c.id ? 'var(--primary-gold-glow)' : 'var(--surface-card)', 
                      border: selectedCustomerId === c.id ? '1px solid var(--primary-gold)' : '1px solid var(--border-color)', 
                      padding: '1rem', 
                      borderRadius: 'var(--radius-md)', 
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 700 }}>{c.name}</span>
                      <span className="badge badge-success">{c.tags}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Phone size={12} /> {c.phone}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Loyalty Score</span>
                      <strong style={{ color: 'var(--primary-gold)' }}>{c.points_balance} pts</strong>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--text-secondary)', padding: '1rem', textAlign: 'center' }}>No customer profiles found.</p>
              )}
            </div>
          </div>

          <div className="card" style={{ height: 'fit-content' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>Customer Overview</h3>
            
            {activeCust ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{activeCust.name}</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Phone: {activeCust.phone} | Email: {activeCust.email || 'N/A'}</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <MapPin size={12} /> Address: {activeCust.address || 'Not specified'}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Calendar size={12} /> Anniversary: {activeCust.anniversary || 'N/A'} • DOB: {activeCust.dob || 'N/A'}
                  </p>
                </div>

                <div style={{ padding: '1rem', background: 'var(--primary-gold-glow)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Award size={28} color="var(--primary-gold)" />
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Loyalty points balance</span>
                    <h3 style={{ margin: 0, color: 'var(--primary-gold)' }}>{activeCust.points_balance} Points</h3>
                  </div>
                </div>

                <div>
                  <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>Purchase History</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto' }}>
                    {selectedHistory.length > 0 ? (
                      selectedHistory.map(sale => (
                        <div key={sale.id} style={{ background: 'var(--surface-card)', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                            <span>Bill Ref: {sale.id}</span>
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                              <span>₹{sale.net_amount.toLocaleString()}</span>
                              <button 
                                onClick={async () => {
                                  try {
                                    const fullSale = await api.getSale(sale.id);
                                    setReprintInvoice(fullSale);
                                  } catch (err) {
                                    alertService.error('Error', 'Failed to load invoice: ' + err.message);
                                  }
                                }}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '0.2rem', display: 'flex', alignItems: 'center' }}
                                title="Reprint Invoice"
                              >
                                <Printer size={12} />
                              </button>
                            </div>
                          </div>
                          <p style={{ color: 'var(--text-secondary)', margin: '0.2rem 0' }}>Date: {sale.invoice_date}</p>
                          <ul style={{ paddingLeft: '1rem', marginTop: '0.3rem', color: 'var(--text-muted)' }}>
                            {sale.items?.map(si => (
                              <li key={si.watch_id}>{si.watch?.brand} {si.watch?.model} (Serial: {si.watch_id})</li>
                            ))}
                          </ul>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No purchase records found.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center' }}>
                Select a profile from the left list to see details, loyalty history, and purchases.
              </p>
            )}
          </div>

        </div>

        {showAddModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3 style={{ marginBottom: '1.25rem' }}>Create Customer Profile</h3>
              <form onSubmit={handleCreateCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input type="text" className="form-control" value={phone} onChange={e => setPhone(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input type="text" className="form-control" value={address} onChange={e => setAddress(e.target.value)} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input type="date" className="form-control" value={dob} onChange={e => setDob(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Anniversary</label>
                    <input type="date" className="form-control" value={anniversary} onChange={e => setAnniversary(e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tags</label>
                    <select className="form-control" value={tags} onChange={e => setTags(e.target.value)}>
                      <option value="Regular">Regular</option>
                      <option value="VIP">VIP</option>
                      <option value="New">New</option>
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Notes</label>
                  <input type="text" className="form-control" placeholder="Customer notes..." value={notes} onChange={e => setNotes(e.target.value)} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">Create Profile</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reprint Invoice Modal Overlay */}
        {reprintInvoice && (
          <div className="modal-overlay">
            <div className="modal-content printable-area" style={{ maxWidth: '800px', background: '#ffffff', color: '#000000', padding: '3rem', borderRadius: '4px' }}>
              
              {/* Invoice print header */}
              <div style={{ borderBottom: '2px solid #333', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ color: '#d4af37', fontFamily: 'var(--font-title)', fontSize: '2rem', margin: 0, textTransform: 'uppercase' }}>
                      {settings?.store_name || 'SMART TIMES'}
                    </h2>
                    <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: '#333', fontWeight: 600 }}>
                      {settings?.tagline || 'TITAN - SONATA - FASTRACK - TIMEX - LENCO - SMART WATCHES'}
                    </p>
                    <p style={{ margin: '0.1rem 0', fontSize: '0.8rem', color: '#555' }}>
                      {settings?.address || '108, Pennagaram Main Road, Dharmapuri - 636701'}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#555', fontWeight: 500 }}>
                      GSTIN: {settings?.gstin || '33EJBPA4537C1ZW'} | Cell: {settings?.phone || '97512 85945'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <h3 style={{ margin: 0, textTransform: 'uppercase', color: '#333' }}>
                      {reprintInvoice.invoice_type === 'gst' ? 'Tax Invoice' : 'Retail Bill'}
                    </h3>
                    <p style={{ margin: '0.2rem 0', fontWeight: 600 }}>Invoice: {reprintInvoice.id}</p>
                    <p style={{ margin: 0 }}>Date: {reprintInvoice.invoice_date}</p>
                  </div>
                </div>
              </div>

              {/* Bill to section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem', fontSize: '0.9rem' }}>
                <div>
                  <h4 style={{ textTransform: 'uppercase', color: '#555', marginBottom: '0.5rem' }}>Billed To:</h4>
                  <p style={{ margin: '0.1rem 0', fontWeight: 600 }}>{reprintInvoice.customer?.name}</p>
                  <p style={{ margin: '0.1rem 0' }}>Phone: {reprintInvoice.customer?.phone}</p>
                  <p style={{ margin: '0.1rem 0' }}>{reprintInvoice.customer?.address || 'Counter Sale'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h4 style={{ textTransform: 'uppercase', color: '#555', marginBottom: '0.5rem' }}>Payment Info:</h4>
                  <p style={{ margin: '0.1rem 0' }}>Mode: <strong>{reprintInvoice.payment_mode.toUpperCase()}</strong></p>
                  <p style={{ margin: '0.1rem 0' }}>Salesperson: Owner Admin</p>
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
                    {reprintInvoice.invoice_type === 'gst' && <th style={{ padding: '0.75rem', textAlign: 'right', color: '#333' }}>GST %</th>}
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: '#333' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {reprintInvoice.items?.map(item => (
                    <tr key={item.watch_id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{item.watch_id}</td>
                      <td style={{ padding: '0.75rem' }}>{item.watch?.brand} - {item.watch?.model}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>₹{item.price_sold.toLocaleString()}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>₹{item.discount_amount.toLocaleString()}</td>
                      {reprintInvoice.invoice_type === 'gst' && <td style={{ padding: '0.75rem', textAlign: 'right' }}>{item.gst_rate}%</td>}
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        ₹{(item.price_sold - item.discount_amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem', fontSize: '0.9rem' }}>
                <div>
                  {reprintInvoice.invoice_type === 'gst' && (
                    <div style={{ padding: '0.85rem', background: '#f9f9f9', borderRadius: '4px', border: '1px solid #eee' }}>
                      <h5 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>GST Breakup (HSN Code: 9102)</h5>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#555' }}>
                        <span>CGST (9%)</span>
                        <span>₹{(reprintInvoice.gst_amount / 2).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#555', marginTop: '0.2rem' }}>
                        <span>SGST (9%)</span>
                        <span>₹{(reprintInvoice.gst_amount / 2).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#666' }}>Subtotal</span>
                    <span>₹{reprintInvoice.subtotal.toLocaleString()}</span>
                  </div>
                  {(reprintInvoice.discount_amount > 0 || reprintInvoice.bill_discount_amount > 0) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                      <span>Discount Given</span>
                      <span>-₹{(reprintInvoice.discount_amount + (reprintInvoice.bill_discount_amount || 0)).toLocaleString()}</span>
                    </div>
                  )}
                  {reprintInvoice.points_redeemed > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                      <span>Points Redeemed ({reprintInvoice.points_redeemed} pts)</span>
                      <span>-₹{reprintInvoice.points_value.toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, color: '#d4af37', borderTop: '2px solid #333', paddingTop: '0.5rem' }}>
                    <span>Net Amount</span>
                    <span>₹{reprintInvoice.net_amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Actions row */}
              <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid #eee', paddingTop: '1.5rem', marginTop: '2rem' }}>
                <button onClick={() => setReprintInvoice(null)} className="btn btn-secondary">Close</button>
                <button onClick={handlePrint} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Printer size={15} /> Print Copy
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Customers;
