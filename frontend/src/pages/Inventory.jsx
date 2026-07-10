import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Layout/Header';
import { Settings, Eye, Image as ImageIcon, Trash2, X, Plus } from 'lucide-react';

const Inventory = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [searchVal, setSearchVal] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedWatch, setSelectedWatch] = useState(null);
  const [adjustWatch, setAdjustWatch] = useState(null);
  const [newStatus, setNewStatus] = useState('');

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const data = await api.getInventory(searchVal, filterStatus);
      setInventory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [searchVal, filterStatus]);

  const handleAdjustStatus = async (e) => {
    e.preventDefault();
    if (!adjustWatch || !newStatus) return;
    try {
      await api.adjustStock(adjustWatch.id, newStatus, 'other', 'Status adjusted via inventory manager');
      setAdjustWatch(null);
      fetchInventory();
    } catch (err) {
      alert(err.message || 'Failed to adjust stock status.');
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const base64Promises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    });

    try {
      const base64Strings = await Promise.all(base64Promises);
      const updatedWatch = await api.uploadWatchImages(selectedWatch.id, base64Strings);
      setSelectedWatch(updatedWatch);
      fetchInventory();
      alert('✅ Watch images uploaded successfully!');
    } catch (err) {
      alert('Failed to upload images: ' + err.message);
    }
  };

  const handleRemoveImage = async (index) => {
    if (!window.confirm('Are you sure you want to delete this watch photo?')) return;
    try {
      const updatedWatch = await api.removeWatchImage(selectedWatch.id, index);
      setSelectedWatch(updatedWatch);
      fetchInventory();
    } catch (err) {
      alert('Failed to remove image: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
      <Header searchVal={searchVal} setSearchVal={setSearchVal} searchPlaceholder="Search inventory by Serial, brand, model..." />
      <div className="page-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page-title">Inventory Ledger</h1>
            <p className="page-subtitle">Detailed tracking of individual watch pieces.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <select 
              className="form-control" 
              style={{ width: '180px' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="sold">Sold</option>
              <option value="exchanged_returned">Exchanged Returns</option>
              <option value="refurbishing">Refurbishing</option>
              <option value="damaged">Damaged</option>
              <option value="display">Moved to Display</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div>Loading inventory...</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Thumbnail</th>
                  <th>Watch ID / Serial</th>
                  <th>Brand & Model</th>
                  <th>Specs</th>
                  <th>MRP</th>
                  <th>Selling Price</th>
                  {(user.role === 'admin' || user.role === 'manager') && <th>Cost Price</th>}
                  <th>GST</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventory.length > 0 ? (
                  inventory.map(w => (
                    <tr key={w.id}>
                      <td>
                        {w.image_urls && w.image_urls.length > 0 ? (
                          <img 
                            src={w.image_urls[0]} 
                            alt={w.model} 
                            style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} 
                          />
                        ) : (
                          <div style={{ width: '40px', height: '40px', background: 'var(--surface-card)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                            <ImageIcon size={16} />
                          </div>
                        )}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{w.id}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{w.brand}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{w.model}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {w.category} • {w.gender} • {w.movement_type}
                        </span>
                      </td>
                      <td>₹{Number(w.mrp).toLocaleString()}</td>
                      <td>₹{Number(w.selling_price).toLocaleString()}</td>
                      {(user.role === 'admin' || user.role === 'manager') && (
                        <td style={{ color: 'var(--primary-gold)' }}>
                          ₹{Number(w.cost_price).toLocaleString()}
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.3rem' }}>
                            ({w.discount_percent}% off)
                          </span>
                        </td>
                      )}
                      <td>{w.gst_rate}%</td>
                      <td>
                        <span className={`badge badge-${
                          w.status === 'in_stock' ? 'success' :
                          w.status === 'sold' ? 'info' :
                          w.status === 'refurbishing' ? 'warning' :
                          w.status === 'exchanged_returned' ? 'warning' : 'danger'
                        }`}>
                          {w.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            onClick={() => setSelectedWatch(w)}
                            className="btn btn-secondary btn-sm"
                            title="View Photos & Details"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Eye size={14} />
                          </button>
                          {(user.role === 'admin' || user.role === 'manager') && (
                            <button 
                              onClick={() => { setAdjustWatch(w); setNewStatus(w.status); }} 
                              className="btn btn-secondary btn-sm"
                              title="Adjust Stock Status"
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Settings size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={user.role === 'sales' ? 9 : 10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      No watch units match your filters or search terms.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Adjust Status Modal */}
        {adjustWatch && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3 style={{ marginBottom: '1rem' }}>Adjust Status: {adjustWatch.id}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Change the status of {adjustWatch.brand} {adjustWatch.model}.
              </p>
              
              <form onSubmit={handleAdjustStatus}>
                <div className="form-group">
                  <label className="form-label">Current Status</label>
                  <input type="text" className="form-control" value={adjustWatch.status} disabled />
                </div>
                <div className="form-group" style={{ marginBottom: '2rem' }}>
                  <label className="form-label">New Status</label>
                  <select 
                    className="form-control" 
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    <option value="in_stock">In Stock</option>
                    <option value="sold">Sold</option>
                    <option value="exchanged_returned">Exchanged Returned</option>
                    <option value="refurbishing">Refurbishing</option>
                    <option value="damaged">Damaged</option>
                    <option value="display">Moved to Display</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button type="button" onClick={() => setAdjustWatch(null)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Adjustments</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Detailed Info / Photo Gallery Modal */}
        {selectedWatch && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <h3 style={{ margin: 0 }}>Watch Details: {selectedWatch.id}</h3>
                <button onClick={() => setSelectedWatch(null)} className="btn btn-secondary btn-sm" style={{ padding: '0.4rem' }}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Specs */}
                <div>
                  <h4 style={{ color: 'var(--primary-gold)', marginBottom: '1rem' }}>Specifications</h4>
                  <table className="data-table" style={{ fontSize: '0.85rem' }}>
                    <tbody>
                      <tr><td><strong>Brand</strong></td><td>{selectedWatch.brand}</td></tr>
                      <tr><td><strong>Model</strong></td><td>{selectedWatch.model}</td></tr>
                      <tr><td><strong>Category</strong></td><td>{selectedWatch.category}</td></tr>
                      <tr><td><strong>Gender</strong></td><td>{selectedWatch.gender}</td></tr>
                      <tr><td><strong>Strap Type</strong></td><td>{selectedWatch.strap_type}</td></tr>
                      <tr><td><strong>Dial Color</strong></td><td>{selectedWatch.dial_color}</td></tr>
                      <tr><td><strong>Movement</strong></td><td>{selectedWatch.movement_type}</td></tr>
                      <tr><td><strong>MRP</strong></td><td>₹{Number(selectedWatch.mrp).toLocaleString()}</td></tr>
                      <tr><td><strong>Selling Price</strong></td><td>₹{Number(selectedWatch.selling_price).toLocaleString()}</td></tr>
                      {(user.role === 'admin' || user.role === 'manager') && (
                        <>
                          <tr><td><strong>Cost Price</strong></td><td>₹{Number(selectedWatch.cost_price).toLocaleString()}</td></tr>
                          <tr><td><strong>Profit Margin</strong></td><td style={{ color: 'var(--success)', fontWeight: 700 }}>₹{Number(selectedWatch.selling_price - selectedWatch.cost_price).toLocaleString()}</td></tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Photo Gallery (front, back, packaging) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0 }}>Photo Gallery</h4>
                    <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Plus size={14} /> Add Photo
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={handleImageUpload} 
                      />
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                    {selectedWatch.image_urls && selectedWatch.image_urls.map((img, idx) => (
                      <div key={idx} style={{ position: 'relative', width: '100%', paddingBottom: '100%', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        <img 
                          src={img} 
                          alt={`Watch ${idx}`} 
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                        <button 
                          onClick={() => handleRemoveImage(idx)}
                          style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(239,68,68,0.85)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {(!selectedWatch.image_urls || selectedWatch.image_urls.length === 0) && (
                    <div style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      <ImageIcon size={30} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                      <p style={{ fontSize: '0.8rem', margin: 0 }}>No photos uploaded yet.</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Upload front, back & box/packaging photos.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;
