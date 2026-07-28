import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Layout/Header';
import { Search, ShoppingCart, Trash2, Printer, Share2, Plus, UserCheck, Image as ImageIcon } from 'lucide-react';
import { alertService } from '../utils/alert';

const Sales = () => {
  const { user } = useAuth();
  
  // State
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custDob, setCustDob] = useState('');
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  
  const [searchSerial, setSearchSerial] = useState('');
  const [cart, setCart] = useState([]);
  const [invoiceType, setInvoiceType] = useState('non-gst');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [redeemPoints, setRedeemPoints] = useState('');
  const [billDiscountAmount, setBillDiscountAmount] = useState('');
  const [billDiscountPercent, setBillDiscountPercent] = useState('');
  const [isCreditSale, setIsCreditSale] = useState(false);
  const [notes, setNotes] = useState('');

  // Search suggestions states
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const searchInputContainerRef = React.useRef(null);

  // Helper to sanitize numeric inputs to prevent leading zeros while supporting decimals
  const cleanNumberInput = (val) => {
    if (val === '') return '';
    let cleaned = val.replace(/^0+(?=\d)/, '');
    if (cleaned === '') return '0';
    return cleaned;
  };
  
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [settings, setSettings] = useState(null);

  // Load Customers
  const loadCustomers = async () => {
    try {
      const data = await api.getCustomers();
      setCustomers(data);
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

  // Debounced search for watch suggestions
  useEffect(() => {
    if (!searchSerial || searchSerial.trim().length < 2) {
      setSearchSuggestions([]);
      setShowSearchSuggestions(false);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const inventory = await api.getInventory(searchSerial.trim(), 'in_stock');
        setSearchSuggestions(inventory.slice(0, 8));
        setShowSearchSuggestions(inventory.length > 0);
      } catch (err) {
        console.error('Failed to fetch watch suggestions:', err);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [searchSerial]);

  // Click outside to close search suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchInputContainerRef.current && !searchInputContainerRef.current.contains(e.target)) {
        setShowSearchSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if Phone Number exists in CRM, and auto-load customer profile
  useEffect(() => {
    if (custPhone.length >= 10) {
      // Fix #13: Strict phone match — strip +91 prefix and require full 10-digit equality
      const normalizePhone = (p) => p.replace(/\D/g, '').replace(/^91(\d{10})$/, '$1');
      const searchNorm = normalizePhone(custPhone.trim());
      if (searchNorm.length < 10) {
        setSelectedCustomerId('');
        setLoyaltyPoints(0);
        return;
      }
      const matched = customers.find(c => {
        const cNorm = normalizePhone(c.phone.trim());
        return cNorm === searchNorm;
      });
      if (matched) {
        setCustName(matched.name);
        setCustEmail(matched.email || '');
        setCustDob(matched.dob || '');
        setLoyaltyPoints(matched.points_balance || 0);
        setSelectedCustomerId(matched.id);
      } else {
        setSelectedCustomerId('');
        setLoyaltyPoints(0);
      }
    } else {
      setSelectedCustomerId('');
      setLoyaltyPoints(0);
    }
  }, [custPhone, customers]);

  // Add item to cart
  const handleSelectSuggestion = (watch) => {
    if (cart.some(item => item.watch_id === watch.id)) {
      alertService.warning('Watch already in cart', 'This watch has already been added to your cart.');
      return;
    }
    setCart([...cart, {
      watch_id: watch.id,
      brand: watch.brand,
      model: watch.model,
      selling_price: watch.selling_price,
      gst_rate: watch.gst_rate,
      discount_amount: '',
      image_urls: watch.image_urls || []
    }]);
    setSearchSerial('');
    setShowSearchSuggestions(false);
  };

  const handleAddWatch = async () => {
    if (!searchSerial) return;
    try {
      const inventory = await api.getInventory(searchSerial.trim(), 'in_stock');
      const watch = inventory.find(w => w.id.toLowerCase() === searchSerial.toLowerCase().trim());
      
      if (watch) {
        handleSelectSuggestion(watch);
      } else if (inventory.length > 0) {
        handleSelectSuggestion(inventory[0]);
      } else {
        alertService.error('Not Found', 'Watch Serial Number not found in stock.');
      }
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
      next[idx].discount_amount = cleanNumberInput(value);
    }
    setCart(next);
  };

  // Totals calculations
  const subtotal = cart.reduce((acc, item) => acc + Number(item.selling_price), 0);
  const totalItemDiscounts = cart.reduce((acc, item) => acc + Number(item.discount_amount || 0), 0);
  const afterItemDisc = subtotal - totalItemDiscounts;

  // Bill-level discount
  const billDiscFlat = Number(billDiscountAmount || 0);
  const billDiscPct = Number(billDiscountPercent || 0);
  const computedBillDisc = billDiscPct > 0 ? (afterItemDisc * billDiscPct / 100) : billDiscFlat;
  
  // Redeem points value
  const pointsToRedeem = Math.min(Number(redeemPoints || 0), loyaltyPoints || 0);
  const pointsVal = pointsToRedeem; // 1 point = Rs 1
  
  const totalDiscount = totalItemDiscounts + computedBillDisc + pointsVal;
  const netAmount = Math.max(0, subtotal - totalDiscount);

  // GST calculations
  const totalGst = cart.reduce((acc, item) => {
    const itemNet = item.selling_price - Number(item.discount_amount || 0);
    const itemGst = invoiceType === 'gst' ? (itemNet - (itemNet / (1 + (item.gst_rate / 100)))) : 0;
    return acc + itemGst;
  }, 0);

  // Handle Checkout (with optional print + WhatsApp share redirect)
  const handleCheckout = async (shouldPrintAndShare = false) => {
    if (cart.length === 0) {
      alertService.warning('Cart Empty', 'Your cart is empty.');
      return;
    }
    if (!custName || !custPhone) {
      alertService.warning('Required Fields', 'Customer Name and Phone Number are required to generate a bill.');
      return;
    }

    // Validate Phone Number format before checkout/registration
    let cleanPhone = custPhone.trim().replace(/\s+/g, '');
    if (cleanPhone.startsWith('+91')) {
      cleanPhone = cleanPhone.substring(3);
    }
    if (!/^\d{10}$/.test(cleanPhone)) {
      alertService.warning('Invalid Phone', 'Customer Phone number must be a valid 10-digit mobile number.');
      return;
    }
    const finalPhone = '+91' + cleanPhone;

    try {
      let finalCustomerId = selectedCustomerId;
      if (!finalCustomerId) {
        // Automatically create a new customer on the fly
        const newCust = await api.addCustomer({ 
          name: custName, 
          phone: finalPhone,
          email: custEmail || null,
          dob: custDob || null
        });
        finalCustomerId = newCust.customer ? newCust.customer.id : newCust.id;
      }

      const payload = {
        customer_id: finalCustomerId,
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
      const saleId = result.sale ? result.sale.id : (result.id || result);
      const detailInvoice = await api.getSale(saleId);
      setCreatedInvoice(detailInvoice);
      
      // Clear checkout inputs
      setCart([]);
      setRedeemPoints('');
      setBillDiscountAmount('');
      setBillDiscountPercent('');
      setIsCreditSale(false);
      setNotes('');
      setCustName('');
      setCustPhone('');
      setCustEmail('');
      setCustDob('');
      loadCustomers(); // Reload customer list to update points balance

      await alertService.success('Success', 'Checkout completed successfully!');
      if (shouldPrintAndShare) {
        window.print();
        const waText = `Dear ${detailInvoice.customer?.name}, thank you for shopping at ${settings?.store_name || 'Smart Times'}. Your invoice ${detailInvoice.id} amounting ₹${detailInvoice.net_amount} is ready.`;
        const waUrl = `https://wa.me/${detailInvoice.customer?.phone}?text=${encodeURIComponent(waText)}`;
        window.open(waUrl, '_blank');
      }
    } catch (err) {
      alertService.error('Checkout Failed', err.message || 'Checkout failed.');
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
            <div className="card" style={{ overflow: 'visible', zIndex: 10 }}>
              <h3 style={{ marginBottom: '1rem' }}>Scan or Enter Watch Serial</h3>
              <div ref={searchInputContainerRef} style={{ display: 'flex', gap: '0.75rem', position: 'relative', width: '100%' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Search by brand, model, or scan serial..." 
                    value={searchSerial}
                    onChange={(e) => setSearchSerial(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddWatch()}
                    onFocus={() => {
                      if (searchSuggestions.length > 0) setShowSearchSuggestions(true);
                    }}
                    style={{ fontFamily: 'monospace', width: '100%' }}
                  />
                  {showSearchSuggestions && searchSuggestions.length > 0 && (
                    <div 
                      className="suggestions-dropdown" 
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'var(--surface-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                        zIndex: 9999,
                        marginTop: '0.5rem',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        padding: '0.25rem 0',
                        textAlign: 'left'
                      }}
                    >
                      <style>{`
                        .pos-suggestion-item {
                          display: flex;
                          justify-content: space-between;
                          align-items: center;
                          padding: 0.6rem 1rem;
                          cursor: pointer;
                          transition: background-color var(--transition-fast);
                          border-bottom: 1px solid var(--border-color);
                        }
                        .pos-suggestion-item:hover {
                          background-color: var(--surface-card) !important;
                        }
                        .pos-suggestion-item:last-child {
                          border-bottom: none;
                        }
                      `}</style>
                      {searchSuggestions.map(w => (
                        <div 
                          key={w.id} 
                          onClick={() => handleSelectSuggestion(w)}
                          className="pos-suggestion-item"
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{w.brand} {w.model}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ID: {w.id} | Spec: {w.category}</div>
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-gold)' }}>₹{Number(w.selling_price).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" onClick={handleAddWatch} className="btn btn-primary" style={{ height: '42px' }}>
                  Add Watch
                </button>
              </div>
            </div>

            {/* Cart Table */}
            <div className="card" style={{ flex: 1 }}>
              <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingCart size={18} /> Sales Cart
              </h3>

              {cart.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Watch ID</th>
                        <th>Description</th>
                        <th>Original Price</th>
                        <th style={{ width: '110px' }}>Discount (₹)</th>
                        <th>Net Total</th>
                        <th style={{ width: '50px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map(item => (
                        <tr key={item.watch_id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.watch_id}</td>
                          <td>{item.brand} {item.model}</td>
                          <td>₹{Number(item.selling_price).toLocaleString()}</td>
                          <td>
                            <input 
                              type="number" 
                              className="form-control" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                              value={item.discount_amount}
                              onChange={(e) => handleDiscountChange(item.watch_id, e.target.value)}
                              min="0"
                              max={item.selling_price}
                              placeholder="0"
                            />
                          </td>
                          <td>₹{(item.selling_price - item.discount_amount).toLocaleString()}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              type="button" 
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
            
            {/* Customer Details Form Card */}
            <div className="card">
              <h3 style={{ marginBottom: '0.5rem' }}>Customer Profile *</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Enter phone number to lookup or register a new customer profile.
              </p>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Phone Number *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. 9876543210" 
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Customer Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Ram Srinivash" 
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Customer Email (Optional)</label>
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="e.g. customer@example.com" 
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Customer DOB (Optional)</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={custDob}
                  onChange={(e) => setCustDob(e.target.value)}
                />
              </div>

              {custPhone.length >= 10 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--primary-gold-glow)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginTop: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Loyalty Balance</span>
                    <div style={{ fontWeight: 600, color: 'var(--primary-gold)' }}>
                      {loyaltyPoints} pts available
                    </div>
                  </div>
                  <span className="badge badge-success" style={{ alignSelf: 'center', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <UserCheck size={12} />
                    {selectedCustomerId ? 'Registered CRM' : 'New Profile'}
                  </span>
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
                  placeholder="0" 
                  value={redeemPoints}
                  onChange={(e) => setRedeemPoints(cleanNumberInput(e.target.value))}
                  max={loyaltyPoints || 0}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  1 Point = ₹1.00 Discount. Max redeemable: {loyaltyPoints} pts.
                </span>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Bill Discount (₹)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="0" 
                    value={billDiscountAmount} 
                    onChange={(e) => {
                      setBillDiscountAmount(cleanNumberInput(e.target.value));
                      setBillDiscountPercent('');
                    }}
                    disabled={Number(billDiscountPercent || 0) > 0}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bill Discount (%)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="0" 
                    value={billDiscountPercent} 
                    onChange={(e) => {
                      setBillDiscountPercent(cleanNumberInput(e.target.value));
                      setBillDiscountAmount('');
                    }}
                    disabled={Number(billDiscountAmount || 0) > 0}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Mode</label>
                <select className="form-control" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                  <option value="cash">Cash Payment</option>
                  <option value="upi">UPI / GPay / PhonePe</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="split">Split (Cash + UPI)</option>
                  <option value="credit">Store Credit / Book Debt</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Internal Invoice Notes</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Optional billing remarks..." 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                />
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span>Gross Total:</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>
                 {totalItemDiscounts + computedBillDisc > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--error)' }}>
                    <span>Store/Item Discount:</span>
                    <span>-₹{(totalItemDiscounts + computedBillDisc).toLocaleString()}</span>
                  </div>
                 )}
                 {pointsVal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--error)' }}>
                    <span>Points Redeemed ({pointsToRedeem} pts):</span>
                    <span>-₹{pointsVal.toLocaleString()}</span>
                  </div>
                 )}
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--error)', fontWeight: 600 }}>
                   <span>Total Discount:</span>
                   <span>-₹{totalDiscount.toLocaleString()}</span>
                 </div>
                {invoiceType === 'gst' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span>Included GST (18%):</span>
                    <span>₹{totalGst.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-gold)', marginTop: '0.25rem' }}>
                  <span>Net Amount Due:</span>
                  <span>₹{netAmount.toLocaleString()}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                {/* Single Quick Checkout, Print & WhatsApp Button */}
                <button 
                  type="button" 
                  onClick={() => handleCheckout(true)} 
                  className="btn btn-primary" 
                  style={{ padding: '0.85rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 700 }}
                >
                  <Printer size={18} /> Pay, Print & WhatsApp Share
                </button>
                
                {/* Traditional Simple Checkout Button */}
                <button 
                  type="button" 
                  onClick={() => handleCheckout(false)} 
                  className="btn btn-secondary" 
                  style={{ padding: '0.75rem', width: '100%', fontWeight: 600 }}
                >
                  Record Bill Only (Standard Cashout)
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Printable Invoice Receipt Modal */}
        {createdInvoice && (
          <div className="modal-overlay">
            <div className="modal-content printable-area" style={{ maxWidth: '750px', background: '#ffffff', color: '#000000', padding: '2.5rem' }}>
              
              {/* Receipt Header */}
              <div style={{ borderBottom: '2px solid #333', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ color: '#d4af37', fontSize: '1.8rem', margin: 0 }}>{settings?.store_name || 'SMART TIMES'}</h2>
                    <h4 style={{ margin: '0.1rem 0 0', color: '#444' }}>{settings?.tagline || 'Showroom Invoice'}</h4>
                    <p style={{ margin: '0.1rem 0', fontSize: '0.8rem', color: '#555' }}>
                      {settings?.address || '108, Pennagaram Main Road, (Next to R.C. Chruch), DHARMAPURI - 636 701. • Call: 97512 85945, 86672 88021'}
                    </p>
                    {settings?.gstin && <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600 }}>GSTIN: {settings.gstin}</p>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <h3 style={{ margin: 0, textTransform: 'uppercase', color: '#333' }}>Tax Invoice</h3>
                    <p style={{ margin: '0.1rem 0', fontWeight: 600 }}>Bill Invoice No: {createdInvoice.id}</p>
                    <p style={{ margin: 0 }}>Date: {createdInvoice.invoice_date}</p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <div style={{ borderRight: '1px solid #ddd', paddingRight: '1.5rem' }}>
                  <h4 style={{ textTransform: 'uppercase', color: '#666', marginBottom: '0.4rem' }}>Billed To:</h4>
                  <p style={{ margin: '0.1rem 0', fontWeight: 600 }}>{createdInvoice.customer?.name}</p>
                  <p style={{ margin: '0.1rem 0' }}>Customer ID: #{createdInvoice.customer?.id || 'N/A'}</p>
                  <p style={{ margin: '0.1rem 0' }}>Phone: {createdInvoice.customer?.phone}</p>
                  <p style={{ margin: '0.1rem 0' }}>{createdInvoice.customer?.address || 'Counter Sale'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h4 style={{ textTransform: 'uppercase', color: '#555', marginBottom: '0.5rem' }}>Payment Info:</h4>
                  <p style={{ margin: '0.1rem 0' }}>Mode: <strong>{createdInvoice.payment_mode.toUpperCase()}</strong></p>
                  <p style={{ margin: '0.1rem 0' }}>Salesperson: {user?.name || 'Staff'}</p>
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
                    {createdInvoice.invoice_type === 'gst' && <th style={{ padding: '0.75rem', textAlign: 'right', color: '#333' }}>GST %</th>}
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: '#333' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {createdInvoice.items?.map(item => (
                    <tr key={item.watch_id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{item.watch_id}</td>
                      <td style={{ padding: '0.75rem' }}>{item.watch?.brand} - {item.watch?.model} (HSN: {item.watch?.hsn_code || '9102'})</td>
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
                      <h4 style={{ margin: '0 0 0.5rem 0', color: '#555' }}>GST HSN Breakdown</h4>
                      {(() => {
                        // Fix #8: Group by HSN + gst_rate so label shows actual rate, not hardcoded 9%
                        const hsnBreakdown = {};
                        createdInvoice.items?.forEach(si => {
                          const hsn = si.watch?.hsn_code || '9102';
                          const rate = Number(si.gst_rate || 18);
                          const key = `${hsn}__${rate}`;
                          if (!hsnBreakdown[key]) {
                            hsnBreakdown[key] = { hsn, rate, gstAmt: 0 };
                          }
                          hsnBreakdown[key].gstAmt += Number(si.gst_amount || 0);
                        });
                        return Object.values(hsnBreakdown).map((entry) => (
                          <div key={`${entry.hsn}-${entry.rate}`} style={{ marginBottom: '0.5rem', borderBottom: '1px dashed #eee', paddingBottom: '0.25rem' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>HSN: {entry.hsn} | GST: {entry.rate}%</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', paddingLeft: '0.5rem' }}>
                              <span>CGST ({entry.rate / 2}%)</span>
                              <span>₹{(entry.gstAmt / 2).toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', paddingLeft: '0.5rem', marginTop: '0.1rem' }}>
                              <span>SGST ({entry.rate / 2}%)</span>
                              <span>₹{(entry.gstAmt / 2).toFixed(2)}</span>
                            </div>
                          </div>
                        ));
                      })()}
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
                  {createdInvoice.discount_amount - (createdInvoice.points_value || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Store Discount / Special Offers</span>
                      <span>-₹{(createdInvoice.discount_amount - (createdInvoice.points_value || 0)).toLocaleString()}</span>
                    </div>
                  )}
                  {(createdInvoice.points_value || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Loyalty Points Redeemed ({createdInvoice.points_redeemed} pts)</span>
                      <span>-₹{Number(createdInvoice.points_value).toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, borderTop: '2px solid #333', paddingTop: '0.5rem', color: '#d4af37' }}>
                    <span>Grand Net Total</span>
                    <span>₹{createdInvoice.net_amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Signature Section */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3.5rem', fontSize: '0.85rem' }}>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ margin: 0 }}>Salesperson: <strong>{createdInvoice.user?.name || user?.name}</strong></p>
                  <div style={{ borderTop: '1px dashed #333', width: '150px', marginTop: '2.5rem', textAlign: 'center', paddingTop: '0.25rem' }}>
                    Salesperson Signature
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0 }}>For <strong>{settings?.store_name || 'SMART TIMES'}</strong></p>
                  <div style={{ borderTop: '1px dashed #333', width: '150px', marginLeft: 'auto', marginTop: '2.5rem', textAlign: 'center', paddingTop: '0.25rem' }}>
                    Authorized Signatory
                  </div>
                </div>
              </div>

              {/* Share links */}
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ccc', paddingTop: '1.5rem', marginTop: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <a 
                    href={`https://wa.me/${createdInvoice.customer?.phone}?text=${encodeURIComponent(`Dear ${createdInvoice.customer?.name}, thank you for shopping at ${settings?.store_name || 'Smart Times'}. Your invoice ${createdInvoice.id} amounting ₹${createdInvoice.net_amount} is ready.`)}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <Share2 size={16} /> WhatsApp Alert
                  </a>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button onClick={handlePrint} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
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
