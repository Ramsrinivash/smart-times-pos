import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Header from '../components/Layout/Header';
import { Phone, MapPin, Award, Plus, Calendar, Printer, X, FileText } from 'lucide-react';
import { alertService } from '../utils/alert';
import PrintableInvoice from '../components/PrintableInvoice';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [searchVal, setSearchVal] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState([]);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [pincode, setPincode] = useState('');
  const [taluk, setTaluk] = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [dob, setDob] = useState('');
  const [anniversary, setAnniversary] = useState('');
  const [tags, setTags] = useState('Regular');
  const [notes, setNotes] = useState('');

  const handlePincodeChange = async (val) => {
    setPincode(val);
    const cleaned = val.trim();
    if (cleaned.length === 6 && /^\d{6}$/.test(cleaned)) {
      setPincodeLoading(true);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${cleaned}`);
        const data = await res.json();
        if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice) {
          const po = data[0].PostOffice[0];
          setTaluk(po.Block || po.Division || '');
          setDistrict(po.District || '');
          setStateName(po.State || '');
        }
      } catch (err) {
        console.error('Pincode fetch error:', err);
      } finally {
        setPincodeLoading(false);
      }
    }
  };

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
    
    // Validate Phone
    let cleanPhone = phone.trim().replace(/\s+/g, '');
    if (cleanPhone.startsWith('+91')) {
      cleanPhone = cleanPhone.substring(3);
    }
    if (!/^\d{10}$/.test(cleanPhone)) {
      alertService.warning('Invalid Phone', 'Phone number must be a valid 10-digit number.');
      return;
    }
    const finalPhone = '+91' + cleanPhone;

    // Validate Email
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alertService.warning('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    // Combine Address parts
    const parts = [
      address1.trim(),
      address2.trim(),
      taluk.trim(),
      district.trim(),
      stateName.trim(),
      pincode.trim() ? `PIN: ${pincode.trim()}` : ''
    ].filter(Boolean);
    const combinedAddress = parts.join(', ');

    try {
      await api.addCustomer({ 
        name, 
        phone: finalPhone, 
        email, 
        address: combinedAddress, 
        dob, 
        anniversary, 
        tags, 
        notes 
      });
      alertService.success('Success', 'Customer profile created successfully!');
      setName('');
      setPhone('');
      setEmail('');
      setAddress1('');
      setAddress2('');
      setPincode('');
      setTaluk('');
      setDistrict('');
      setStateName('');
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
                  <label className="form-label">Phone Number (10 digit Mobile) *</label>
                  <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                    <span style={{ padding: '0.625rem 0.75rem', background: 'var(--surface-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md) 0 0 var(--radius-md)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>+91</span>
                    <input 
                      type="text" 
                      className="form-control" 
                      style={{ borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}
                      placeholder="e.g. 9876543210" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                      required 
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="text" placeholder="e.g. customer@domain.com" className="form-control" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                
                {/* Structured Address */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Address Line 1 *</label>
                    <input type="text" className="form-control" placeholder="Door No / Street Name" value={address1} onChange={e => setAddress1(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Address Line 2</label>
                    <input type="text" className="form-control" placeholder="Area / Landmark" value={address2} onChange={e => setAddress2(e.target.value)} />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Pincode *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="6-digit Pincode" 
                      value={pincode} 
                      onChange={e => handlePincodeChange(e.target.value)} 
                      required 
                    />
                    {pincodeLoading && <span style={{ fontSize: '0.75rem', color: 'var(--primary-gold)' }}>Auto-fetching state/district...</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Taluk / Block</label>
                    <input type="text" className="form-control" placeholder="Taluk" value={taluk} onChange={e => setTaluk(e.target.value)} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">District *</label>
                    <input type="text" className="form-control" placeholder="District" value={district} onChange={e => setDistrict(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State *</label>
                    <input type="text" className="form-control" placeholder="State" value={stateName} onChange={e => setStateName(e.target.value)} required />
                  </div>
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
          <div className="modal-overlay" style={{ overflowY: 'auto', padding: '2rem 1rem' }}>
            <div style={{ background: '#fff', borderRadius: '8px', maxWidth: '850px', margin: '0 auto', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', padding: '1rem' }}>
              <PrintableInvoice
                invoice={reprintInvoice}
                storeSettings={settings}
                currentUser={null}
                onClose={() => setReprintInvoice(null)}
                onPrint={() => window.print()}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Customers;
