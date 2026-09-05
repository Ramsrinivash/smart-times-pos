import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Layout/Header';
import { Search, ShoppingCart, Trash2, Printer, Share2, Plus, UserCheck, Image as ImageIcon } from 'lucide-react';
import { alertService } from '../utils/alert';
import PrintableInvoice from '../components/PrintableInvoice';

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
  const [roundOffAmount, setRoundOffAmount] = useState('');
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
  const [invoiceWhatsAppUrl, setInvoiceWhatsAppUrl] = useState(null);
  const [settings, setSettings] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [draftPayload, setDraftPayload] = useState(null);

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

  // Totals calculations (Inclusive GST: MRP includes GST)
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
  const rawNet = Math.max(0, subtotal - totalDiscount);
  const roundOffVal = Number(roundOffAmount || 0);
  
  // Final Net Payable Amount by customer (MRP after discounts + roundoff)
  const netAmount = Math.max(0, rawNet + roundOffVal);

  const autoRoundToNearest100 = () => {
    const remainder = rawNet % 100;
    if (remainder !== 0) {
      setRoundOffAmount(String(-remainder));
    } else {
      setRoundOffAmount('0');
    }
  };

  const autoRoundToNearest50 = () => {
    const remainder = rawNet % 50;
    if (remainder !== 0) {
      setRoundOffAmount(String(-remainder));
    } else {
      setRoundOffAmount('0');
    }
  };

  // GST calculations (Flat 18% GST deduction from final net amount: 3495 * 18% = 629.10, Taxable Base = 2865.90)
  const totalInitialItemNet = cart.reduce((acc, item) => acc + (Number(item.selling_price) - Number(item.discount_amount || 0)), 0);
  
  const totalGst = cart.reduce((acc, item) => {
    if (invoiceType !== 'gst') return 0;
    const itemInitialNet = Number(item.selling_price) - Number(item.discount_amount || 0);
    const allocatedItemNet = totalInitialItemNet > 0 ? (itemInitialNet * (netAmount / totalInitialItemNet)) : (netAmount / (cart.length || 1));
    const gstRate = Number(item.gst_rate || 18);
    const itemGst = allocatedItemNet * (gstRate / 100);
    return acc + itemGst;
  }, 0);

  const taxableBase = invoiceType === 'gst' ? (netAmount - totalGst) : netAmount;

  // Step 1: Open Order Preview & Review Modal BEFORE saving to DB
  const handleInitiateCheckout = (shouldPrintAndShare = false) => {
    if (cart.length === 0) {
      alertService.warning('Cart Empty', 'Your cart is empty. Please add at least one watch.');
      return;
    }
    if (!custName || !custPhone) {
      alertService.warning('Required Fields', 'Customer Name and Phone Number are required to preview/generate a bill.');
      return;
    }

    let cleanPhone = custPhone.trim().replace(/\s+/g, '');
    if (cleanPhone.startsWith('+91')) {
      cleanPhone = cleanPhone.substring(3);
    }
    const cleanDigits = cleanPhone.replace(/\D/g, '');
    const finalPhone = cleanDigits.length === 10 ? '+91' + cleanDigits : '+91' + cleanDigits.padStart(10, '0');

    let finalCustomerId = selectedCustomerId;
    if (!finalCustomerId) {
      const existing = customers.find(c => (c.phone || '').replace(/\D/g, '') === cleanDigits);
      if (existing) {
        finalCustomerId = existing.id;
      }
    }

    const payload = {
      shouldPrintAndShare,
      customer_id: finalCustomerId,
      customer_name: custName.trim() || 'Walk-in Customer',
      customer_phone: finalPhone,
      invoice_type: invoiceType,
      payment_mode: paymentMode,
      redeem_points: pointsToRedeem,
      bill_discount_amount: billDiscFlat,
      bill_discount_percent: billDiscPct,
      round_off_amount: roundOffVal,
      is_credit_sale: isCreditSale,
      notes,
      subtotal,
      totalDiscount,
      netAmount,
      totalGst,
      taxableBase,
      items: cart.map(item => ({
        watch_id: item.watch_id,
        brand: item.brand,
        model: item.model,
        selling_price: item.selling_price,
        gst_rate: item.gst_rate,
        discount_amount: item.discount_amount
      }))
    };

    setDraftPayload(payload);
    setShowReviewModal(true);
  };

  // Step 2: User confirms draft order -> Actually record sale in DB and generate official bill
  const executeFinalCheckout = async (payload) => {
    setShowReviewModal(false);
    try {
      let finalCustId = payload.customer_id;
      if (!finalCustId) {
        try {
          const newCust = await api.addCustomer({ 
            name: payload.customer_name, 
            phone: payload.customer_phone,
            email: custEmail || null,
            dob: custDob || null
          });
          finalCustId = newCust.customer ? newCust.customer.id : (newCust.id || 1);
        } catch (e) {
          finalCustId = 1;
        }
      }

      const salePayload = {
        ...payload,
        customer_id: finalCustId
      };

      const result = await api.addSale(salePayload, user.id);
      
      let detailInvoice = (result && result.items && result.customer) ? result : (result.sale || result);
      if (!detailInvoice || !detailInvoice.items || !detailInvoice.customer) {
        try {
          const saleId = detailInvoice.id || result;
          detailInvoice = await api.getSale(saleId);
        } catch (e) {
          console.error('Invoice fetch fallback:', e);
        }
      }

      const custDisplayName = detailInvoice.customer_name || detailInvoice.customer?.name || custName || 'Valued Customer';
      const custDisplayPhone = (detailInvoice.customer_phone || detailInvoice.customer?.phone || custPhone || '').replace(/\D/g, '').replace(/^91(\d{10})$/, '$1');
      const itemsText = (detailInvoice.items || []).map(i => `• ${i.watch?.brand || ''} ${i.watch?.model || ''}: ₹${Number(i.price_sold - (i.discount_amount || 0)).toLocaleString('en-IN')}`).join('\n');
      const waText = `Dear ${custDisplayName}, thank you for shopping at *${settings?.store_name || 'Smart Times'}*!\n\n📄 *Invoice: ${detailInvoice.id}*\n${itemsText}\n\n💰 *Total Paid: ₹${Number(detailInvoice.net_amount).toLocaleString('en-IN')}*\nPayment: ${(detailInvoice.payment_mode || 'Cash').toUpperCase()}\n\n🙏 We value your trust. Visit us again!\n– ${settings?.store_name || 'Smart Times'}, ${settings?.phone || ''}`;
      const phoneNum = custDisplayPhone.length === 10 ? `91${custDisplayPhone}` : custDisplayPhone;
      const waUrl = custDisplayPhone.length >= 10 ? `https://wa.me/${phoneNum}?text=${encodeURIComponent(waText)}` : null;
      setInvoiceWhatsAppUrl(waUrl);

      setCreatedInvoice(detailInvoice);
      
      // Clear checkout inputs
      setCart([]);
      setRedeemPoints('');
      setBillDiscountAmount('');
      setBillDiscountPercent('');
      setRoundOffAmount('');
      setSelectedCustomerId(null);
      setIsCreditSale(false);
      setNotes('');
      setCustName('');
      setCustPhone('');
      setCustEmail('');
      setCustDob('');
      loadCustomers();

      if (!payload.shouldPrintAndShare) {
        await alertService.success('Sale Recorded', 'Checkout completed successfully!');
      }
    } catch (err) {
      alertService.error('Checkout Failed', err.message || 'Checkout failed.');
    }
  };

  const handlePrint = () => {
    // Use isolated print window to avoid double-bill issue
    const invoiceEl = document.querySelector('.smarttimes-printable-invoice');
    if (!invoiceEl) { window.print(); return; }
    const styleSheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(s => s.outerHTML).join('');
    const pw = window.open('', '_blank', 'width=900,height=700');
    pw.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice</title>${styleSheets}<style>body{margin:0;padding:14mm;background:#fff;color:#000;font-family:Arial,sans-serif;font-size:12px;}</style></head><body>${invoiceEl.innerHTML}</body></html>`);
    pw.document.close();
    pw.focus();
    setTimeout(() => { pw.print(); pw.close(); }, 350);
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--primary-gold-glow)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginTop: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Loyalty Balance</span>
                    <div style={{ fontWeight: 600, color: 'var(--primary-gold)' }}>
                      {loyaltyPoints} pts available
                      {Number(redeemPoints || 0) > 0 && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.4rem' }}>
                          ({loyaltyPoints - Number(redeemPoints || 0)} pts remaining after bill)
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {loyaltyPoints > 0 && (
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm"
                        onClick={() => setRedeemPoints(String(loyaltyPoints))}
                        style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                      >
                        Redeem {loyaltyPoints} pts
                      </button>
                    )}
                    <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <UserCheck size={12} />
                      {selectedCustomerId ? 'Registered CRM' : 'New Profile'}
                    </span>
                  </div>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <label className="form-label" style={{ margin: 0 }}>Redeem Reward Points</label>
                  {loyaltyPoints > 0 && (
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button 
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}
                        onClick={() => setRedeemPoints(String(loyaltyPoints))}
                      >
                        Use Max ({loyaltyPoints} pts)
                      </button>
                      {Number(redeemPoints || 0) > 0 && (
                        <button 
                          type="button"
                          className="btn btn-sm"
                          style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem', color: 'var(--error)' }}
                          onClick={() => setRedeemPoints('')}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="0" 
                    value={redeemPoints}
                    onChange={(e) => setRedeemPoints(cleanNumberInput(e.target.value))}
                    max={loyaltyPoints || 0}
                  />
                </div>
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

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Manual Round Off / Adjustment (₹)</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--primary-gold)' }}>e.g. -90 or +10</span>
                </label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="0 (e.g. -90)" 
                    value={roundOffAmount} 
                    onChange={(e) => setRoundOffAmount(e.target.value)} 
                  />
                  <button type="button" onClick={autoRoundToNearest100} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem', whiteSpace: 'nowrap', padding: '0.3rem 0.5rem' }}>
                    Round ₹100
                  </button>
                  <button type="button" onClick={autoRoundToNearest50} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem', whiteSpace: 'nowrap', padding: '0.3rem 0.5rem' }}>
                    Round ₹50
                  </button>
                </div>
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
                 {roundOffVal !== 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: roundOffVal < 0 ? 'var(--error)' : 'var(--success)', fontWeight: 600 }}>
                    <span>Manual Round Off Adjustment:</span>
                    <span>{roundOffVal < 0 ? `-₹${Math.abs(roundOffVal).toLocaleString()}` : `+₹${roundOffVal.toLocaleString()}`}</span>
                  </div>
                 )}
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                   <span>Net Taxable Base (Excl. Tax):</span>
                   <span>₹{taxableBase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                 </div>
                 {invoiceType === 'gst' && (
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                     <span>GST Included (Output Tax):</span>
                     <span>+₹{totalGst.toFixed(2)}</span>
                   </div>
                 )}
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-gold)', marginTop: '0.25rem' }}>
                   <span>Net Amount Due:</span>
                   <span>₹{netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                 </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                {/* Single Quick Checkout, Print & WhatsApp Button */}
                <button 
                  type="button" 
                  onClick={() => handleInitiateCheckout(true)} 
                  className="btn btn-primary" 
                  style={{ padding: '0.85rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 700 }}
                >
                  <Printer size={18} /> Preview & Confirm Order (Print & WhatsApp)
                </button>
                
                {/* Traditional Simple Checkout Button */}
                <button 
                  type="button" 
                  onClick={() => handleInitiateCheckout(false)} 
                  className="btn btn-secondary" 
                  style={{ padding: '0.75rem', width: '100%', fontWeight: 600 }}
                >
                  Preview & Record Order Only
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Draft Order Preview & Confirmation Modal BEFORE Bill Generation */}
        {showReviewModal && draftPayload && (
          <div className="modal-overlay" style={{ overflowY: 'auto', padding: '2rem 1rem' }}>
            <div style={{ background: 'var(--surface-color)', color: 'var(--text-primary)', borderRadius: '12px', maxWidth: '800px', margin: '0 auto', border: '1px solid var(--primary-gold)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', color: 'var(--primary-gold)' }}>
                  📋 Order Review & Pre-Bill Confirmation
                </h3>
                <span className="badge badge-warning">Draft Preview (Not Billed Yet)</span>
              </div>

              {/* Customer & Billing Info Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Customer Details:</div>
                  <strong style={{ fontSize: '1rem' }}>{draftPayload.customer_name}</strong>
                  <div style={{ color: 'var(--text-secondary)' }}>Phone: {draftPayload.customer_phone}</div>
                  {draftPayload.notes && <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '4px' }}>Note: {draftPayload.notes}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Invoice Type & Payment:</div>
                  <div>Invoice: <strong style={{ color: 'var(--primary-gold)', textTransform: 'uppercase' }}>{draftPayload.invoice_type}</strong></div>
                  <div>Payment Mode: <strong style={{ textTransform: 'uppercase' }}>{draftPayload.payment_mode}</strong></div>
                </div>
              </div>

              {/* Watches Items List (Multi-Watch Support) */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Items in Order ({draftPayload.items.length} Watches)</h4>
                <div className="table-responsive">
                  <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '30px' }}>#</th>
                        <th>Watch ID / Serial</th>
                        <th>Brand & Model</th>
                        <th style={{ textAlign: 'right' }}>Selling Price</th>
                        <th style={{ textAlign: 'right' }}>Discount</th>
                        <th style={{ textAlign: 'right' }}>Final Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draftPayload.items.map((item, idx) => {
                        const finalP = Number(item.selling_price) - Number(item.discount_amount || 0);
                        return (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-gold)' }}>{item.watch_id}</td>
                            <td>{item.brand} — {item.model}</td>
                            <td style={{ textAlign: 'right' }}>₹{Number(item.selling_price).toLocaleString()}</td>
                            <td style={{ textAlign: 'right', color: 'var(--error)' }}>-₹{Number(item.discount_amount || 0).toLocaleString()}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{finalP.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Amount Breakdown */}
              <div style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Gross Subtotal:</span>
                  <span>₹{Number(draftPayload?.subtotal || 0).toLocaleString()}</span>
                </div>
                {Number(draftPayload?.totalDiscount || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--error)', marginBottom: '0.35rem' }}>
                    <span>Total Discount:</span>
                    <span>-₹{Number(draftPayload?.totalDiscount || 0).toLocaleString()}</span>
                  </div>
                )}
                {Number(draftPayload?.round_off_amount || 0) !== 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: (draftPayload?.round_off_amount || 0) < 0 ? 'var(--error)' : 'var(--success)', marginBottom: '0.35rem' }}>
                    <span>Manual Round Off Adjustment:</span>
                    <span>{(draftPayload?.round_off_amount || 0) < 0 ? `-₹${Math.abs(draftPayload?.round_off_amount || 0).toLocaleString()}` : `+₹${Number(draftPayload?.round_off_amount || 0).toLocaleString()}`}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem', marginTop: '0.5rem', fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary-gold)' }}>
                  <span>Net Amount Due:</span>
                  <span>₹{Number(draftPayload?.netAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
                  onClick={() => setShowReviewModal(false)}
                >
                  ✏️ Edit Order / Back to Cart
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '0.65rem 1.5rem', fontSize: '0.95rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                  onClick={() => executeFinalCheckout(draftPayload)}
                >
                  <CheckCircle size={18} /> Confirm Order & Generate Bill
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Printable Invoice Receipt Modal */}
        {createdInvoice && (
          <div className="modal-overlay no-print" style={{ overflowY: 'auto', padding: '2rem 1rem' }}>
            <div style={{ background: '#fff', borderRadius: '8px', maxWidth: '850px', margin: '0 auto', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', padding: '1rem' }}>
              <PrintableInvoice
                invoice={createdInvoice}
                storeSettings={settings}
                currentUser={user}
                waUrl={invoiceWhatsAppUrl}
                onClose={() => { setCreatedInvoice(null); setInvoiceWhatsAppUrl(null); }}
                onPrint={handlePrint}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sales;
