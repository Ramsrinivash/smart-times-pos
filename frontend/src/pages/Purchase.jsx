import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Header from '../components/Layout/Header';
import { Plus, Trash2, Save, CheckCircle, Edit, RefreshCw, Upload, FileText, Eye, X } from 'lucide-react';
import { alertService } from '../utils/alert';

const Purchase = () => {
  const [supplierName, setSupplierName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; });
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [billFile, setBillFile] = useState(null);
  const [billFileName, setBillFileName] = useState('');
  const [billFilePreview, setBillFilePreview] = useState(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [isSupplierSaved, setIsSupplierSaved] = useState(false);
  const [existingModels, setExistingModels] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSupplierNameChange = (val) => {
    setSupplierName(val);
    if (!val.trim()) {
      setFilteredSuppliers([]);
      setShowSupplierSuggestions(false);
      return;
    }
    const filtered = existingSuppliers.filter(s => 
      s.toLowerCase().includes(val.toLowerCase())
    );
    setFilteredSuppliers(filtered);
    setShowSupplierSuggestions(filtered.length > 0);
  };
  
  const [items, setItems] = useState([
    { 
      id: '', 
      brand: '', 
      model: '', 
      category: 'Chronograph', 
      gender: 'Men', 
      strap_type: 'Leather', 
      dial_color: 'Black', 
      movement_type: 'Quartz', 
      mrp: '', 
      discount_percent: 0, 
      additional_scheme: 0,
      quantity: 1,
      cost_price: '', 
      selling_price: '', 
      gst_rate: 18,
      hsn_code: '9102'
    }
  ]);

  // Load unique models from existing inventory to auto-fill
  const loadExistingModels = async () => {
    try {
      const inventory = await api.getInventory();
      const uniqueModelsMap = {};
      inventory.forEach(w => {
        const key = `${w.brand.toLowerCase()}||${w.model.toLowerCase()}||${Number(w.mrp)}`;
        if (!uniqueModelsMap[key]) {
          uniqueModelsMap[key] = {
            brand: w.brand,
            model: w.model,
            category: w.category || 'Chronograph',
            gender: w.gender || 'Men',
            strap_type: w.strap_type || 'Leather',
            dial_color: w.dial_color || 'Black',
            movement_type: w.movement_type || 'Quartz',
            mrp: w.mrp,
            selling_price: w.selling_price,
            gst_rate: w.gst_rate,
            hsn_code: w.hsn_code || '9102'
          };
        }
      });
      setExistingModels(Object.values(uniqueModelsMap));
    } catch (err) {
      console.error('Failed to load existing inventory models:', err);
    }
  };

  const [existingSuppliers, setExistingSuppliers] = useState([]);

  const loadExistingSuppliers = async () => {
    try {
      const data = await api.getPurchases();
      const uniqueSuppliers = [...new Set(data.map(p => p.supplier_name).filter(Boolean))];
      setExistingSuppliers(uniqueSuppliers);
    } catch (err) {
      console.error('Failed to load existing suppliers:', err);
    }
  };

  useEffect(() => {
    loadExistingSuppliers();
  }, []);

  useEffect(() => {
    if (isSupplierSaved) {
      loadExistingModels();
    }
  }, [isSupplierSaved]);

  const handleSaveSupplier = (e) => {
    e.preventDefault();
    if (!supplierName) {
      alertService.warning('Required Field', 'Please enter supplier name.');
      return;
    }
    if (!invoiceNumber || !invoiceNumber.trim()) {
      alertService.warning('Required Field', 'Supplier Invoice / Bill Number is mandatory.');
      return;
    }
    setIsSupplierSaved(true);
    
    // Add the saved supplier to state immediately so it appears in the dropdown list if edited/revisited
    const trimmed = supplierName.trim();
    const lowerName = trimmed.toLowerCase();
    const exists = existingSuppliers.some(s => s.toLowerCase() === lowerName);
    if (!exists) {
      setExistingSuppliers([...existingSuppliers, trimmed]);
    }
  };

  const handleEditSupplier = () => {
    setIsSupplierSaved(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alertService.warning('File Too Large', 'Maximum file size allowed is 10 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setBillFile(reader.result);
      setBillFileName(file.name);
      setBillFilePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setBillFile(null);
    setBillFileName('');
    setBillFilePreview(null);
  };

  const handleAddItem = () => {
    setItems([...items, { 
      id: '', 
      brand: '', 
      model: '', 
      category: 'Chronograph', 
      gender: 'Men', 
      strap_type: 'Leather', 
      dial_color: 'Black', 
      movement_type: 'Quartz', 
      mrp: '', 
      discount_percent: 0, 
      additional_scheme: 0,
      quantity: 1,
      cost_price: '', 
      selling_price: '', 
      gst_rate: 18,
      hsn_code: '9102'
    }]);
  };

  const handleRemoveItem = (index) => {
    const next = items.filter((_, idx) => idx !== index);
    setItems(next.length === 0 ? [{ 
      id: '', 
      brand: '', 
      model: '', 
      category: 'Chronograph', 
      gender: 'Men', 
      strap_type: 'Leather', 
      dial_color: 'Black', 
      movement_type: 'Quartz', 
      mrp: '', 
      discount_percent: 0, 
      additional_scheme: 0,
      quantity: 1,
      cost_price: '', 
      selling_price: '', 
      gst_rate: 18,
      hsn_code: '9102'
    }] : next);
  };

  const handleItemChange = (index, field, value) => {
    const next = [...items];
    next[index][field] = value;

    if (field === 'mrp' || field === 'discount_percent' || field === 'additional_scheme') {
      const mrpVal = Number(next[index].mrp || 0);
      const discPercent = Number(next[index].discount_percent || 0);
      const schemePercent = Number(next[index].additional_scheme || 0);
      
      // Calculate unit cost price after both discount and scheme are applied
      const costVal = mrpVal * (1 - discPercent / 100) * (1 - schemePercent / 100);
      next[index].cost_price = costVal > 0 ? Number(costVal.toFixed(2)) : '';
      
      if (field === 'mrp') {
        next[index].selling_price = mrpVal;
      }
    }
    
    // Spec mapping logic
    if (field === 'category') {
      if (value === 'Quartz' || value === 'Automatic') {
        next[index].movement_type = value;
      } else {
        next[index].movement_type = 'Quartz'; // Default fallback
      }
    }

    setItems(next);
  };

  const handleAutofillModel = (index, modelKey) => {
    if (!modelKey) return;
    const model = existingModels[modelKey];
    if (!model) return;

    const next = [...items];
    next[index].brand = model.brand;
    next[index].model = model.model;
    next[index].category = model.category;
    next[index].gender = model.gender;
    next[index].strap_type = model.strap_type;
    next[index].dial_color = model.dial_color;
    next[index].movement_type = model.movement_type;
    next[index].mrp = model.mrp;
    next[index].selling_price = model.selling_price;
    next[index].gst_rate = model.gst_rate;
    next[index].hsn_code = model.hsn_code || '9102';

    // Recalculate cost price
    const mrpVal = Number(model.mrp || 0);
    const discPercent = Number(next[index].discount_percent || 0);
    const schemePercent = Number(next[index].additional_scheme || 0);
    const costVal = mrpVal * (1 - discPercent / 100) * (1 - schemePercent / 100);
    next[index].cost_price = costVal > 0 ? Number(costVal.toFixed(2)) : '';

    setItems(next);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!supplierName) {
      alertService.warning('Required Field', 'Please enter supplier name.');
      return;
    }

    if (!invoiceNumber || !invoiceNumber.trim()) {
      alertService.warning('Required Field', 'Supplier Invoice / Bill Number is mandatory.');
      return;
    }

    const invalid = items.some(item => !item.id || !item.brand || !item.model || !item.mrp || !item.cost_price || !item.selling_price);
    if (invalid) {
      alertService.warning('Incomplete fields', 'Please fill out all mandatory fields for all watch pieces.');
      return;
    }

    // Open confirmation review modal instead of saving immediately
    setShowConfirmModal(true);
  };

  const handleConfirmSavePurchase = async () => {
    setIsSubmitting(true);
    try {
      await api.addPurchase({
        supplier_name: supplierName,
        purchase_date: purchaseDate,
        invoice_number: invoiceNumber,
        remarks,
        payment_status: paymentStatus,
        bill_file: billFile,
        items
      });
      setShowConfirmModal(false);
      alertService.success('Success', 'Purchase batch and pieces successfully added to inventory!');
      setSupplierName('');
      setInvoiceNumber('');
      setRemarks('');
      setBillFile(null);
      setBillFileName('');
      setBillFilePreview(null);
      setIsSupplierSaved(false);
      loadExistingSuppliers();
      setItems([{ 
        id: '', 
        brand: '', 
        model: '', 
        category: 'Chronograph', 
        gender: 'Men', 
        strap_type: 'Leather', 
        dial_color: 'Black', 
        movement_type: 'Quartz', 
        mrp: '', 
        discount_percent: 0, 
        additional_scheme: 0,
        quantity: 1,
        cost_price: '', 
        selling_price: '', 
        gst_rate: 18,
        hsn_code: '9102'
      }]);
    } catch (err) {
      alertService.error('Error', err.message || 'Failed to record purchase batch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Specs dropdown choices as requested by user
  const specOptions = [
    'Quartz',
    'Automatic',
    'Edge',
    'Chronograph',
    'Smart Watch',
    'Wall Clock'
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
      <Header searchPlaceholder="Search purchase records..." />
      <div className="page-container">
        <h1 className="page-title">New Purchase Entry</h1>
        <p className="page-subtitle">Record supplier invoice and add watch units with cost-price-per-unit details.</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Supplier Details Card */}
          <div className="card" style={{ overflow: 'visible' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0 }}>Supplier Details</h3>
              {isSupplierSaved ? (
                <button type="button" onClick={handleEditSupplier} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Edit size={14} /> Edit Details
                </button>
              ) : (
                <button type="button" onClick={handleSaveSupplier} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CheckCircle size={14} /> Save Supplier Details
                </button>
              )}
            </div>
            <div className="form-row">
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Supplier Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. TimeTech Distributors" 
                  value={supplierName}
                  onChange={(e) => handleSupplierNameChange(e.target.value)}
                  disabled={isSupplierSaved}
                  required
                  onFocus={() => {
                    if (supplierName.trim()) {
                      const filtered = existingSuppliers.filter(s => 
                        s.toLowerCase().includes(supplierName.toLowerCase())
                      );
                      setFilteredSuppliers(filtered);
                      setShowSupplierSuggestions(filtered.length > 0);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowSupplierSuggestions(false), 200);
                  }}
                />
                {showSupplierSuggestions && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'var(--surface-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                    zIndex: 9999,
                    marginTop: '0.25rem',
                    maxHeight: '180px',
                    overflowY: 'auto'
                  }}>
                    {filteredSuppliers.map((sup, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSupplierName(sup);
                          setShowSupplierSuggestions(false);
                        }}
                        style={{
                          padding: '0.6rem 1rem',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--surface-card)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        {sup}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Purchase Date *</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  disabled={isSupplierSaved}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Supplier Invoice / Bill No. *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. TT-9021 (Mandatory)" 
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  disabled={isSupplierSaved}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Status</label>
                <select 
                  className="form-control"
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  disabled={isSupplierSaved}
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending Payment</option>
                </select>
              </div>
            </div>

            {/* Bill File Upload Section */}
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                  <FileText size={16} color="var(--primary-gold)" /> Upload Supplier Bill (PDF / JPEG / PNG) - Optional
                </label>
                {billFile && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowBillModal(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', padding: '0.35rem 0.75rem', color: 'var(--primary-gold)' }}
                    >
                      <Eye size={14} /> View Attached Bill
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleRemoveFile}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', padding: '0.35rem 0.75rem', color: 'var(--error)' }}
                    >
                      <X size={14} /> Remove Bill
                    </button>
                  </div>
                )}
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = 'var(--primary-gold)';
                  e.currentTarget.style.background = 'rgba(217, 119, 6, 0.08)';
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.background = 'var(--surface-card)';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.background = 'var(--surface-card)';
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    const fakeEvent = { target: { files: [file] } };
                    handleFileUpload(fakeEvent);
                  }
                }}
                style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  background: 'var(--surface-card)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => document.getElementById('bill-upload').click()}
              >
                <input
                  id="bill-upload"
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                
                {billFileName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <div style={{ padding: '0.5rem', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.15)', color: 'var(--success)' }}>
                      <CheckCircle size={24} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{billFileName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--success)' }}>Document successfully attached. Click anywhere or drop another file to replace.</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload size={28} color="var(--primary-gold)" style={{ opacity: 0.8 }} />
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Drag & drop your supplier bill here, or <span style={{ color: 'var(--primary-gold)', textDecoration: 'underline' }}>browse</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Supports PDF, JPEG, JPG, PNG, and WebP (up to 10 MB)
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="form-group" style={{ margin: '1rem 0 0 0' }}>
              <label className="form-label">Remarks</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Purchase batch details..." 
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={isSupplierSaved}
              />
            </div>
          </div>

          {/* Itemized Pieces Card */}
          <div className="card" style={{ overflowX: 'auto', opacity: isSupplierSaved ? 1 : 0.6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0 }}>Itemized Inventory Pieces</h3>
              {isSupplierSaved && (
                <button type="button" onClick={handleAddItem} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Plus size={16} /> Add Watch Piece
                </button>
              )}
            </div>

            {!isSupplierSaved ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Save size={36} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                <p style={{ fontWeight: 500, margin: 0 }}>Please click "Save Supplier Details" above to activate the Itemized Inventory Pieces table.</p>
              </div>
            ) : (
              <table style={{ minWidth: '2000px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ width: '150px', padding: '0.75rem 0.5rem', textAlign: 'left' }}>Autofill Model</th>
                    <th style={{ width: '160px', padding: '0.75rem 0.5rem', textAlign: 'left' }}>Watch Serial / ID *</th>
                    <th style={{ width: '110px', padding: '0.75rem 0.5rem', textAlign: 'left' }}>Brand *</th>
                    <th style={{ width: '110px', padding: '0.75rem 0.5rem', textAlign: 'left' }}>Model *</th>
                    <th style={{ width: '100px', padding: '0.75rem 0.5rem', textAlign: 'left' }}>HSN *</th>
                    <th style={{ width: '100px', padding: '0.75rem 0.5rem', textAlign: 'left' }}>MRP (₹) *</th>
                    <th style={{ width: '80px', padding: '0.75rem 0.5rem', textAlign: 'left' }}>Disc %</th>
                    <th style={{ width: '90px', padding: '0.75rem 0.5rem', textAlign: 'left' }}>Scheme %</th>
                    <th style={{ width: '80px', padding: '0.75rem 0.5rem', textAlign: 'left' }}>Qty *</th>
                    <th style={{ width: '110px', padding: '0.75rem 0.5rem', textAlign: 'left' }}>Cost Price *</th>
                    <th style={{ width: '120px', padding: '0.75rem 0.5rem', textAlign: 'left' }}>Total Cost (₹)</th>
                    <th style={{ width: '110px', padding: '0.75rem 0.5rem', textAlign: 'left' }}>Selling Price *</th>
                    <th style={{ width: '120px', padding: '0.75rem 0.5rem', textAlign: 'left' }}>Est. Profit (₹)</th>
                    <th style={{ width: '90px', padding: '0.75rem 0.5rem', textAlign: 'left' }}>GST %</th>
                    <th style={{ width: '130px', padding: '0.75rem 0.5rem', textAlign: 'left' }}>Spec (Type) *</th>
                    <th style={{ width: '120px', padding: '0.75rem 0.5rem', textAlign: 'left' }}>Gender *</th>
                    <th style={{ width: '50px', padding: '0.75rem 0.5rem' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.5rem' }}>
                        <select 
                          className="form-control" 
                          style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem', height: '36px' }}
                          onChange={(e) => handleAutofillModel(index, e.target.value)}
                          defaultValue=""
                        >
                          <option value="">-- Select --</option>
                          {existingModels.map((m, idx) => (
                            <option key={idx} value={idx}>{m.brand} {m.model} (₹{m.mrp})</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="Serial No."
                          value={item.id}
                          onChange={(e) => handleItemChange(index, 'id', e.target.value)}
                          required
                          style={{ fontFamily: 'monospace', height: '36px', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="e.g. Seiko"
                          value={item.brand}
                          onChange={(e) => handleItemChange(index, 'brand', e.target.value)}
                          required
                          style={{ height: '36px', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="e.g. Presage"
                          value={item.model}
                          onChange={(e) => handleItemChange(index, 'model', e.target.value)}
                          required
                          style={{ height: '36px', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="9102"
                          value={item.hsn_code}
                          onChange={(e) => handleItemChange(index, 'hsn_code', e.target.value)}
                          required
                          style={{ height: '36px', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input 
                          type="number" 
                          className="form-control" 
                          placeholder="MRP"
                          value={item.mrp}
                          onChange={(e) => handleItemChange(index, 'mrp', e.target.value)}
                          required
                          style={{ height: '36px', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input 
                          type="number" 
                          className="form-control" 
                          placeholder="%"
                          value={item.discount_percent}
                          onChange={(e) => handleItemChange(index, 'discount_percent', e.target.value)}
                          style={{ height: '36px', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input 
                          type="number" 
                          className="form-control" 
                          placeholder="%"
                          value={item.additional_scheme}
                          onChange={(e) => handleItemChange(index, 'additional_scheme', e.target.value)}
                          style={{ height: '36px', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input 
                          type="number" 
                          className="form-control" 
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          required
                          min="1"
                          style={{ height: '36px', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input 
                          type="number" 
                          className="form-control" 
                          placeholder="Cost"
                          value={item.cost_price}
                          onChange={(e) => handleItemChange(index, 'cost_price', e.target.value)}
                          required
                          style={{ color: 'var(--primary-gold)', fontWeight: 600, height: '36px', background: 'rgba(212,175,55,0.05)', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <div style={{ color: 'var(--primary-gold)', fontWeight: 700, fontSize: '0.85rem' }}>
                          ₹{(Number(item.quantity || 0) * Number(item.cost_price || 0)).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </div>
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input 
                          type="number" 
                          className="form-control" 
                          placeholder="Selling Price"
                          value={item.selling_price}
                          onChange={(e) => handleItemChange(index, 'selling_price', e.target.value)}
                          required
                          style={{ height: '36px', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.85rem' }}>
                          ₹{((Number(item.selling_price || 0) - Number(item.cost_price || 0)) * Number(item.quantity || 0)).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </div>
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <select 
                          className="form-control"
                          value={item.gst_rate}
                          onChange={(e) => handleItemChange(index, 'gst_rate', Number(e.target.value))}
                          style={{ height: '36px', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                        >
                          <option value="0">0% (Non-GST / Exempt)</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <select 
                          className="form-control"
                          value={item.category}
                          onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                          style={{ height: '36px', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                        >
                          {specOptions.map((opt, oidx) => (
                            <option key={oidx} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <select 
                          className="form-control"
                          value={item.gender || 'Unisex'}
                          onChange={(e) => handleItemChange(index, 'gender', e.target.value)}
                          style={{ height: '36px', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Unisex">Unisex</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveItem(index)} 
                          className="btn btn-danger btn-sm"
                          style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 'auto' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {isSupplierSaved && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Save size={18} /> Save Purchase & Stock Units
              </button>
            </div>
          )}
        </form>

        {/* Supplier Bill Viewer Modal */}
        {showBillModal && billFile && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}>
            <div style={{
              background: 'var(--surface-color)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: '900px',
              height: '85vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={18} color="var(--primary-gold)" />
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Supplier Bill Preview: {billFileName || invoiceNumber}</h3>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowBillModal(false)}
                  style={{ padding: '0.3rem 0.6rem' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ flex: 1, overflow: 'auto', padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0b0f19' }}>
                {billFile.startsWith('data:application/pdf') ? (
                  <iframe
                    src={billFile}
                    title="Supplier Bill PDF"
                    style={{ width: '100%', height: '100%', border: 'none', borderRadius: '4px' }}
                  />
                ) : (
                  <img
                    src={billFile}
                    alt="Supplier Bill"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px' }}
                  />
                )}
              </div>

              <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <a
                  href={billFile}
                  download={billFileName || `supplier_bill_${invoiceNumber || 'receipt'}`}
                  className="btn btn-primary btn-sm"
                  style={{ textDecoration: 'none' }}
                >
                  Download Bill
                </a>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowBillModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Purchase Confirmation & Review Modal */}
        {showConfirmModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}>
            <div style={{
              background: 'var(--surface-color)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: '950px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 30px rgba(0,0,0,0.6)'
            }}>
              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border-color)',
                background: 'var(--surface-card)'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary-gold)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={20} /> Review & Confirm Purchase Entry
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Supplier: <strong>{supplierName}</strong> • Bill No: <strong>{invoiceNumber}</strong> • Date: <strong>{purchaseDate}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowConfirmModal(false)}
                  style={{ padding: '0.35rem 0.6rem' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body Summary Table */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ background: 'var(--surface-card)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Watch Pieces</span>
                    <h4 style={{ margin: '0.2rem 0 0 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>{items.length} units</h4>
                  </div>
                  <div style={{ background: 'var(--surface-card)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Payment Status</span>
                    <h4 style={{ margin: '0.2rem 0 0 0', fontSize: '1.1rem', color: paymentStatus === 'paid' ? 'var(--success)' : '#ef4444', textTransform: 'capitalize' }}>
                      {paymentStatus === 'paid' ? '✓ Paid' : 'Pending Payment'}
                    </h4>
                  </div>
                  <div style={{ background: 'var(--surface-card)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Purchase Cost</span>
                    <h4 style={{ margin: '0.2rem 0 0 0', fontSize: '1.2rem', color: 'var(--primary-gold)' }}>
                      ₹{items.reduce((acc, i) => acc + Number(i.cost_price || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </h4>
                  </div>
                </div>

                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Watch Pieces to be Added to Inventory:</h4>
                <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                  <table className="data-table" style={{ fontSize: '0.825rem', width: '100%' }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-card)' }}>
                        <th>#</th>
                        <th>Serial / Barcode</th>
                        <th>Brand & Model</th>
                        <th>Specs</th>
                        <th>MRP</th>
                        <th>Disc %</th>
                        <th>Scheme %</th>
                        <th>Unit Cost Price</th>
                        <th>Selling Price</th>
                        <th>GST %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-gold)' }}>{it.id}</td>
                          <td><strong>{it.brand}</strong> {it.model}</td>
                          <td>{it.category} • {it.movement_type}</td>
                          <td>₹{Number(it.mrp || 0).toLocaleString()}</td>
                          <td>{it.discount_percent || 0}%</td>
                          <td>{it.additional_scheme || 0}%</td>
                          <td style={{ fontWeight: 700, color: 'var(--primary-gold)' }}>₹{Number(it.cost_price || 0).toLocaleString()}</td>
                          <td>₹{Number(it.selling_price || 0).toLocaleString()}</td>
                          <td>{Number(it.gst_rate) === 0 ? '0% (Non-GST)' : `${it.gst_rate}%`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer Actions */}
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--surface-card)'
              }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowConfirmModal(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
                >
                  <Edit size={15} /> Edit Details (Go Back)
                </button>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowConfirmModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleConfirmSavePurchase}
                    disabled={isSubmitting}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, padding: '0.65rem 1.75rem' }}
                  >
                    <CheckCircle size={17} /> {isSubmitting ? 'Saving...' : 'Confirm & Save to Stock'}
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

export default Purchase;
