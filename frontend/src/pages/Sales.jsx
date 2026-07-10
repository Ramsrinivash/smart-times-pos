import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Layout/Header';
import { Search, ShoppingCart, Trash2, Printer, Share2, Plus, UserPlus, Image as ImageIcon } from 'lucide-react';

const Sales = () => {
  const { user } = useAuth();
  
  // State
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  
  const [searchSerial, setSearchSerial] = useState('');
  const [cart, setCart] = useState([]);
  const [invoiceType, setInvoiceType] = useState('non-gst');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [billDiscountAmount, setBillDiscountAmount] = useState(0);
  const [billDiscountPercent, setBillDiscountPercent] = useState(0);
  const [isCreditSale, setIsCreditSale] = useState(false);
  const [notes, setNotes] = useState('');
  
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [settings, setSettings] = useState(null);

  // Load Customers
  const loadCustomers = async () => {
    try {
      const data = await api.getCustomers();
      setCustomers(data);
      if (data.length > 0 && !selectedCustomerId) {
        // Set default to walk-in if exists
        const walkin = data.find(c => c.phone === '9999999999');
        setSelectedCustomerId(walkin ? walkin.id : data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadSettings = async () => {
    try {
      const s = await api.getSettings();
      setSettings(s);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadCustomers();
    loadSettings();
  }, []);

  const activeCustomer = customers.find(c => c.id === Number(selectedCustomerId));

  // Quick Add Customer
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone) return;
    try {
      const c = await api.addCustomer({ name: newCustName, phone: newCustPhone });
      await loadCustomers();
      setSelectedCustomerId(c.id);
      setNewCustName('');
      setNewCustPhone('');
      setShowAddCustomer(false);
    } catch (err) {
      alert(err.message || 'Failed to create customer.');
    }
  };

  // Add item to cart
  const handleAddWatch = async () => {
    if (!searchSerial) return;
    try {
      const inventory = await api.getInventory(searchSerial, 'in_stock');
      const watch = inventory.find(w => w.id.toLowerCase() === searchSerial.toLowerCase());
      
      if (!watch) {
        alert('Watch Serial Number not found in stock.');
        return;
      }

      if (cart.some(item => item.watch_id === watch.id)) {
        alert('Watch already added to cart.');
        return;
      }

      setCart([...cart, {
        watch_id: watch.id,
        brand: watch.brand,
        model: watch.model,
        selling_price: watch.selling_price,
        gst_rate: watch.gst_rate,
        discount_amount: 0,
        image_urls: watch.image_urls || []
      }]);
      setSearchSerial('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFromCart = (watchId) => {
    setCart(cart.filter(item => item.watch_id !== watchId));
  };

  const handleDiscountChange = (watchId, value) => {
    const next = [...cart];
    const idx = next.findIndex(item => item.watch_id === watchId);
    if (idx !== -1) {
      next[idx].discount_amount = Math.max(0, Number(value || 0));
    }
    setCart(next);
  };

  // Totals calculations
  const subtotal = cart.reduce((acc, item) => acc + item.selling_price, 0);
  const totalItemDiscounts = cart.reduce((acc, item) => acc + item.discount_amount, 0);
  const afterItemDisc = subtotal - totalItemDiscounts;

  // Bill-level discount
  const billDiscFlat = Number(billDiscountAmount || 0);
  const billDiscPct = Number(billDiscountPercent || 0);
  const computedBillDisc = billDiscPct > 0 ? (afterItemDisc * billDiscPct / 100) : billDiscFlat;
  
  // Redeem points value
  const pointsToRedeem = Math.min(redeemPoints, activeCustomer?.points_balance || 0);
  const pointsVal = pointsToRedeem; // 1 point = Rs 1
  
  const totalDiscount = totalItemDiscounts + computedBillDisc + pointsVal;
  const netAmount = Math.max(0, subtotal - totalDiscount);

  // GST calculations
  const totalGst = cart.reduce((acc, item) => {
    const itemNet = item.selling_price - item.discount_amount;
    const itemGst = invoiceType === 'gst' ? (itemNet - (itemNet / (1 + (item.gst_rate / 100)))) : 0;
    return acc + itemGst;
  }, 0);

  // Handle Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Your cart is empty.');
      return;
    }
    try {
      const payload = {
        customer_id: selectedCustomerId,
        invoice_type: invoiceType,
        payment_mode: paymentMode,
        redeem_points: pointsToRedeem,
        bill_discount_amount: billDiscFlat,
        bill_discount_percent: billDiscPct,
        is_credit_sale: isCreditSale,
        notes,
        items: cart.map(item => ({
          watch_id: item.watch_id,
          discount_amount: item.discount_amount
        }))
      };

      const result = await api.addSale(payload, user.id);
      
      // Load details of the invoice to show printable receipt
      const detailInvoice = await api.getSale(result.id);
      setCreatedInvoice(detailInvoice);
      
      // Clear cart
      setCart([]);
      setRedeemPoints(0);
      setBillDiscountAmount(0);
      setBillDiscountPercent(0);
      setIsCreditSale(false);
      setNotes('');
      loadCustomers(); // Reload customer to update points balance
    } catch (err) {
      alert(err.message || 'Checkout failed.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
      <Header searchPlaceholder="Sales checkout..." />
      <div className="page-container">
        <h1 className="page-title">Point of Sale (POS)</h1>
        <p className="page-subtitle">Generate GST and retail bills quickly.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '1.5rem', flexWrap: 'wrap' }}>
          
          {/* Left Container - Items, Search and Cart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Search items bar */}
            <div className="card">
              <h3 style={{ marginBottom: '1rem' }}>Scan or Enter Watch Serial</h3>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. RLX-SUB-90812" 
                  value={searchSerial}
                  onChange={(e) => setSearchSerial(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddWatch()}
                  style={{ fontFamily: 'monospace' }}
                />
                <button type="button" onClick={handleAddWatch} className="btn btn-primary">
                  Add Watch
                </button>
              </div>
            </div>

            {/* Shopping Cart List */}
            <div className="card">
              <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingCart size={18} /> Cart Items
              </h3>
              
              {cart.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Photo</th>
                        <th>Serial No</th>
                        <th>Item</th>
                        <th>Price (₹)</th>
                        <th style={{ width: '130px' }}>Discount (₹)</th>
                        <th>Net (₹)</th>
                        <th style={{ width: '60px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map(item => (
                        <tr key={item.watch_id}>
                          <td>
                            {item.image_urls && item.image_urls.length > 0 ? (
                              <img src={item.image_urls[0]} alt={item.model} style={{ width: '35px', height: '35px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                            ) : (
                              <div style={{ width: '35px', height: '35px', background: 'var(--surface-card)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><ImageIcon size={14} /></div>
                            )}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.watch_id}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{item.brand}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.model}</div>
                          </td>
                          <td>₹{item.selling_price.toLocaleString()}</td>
                          <td>
                            <input 
                              type="number" 
                              className="form-control" 
                              style={{ padding: '0.4rem' }}
                              value={item.discount_amount}
                              onChange={(e) => handleDiscountChange(item.watch_id, e.target.value)}
                            />
                          </td>
                          <td>₹{(item.selling_price - item.discount_amount).toLocaleString()}</td>
                          <td>
                            <button 
                              onClick={() => handleRemoveFromCart(item.watch_id)}
                              className="btn btn-danger btn-sm"
                              style={{ padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)', padding: '1.5rem', textAlign: 'center' }}>
                  No items in cart. Enter a Serial Number above.
                </p>
              )}
            </div>
          </div>

          {/* Right Container - Customer & Billing Math */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Customer info card */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3>Customer Ledger</h3>
                <button 
                  onClick={() => setShowAddCustomer(!showAddCustomer)} 
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', gap: '0.3rem', border: '1px solid var(--border-color)' }}
                >
                  <UserPlus size={14} /> Quick Add
                </button>
              </div>

              {showAddCustomer ? (
                <form onSubmit={handleAddCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--surface-card)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Customer Name</label>
                    <input type="text" className="form-control" value={newCustName} onChange={e => setNewCustName(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Phone Number</label>
                    <input type="text" className="form-control" value={newCustPhone} onChange={e => setNewCustPhone(e.target.value)} required />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button type="button" onClick={() => setShowAddCustomer(false)} className="btn btn-secondary btn-sm">Cancel</button>
                    <button type="submit" className="btn btn-primary btn-sm">Create Profile</button>
                  </div>
                </form>
              ) : null}

              <div className="form-group">
                <label className="form-label">Select Customer Profile</label>
                <select 
                  className="form-control" 
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>

              {activeCustomer && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--primary-gold-glow)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Loyalty Account</span>
                    <div style={{ fontWeight: 600, color: 'var(--primary-gold)' }}>
                      {activeCustomer.points_balance} pts available
                    </div>
                  </div>
                  {activeCustomer.tags && (
                    <span className="badge badge-success" style={{ alignSelf: 'center' }}>
                      {activeCustomer.tags}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Calculations and Billing controls */}
            <div className="card">
              <h3 style={{ marginBottom: '1.25rem' }}>Receipt Summary</h3>
              
              <div className="form-group">
                <label className="form-label">Invoice Type</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                    <input type="radio" checked={invoiceType === 'non-gst'} onChange={() => setInvoiceType('non-gst')} />
                    Retail / Plain Invoice
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                    <input type="radio" checked={invoiceType === 'gst'} onChange={() => setInvoiceType('gst')} />
                    GST Invoice (HSN splits)
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Redeem Reward Points</label>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="Points to redeem..." 
                  value={redeemPoints}
                  onChange={(e) => setRedeemPoints(Math.max(0, Number(e.target.value || 0)))}
                  max={activeCustomer?.points_balance || 0}
                />
              </div>

              <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.85rem', background: 'var(--surface-card)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 600 }}>Bill-Level Discount</p>
                <div className="form-row" style={{ margin: 0 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>Flat Discount (₹)</label>
                    <input type="number" className="form-control" min="0" value={billDiscountAmount} onChange={e => { setBillDiscountAmount(Number(e.target.value || 0)); setBillDiscountPercent(0); }} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>OR Discount (%)</label>
                    <input type="number" className="form-control" min="0" max="100" value={billDiscountPercent} onChange={e => { setBillDiscountPercent(Number(e.target.value || 0)); setBillDiscountAmount(0); }} />
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={isCreditSale} onChange={e => setIsCreditSale(e.target.checked)} />
                  <span style={{ fontSize: '0.85rem' }}>Credit Sale (Amount added to customer outstanding dues)</span>
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Payment mode</label>
                <select className="form-control" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="card">Credit/Debit Card</option>
                  <option value="upi">UPI / Scanner</option>
                  <option value="bank_transfer">Direct Bank Transfer</option>
                  <option value="split">Split / Part Payment</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Sales Remarks</label>
                <input type="text" className="form-control" placeholder="Add invoice notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', margin: '1.5rem 0', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Subtotal (MRP)</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>
                {totalItemDiscounts > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--error)' }}>
                    <span>Item Discounts</span>
                    <span>-₹{totalItemDiscounts.toLocaleString()}</span>
                  </div>
                )}
                {computedBillDisc > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--error)' }}>
                    <span>Bill Discount {billDiscPct > 0 ? `(${billDiscPct}%)` : '(Flat)'}</span>
                    <span>-₹{computedBillDisc.toLocaleString()}</span>
                  </div>
                )}
                {pointsVal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--error)' }}>
                    <span>Points Redemption ({pointsToRedeem} pts)</span>
                    <span>-₹{pointsVal.toLocaleString()}</span>
                  </div>
                )}
                {invoiceType === 'gst' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>GST Included</span>
                    <span>₹{totalGst.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--primary-gold)', borderTop: '2px solid var(--border-color)', paddingTop: '0.5rem' }}>
                  <span>Net Payable</span>
                  <span>₹{netAmount.toLocaleString()}</span>
                </div>
              </div>

              <button onClick={handleCheckout} className="btn btn-primary" style={{ width: '100%', padding: '0.8rem' }}>
                Generate Invoice Receipt
              </button>
            </div>
          </div>
        </div>

        {/* Printable Invoice Overlay Modal */}
        {createdInvoice && (
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
                      {createdInvoice.invoice_type === 'gst' ? 'Tax Invoice' : 'Retail Bill'}
                    </h3>
                    <p style={{ margin: '0.2rem 0', fontWeight: 600 }}>Invoice: {createdInvoice.id}</p>
                    <p style={{ margin: 0 }}>Date: {createdInvoice.invoice_date}</p>
                  </div>
                </div>
              </div>

              {/* Bill to section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem', fontSize: '0.9rem' }}>
                <div>
                  <h4 style={{ textTransform: 'uppercase', color: '#555', marginBottom: '0.5rem' }}>Billed To:</h4>
                  <p style={{ margin: '0.1rem 0', fontWeight: 600 }}>{createdInvoice.customer?.name}</p>
                  <p style={{ margin: '0.1rem 0' }}>Phone: {createdInvoice.customer?.phone}</p>
                  <p style={{ margin: '0.1rem 0' }}>{createdInvoice.customer?.address || 'Counter Sale'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h4 style={{ textTransform: 'uppercase', color: '#555', marginBottom: '0.5rem' }}>Payment Info:</h4>
                  <p style={{ margin: '0.1rem 0' }}>Mode: <strong>{createdInvoice.payment_mode.toUpperCase()}</strong></p>
                  <p style={{ margin: '0.1rem 0' }}>Salesperson: {user.name}</p>
                </div>
              </div>

              {/* Items list */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#333' }}>Watch ID / Serial</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#333' }}>Model Description</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: '#333' }}>Unit Price (₹)</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: '#333' }}>Discount (₹)</th>
                    {createdInvoice.invoice_type === 'gst' && <th style={{ padding: '0.75rem', textAlign: 'right', color: '#333' }}>GST %</th>}
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: '#333' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {createdInvoice.items?.map(item => (
                    <tr key={item.watch_id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{item.watch_id}</td>
                      <td style={{ padding: '0.75rem' }}>{item.watch?.brand} - {item.watch?.model}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>₹{item.price_sold.toLocaleString()}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>₹{item.discount_amount.toLocaleString()}</td>
                      {createdInvoice.invoice_type === 'gst' && <td style={{ padding: '0.75rem', textAlign: 'right' }}>{item.gst_rate}%</td>}
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        ₹{(item.price_sold - item.discount_amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tax splits and totals */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem', fontSize: '0.9rem' }}>
                <div>
                  {createdInvoice.invoice_type === 'gst' && (
                    <div style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '4px', border: '1px solid #eee' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: '#555' }}>GST HSN Breakdown (HSN: 9102)</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span>CGST (9%)</span>
                        <span>₹{(createdInvoice.gst_amount / 2).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                        <span>SGST (9%)</span>
                        <span>₹{(createdInvoice.gst_amount / 2).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  {createdInvoice.points_redeemed > 0 && (
                    <p style={{ color: '#666', marginTop: '0.5rem' }}>
                      Redeemed reward points: <strong>{createdInvoice.points_redeemed}</strong> points (Rs {createdInvoice.points_value} adjustment)
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Gross Subtotal</span>
                    <span>₹{createdInvoice.subtotal.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Discounts & Adjustments</span>
                    <span>-₹{createdInvoice.discount_amount.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, borderTop: '2px solid #333', paddingTop: '0.5rem', color: '#d4af37' }}>
                    <span>Grand Net Total</span>
                    <span>₹{createdInvoice.net_amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Share links */}
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ccc', paddingTop: '1.5rem', marginTop: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <a 
                    href={`https://wa.me/${createdInvoice.customer?.phone}?text=Dear%20${createdInvoice.customer?.name},%20thank%20you%20for%20shopping%20at%20Smart%20Times.%20Your%20invoice%20${createdInvoice.id}%20amounting%20%E2%82%B9${createdInvoice.net_amount}%20is%20ready.`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="btn btn-secondary"
                  >
                    <Share2 size={16} /> WhatsApp Alert
                  </a>
                  <a 
                    href={`mailto:${createdInvoice.customer?.email}?subject=Smart%20Times%20Invoice%20${createdInvoice.id}&body=Dear%20${createdInvoice.customer?.name},%20please%20find%20your%20Smart%20Times%20invoice%20attached.`} 
                    className="btn btn-secondary"
                  >
                    Send Email Copy
                  </a>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button onClick={handlePrint} className="btn btn-primary">
                    <Printer size={16} /> Print Receipt
                  </button>
                  <button onClick={() => setCreatedInvoice(null)} className="btn btn-secondary">
                    Close Invoice
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sales;
