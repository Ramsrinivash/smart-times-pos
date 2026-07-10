import React, { useState } from 'react';
import { api } from '../services/api';
import Header from '../components/Layout/Header';
import { Plus, Trash2, Save } from 'lucide-react';

const Purchase = () => {
  const [supplierName, setSupplierName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  
  const [items, setItems] = useState([
    { id: '', brand: '', model: '', category: 'Dress', gender: 'Men', strap_type: 'Leather', dial_color: 'Black', movement_type: 'Automatic', mrp: '', discount_percent: 0, cost_price: '', selling_price: '', gst_rate: 18 }
  ]);

  const handleAddItem = () => {
    setItems([...items, { id: '', brand: '', model: '', category: 'Dress', gender: 'Men', strap_type: 'Leather', dial_color: 'Black', movement_type: 'Automatic', mrp: '', discount_percent: 0, cost_price: '', selling_price: '', gst_rate: 18 }]);
  };

  const handleRemoveItem = (index) => {
    const next = items.filter((_, idx) => idx !== index);
    setItems(next.length === 0 ? [{ id: '', brand: '', model: '', category: 'Dress', gender: 'Men', strap_type: 'Leather', dial_color: 'Black', movement_type: 'Automatic', mrp: '', discount_percent: 0, cost_price: '', selling_price: '', gst_rate: 18 }] : next);
  };

  const handleItemChange = (index, field, value) => {
    const next = [...items];
    next[index][field] = value;

    if (field === 'mrp' || field === 'discount_percent') {
      const mrpVal = Number(next[index].mrp || 0);
      const discPercent = Number(next[index].discount_percent || 0);
      const costVal = mrpVal - (mrpVal * (discPercent / 100));
      next[index].cost_price = costVal > 0 ? costVal.toFixed(2) : '';
      
      if (field === 'mrp') next[index].selling_price = mrpVal;
    }
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
      setItems([{ id: '', brand: '', model: '', category: 'Dress', gender: 'Men', strap_type: 'Leather', dial_color: 'Black', movement_type: 'Automatic', mrp: '', discount_percent: 0, cost_price: '', selling_price: '', gst_rate: 18 }]);
    } catch (err) {
      alert(err.message || 'Failed to record purchase batch.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
      <Header searchPlaceholder="Search purchase records..." />
      <div className="page-container">
        <h1 className="page-title">New Purchase Entry</h1>
        <p className="page-subtitle">Record supplier invoice and add watch units with cost-price-per-unit details.</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="card">
            <h3 style={{ marginBottom: '1.25rem' }}>Supplier Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Supplier Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. TimeTech Distributors" 
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Purchase Date *</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
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
                />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Status</label>
                <select 
                  className="form-control"
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
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
              />
            </div>
          </div>

          <div className="card" style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3>Itemized Inventory Pieces</h3>
              <button type="button" onClick={handleAddItem} className="btn btn-secondary btn-sm">
                <Plus size={16} /> Add Watch Piece
              </button>
            </div>

            <table style={{ minWidth: '1200px' }}>
              <thead>
                <tr>
                  <th style={{ width: '160px' }}>Watch Serial / ID *</th>
                  <th style={{ width: '130px' }}>Brand *</th>
                  <th style={{ width: '150px' }}>Model *</th>
                  <th style={{ width: '100px' }}>MRP (₹) *</th>
                  <th style={{ width: '90px' }}>Discount %</th>
                  <th style={{ width: '110px' }}>Cost Price *</th>
                  <th style={{ width: '110px' }}>Selling Price *</th>
                  <th style={{ width: '90px' }}>GST %</th>
                  <th>Specs (Category / Movement)</th>
                  <th style={{ width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Serial No."
                        value={item.id}
                        onChange={(e) => handleItemChange(index, 'id', e.target.value)}
                        required
                        style={{ fontFamily: 'monospace' }}
                      />
                    </td>
                    <td>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. Seiko"
                        value={item.brand}
                        onChange={(e) => handleItemChange(index, 'brand', e.target.value)}
                        required
                      />
                    </td>
                    <td>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. Presage"
                        value={item.model}
                        onChange={(e) => handleItemChange(index, 'model', e.target.value)}
                        required
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        className="form-control" 
                        placeholder="MRP"
                        value={item.mrp}
                        onChange={(e) => handleItemChange(index, 'mrp', e.target.value)}
                        required
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        className="form-control" 
                        placeholder="%"
                        value={item.discount_percent}
                        onChange={(e) => handleItemChange(index, 'discount_percent', e.target.value)}
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        className="form-control" 
                        placeholder="Cost"
                        value={item.cost_price}
                        onChange={(e) => handleItemChange(index, 'cost_price', e.target.value)}
                        required
                        style={{ color: 'var(--primary-gold)', fontWeight: 600 }}
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        className="form-control" 
                        placeholder="Selling Price"
                        value={item.selling_price}
                        onChange={(e) => handleItemChange(index, 'selling_price', e.target.value)}
                        required
                      />
                    </td>
                    <td>
                      <select 
                        className="form-control"
                        value={item.gst_rate}
                        onChange={(e) => handleItemChange(index, 'gst_rate', Number(e.target.value))}
                      >
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <select 
                          className="form-control"
                          value={item.category}
                          onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                          style={{ fontSize: '0.8rem', padding: '0.4rem' }}
                        >
                          <option value="Chronograph">Chronograph</option>
                          <option value="Diver">Diver</option>
                          <option value="Dress">Dress</option>
                          <option value="Smart">Smart</option>
                        </select>
                        <select 
                          className="form-control"
                          value={item.movement_type}
                          onChange={(e) => handleItemChange(index, 'movement_type', e.target.value)}
                          style={{ fontSize: '0.8rem', padding: '0.4rem' }}
                        >
                          <option value="Automatic">Automatic</option>
                          <option value="Quartz">Quartz</option>
                          <option value="Mechanical">Mechanical</option>
                        </select>
                      </div>
                    </td>
                    <td>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveItem(index)} 
                        className="btn btn-danger btn-sm"
                        style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
              <Save size={18} /> Save Purchase & Stock Units
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Purchase;
