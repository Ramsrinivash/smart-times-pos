import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Header from '../components/Layout/Header';
import { Plus, Trash2, Save, CheckCircle, Edit, RefreshCw } from 'lucide-react';

const Purchase = () => {
  const [supplierName, setSupplierName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [isSupplierSaved, setIsSupplierSaved] = useState(false);
  const [existingModels, setExistingModels] = useState([]);
  
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
      alert('Please enter supplier name.');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supplierName) {
      alert('Please enter supplier name.');
      return;
    }

    const invalid = items.some(item => !item.id || !item.brand || !item.model || !item.mrp || !item.cost_price || !item.selling_price);
    if (invalid) {
      alert('Please fill out all mandatory fields for all watch pieces.');
      return;
    }

    try {
      await api.addPurchase({
        supplier_name: supplierName,
        purchase_date: purchaseDate,
        invoice_number: invoiceNumber,
        remarks,
        payment_status: paymentStatus,
        items
      });
      alert('Purchase batch and pieces successfully added to inventory!');
      setSupplierName('');
      setInvoiceNumber('');
      setRemarks('');
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
      alert(err.message || 'Failed to record purchase batch.');
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
          <div className="card">
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
              <div className="form-group">
                <label className="form-label">Supplier Name *</label>
                <input 
                  type="text" 
                  list="suppliers-list"
                  className="form-control" 
                  placeholder="e.g. TimeTech Distributors" 
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  disabled={isSupplierSaved}
                  required
                />
                <datalist id="suppliers-list">
                  {existingSuppliers.map((sup, idx) => (
                    <option key={idx} value={sup} />
                  ))}
                </datalist>
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
                <label className="form-label">Supplier Invoice Reference</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. TT-9021" 
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  disabled={isSupplierSaved}
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
            <div className="form-group" style={{ margin: 0 }}>
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
              <table style={{ minWidth: '1600px', borderCollapse: 'collapse' }}>
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
                    <th style={{ width: '110px', padding: '0.75rem 0.5rem', textAlign: 'left' }}>Selling Price *</th>
                    <th style={{ width: '90px', padding: '0.75rem 0.5rem', textAlign: 'left' }}>GST %</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>Spec (Type) *</th>
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
                          style={{ fontFamily: 'monospace', height: '36px' }}
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
                          style={{ height: '36px' }}
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
                          style={{ height: '36px' }}
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
                          style={{ height: '36px' }}
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
                          style={{ height: '36px' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input 
                          type="number" 
                          className="form-control" 
                          placeholder="%"
                          value={item.discount_percent}
                          onChange={(e) => handleItemChange(index, 'discount_percent', e.target.value)}
                          style={{ height: '36px' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input 
                          type="number" 
                          className="form-control" 
                          placeholder="%"
                          value={item.additional_scheme}
                          onChange={(e) => handleItemChange(index, 'additional_scheme', e.target.value)}
                          style={{ height: '36px' }}
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
                          style={{ height: '36px' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input 
                          type="number" 
                          className="form-control" 
                          placeholder="Cost"
                          value={item.cost_price}
                          readOnly
                          style={{ color: 'var(--primary-gold)', fontWeight: 600, height: '36px', background: 'rgba(212,175,55,0.05)' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input 
                          type="number" 
                          className="form-control" 
                          placeholder="Selling Price"
                          value={item.selling_price}
                          onChange={(e) => handleItemChange(index, 'selling_price', e.target.value)}
                          required
                          style={{ height: '36px' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <select 
                          className="form-control"
                          value={item.gst_rate}
                          onChange={(e) => handleItemChange(index, 'gst_rate', Number(e.target.value))}
                          style={{ height: '36px' }}
                        >
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
                          style={{ height: '36px' }}
                        >
                          {specOptions.map((opt, oidx) => (
                            <option key={oidx} value={opt}>{opt}</option>
                          ))}
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
      </div>
    </div>
  );
};

export default Purchase;
