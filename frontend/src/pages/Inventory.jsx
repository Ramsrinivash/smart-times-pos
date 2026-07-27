import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Layout/Header';
import { Settings, Eye, Image as ImageIcon, Trash2, X, Plus } from 'lucide-react';
import { alertService } from '../utils/alert';

const Inventory = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [searchVal, setSearchVal] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedWatch, setSelectedWatch] = useState(null);
  const [adjustWatch, setAdjustWatch] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});

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
    const checkSessionSearch = () => {
      const sessionSearch = sessionStorage.getItem('inventory_search');
      if (sessionSearch) {
        setSearchVal(sessionSearch);
        sessionStorage.removeItem('inventory_search');
      }
    };
    checkSessionSearch();

    window.addEventListener('refresh-inventory-search', checkSessionSearch);
    return () => window.removeEventListener('refresh-inventory-search', checkSessionSearch);
  }, []);

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
      alertService.error('Error', err.message || 'Failed to adjust stock status.');
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
      alertService.success('Success', 'Watch images uploaded successfully!');
    } catch (err) {
      alertService.error('Error', 'Failed to upload images: ' + err.message);
    }
  };

  const handleRemoveImage = async (index) => {
    const confirmed = await alertService.confirm(
      'Delete photo?',
      'Are you sure you want to delete this watch photo?'
    );
    if (!confirmed) return;
    try {
      const updatedWatch = await api.removeWatchImage(selectedWatch.id, index);
      setSelectedWatch(updatedWatch);
      fetchInventory();
    } catch (err) {
      alertService.error('Error', 'Failed to remove image: ' + err.message);
    }
  };

  const getGroupedInventory = () => {
    const grouped = [];
    const groups = {};

    inventory.forEach(w => {
      const key = `${w.brand.trim().toLowerCase()}_${w.model.trim().toLowerCase()}`;
      if (!groups[key]) {
        groups[key] = {
          brand: w.brand,
          model: w.model,
          category: w.category,
          gender: w.gender,
          movement_type: w.movement_type,
          mrp: w.mrp,
          selling_price: w.selling_price,
          cost_price: w.cost_price,
          gst_rate: w.gst_rate,
          discount_percent: w.discount_percent,
          thumbnail: w.image_urls?.[0] || null,
          pieces: [],
        };
        grouped.push(groups[key]);
      }
      groups[key].pieces.push(w);
    });

    return grouped;
  };

  const toggleGroup = (key) => {
    setExpandedGroups(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const groupedInventory = getGroupedInventory();

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
                  <th style={{ width: '80px' }}>Thumbnail</th>
                  <th>Brand & Model</th>
                  <th>Specs</th>
                  <th>MRP</th>
                  <th>Selling Price</th>
                  {(user.role === 'admin' || user.role === 'manager') && <th>Cost Price</th>}
                  <th>GST</th>
                  <th>Stock Summary</th>
                  <th style={{ width: '80px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedInventory.length > 0 ? (
                  groupedInventory.map(group => {
                    const key = `${group.brand.toLowerCase()}_${group.model.toLowerCase()}`;
                    const isExpanded = !!expandedGroups[key];
                    const totalQty = group.pieces.length;
                    const inStockQty = group.pieces.filter(p => p.status === 'in_stock').length;
                    const soldQty = group.pieces.filter(p => p.status === 'sold').length;
                    const otherQty = totalQty - inStockQty - soldQty;

                    return (
                      <React.Fragment key={key}>
                        {/* Main Group Summary Row */}
                        <tr 
                          onClick={() => toggleGroup(key)} 
                          style={{ cursor: 'pointer' }}
                          className="inventory-group-row"
                        >
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {isExpanded ? '▼' : '▶'}
                              </span>
                              {group.thumbnail ? (
                                <img 
                                  src={group.thumbnail} 
                                  alt={group.model} 
                                  style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} 
                                />
                              ) : (
                                <div style={{ width: '40px', height: '40px', background: 'var(--surface-card)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                  <ImageIcon size={16} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{group.brand}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{group.model}</div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {group.category} • {group.gender} • {group.movement_type}
                            </span>
                          </td>
                          <td>₹{Number(group.mrp).toLocaleString()}</td>
                          <td>₹{Number(group.selling_price).toLocaleString()}</td>
                          {(user.role === 'admin' || user.role === 'manager') && (
                            <td style={{ color: 'var(--primary-gold)' }}>
                              ₹{Number(group.cost_price).toLocaleString()}
                              {group.discount_percent > 0 && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.3rem' }}>
                                  ({group.discount_percent}% off)
                                </span>
                              )}
                            </td>
                          )}
                          <td>{group.gst_rate}%</td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', alignItems: 'center' }}>
                              <span className="badge badge-info" style={{ fontWeight: 600 }}>{totalQty} Total</span>
                              {inStockQty > 0 && <span className="badge badge-success">{inStockQty} In Stock</span>}
                              {soldQty > 0 && <span className="badge badge-secondary">{soldQty} Sold</span>}
                              {otherQty > 0 && <span className="badge badge-warning">{otherQty} Other</span>}
                            </div>
                          </td>
                          <td onClick={e => e.stopPropagation()}>
                            <button 
                              onClick={() => setSelectedWatch(group.pieces[0])}
                              className="btn btn-secondary btn-sm"
                              title="View Group Photos"
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Nested Sub-table */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={user.role === 'sales' ? 8 : 9} style={{ padding: '0.75rem 1rem 1rem 2.5rem', background: 'rgba(212, 175, 55, 0.02)' }}>
                              <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-color)', padding: '0.75rem' }}>
                                <h4 style={{ fontSize: '0.85rem', margin: '0 0 0.5rem', color: 'var(--primary-gold)', fontWeight: 600 }}>
                                  Individual Pieces for {group.brand} {group.model}
                                </h4>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                                  <thead>
                                    <tr style={{ background: 'var(--surface-card)', borderBottom: '1px solid var(--border-color)' }}>
                                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Serial / Watch ID</th>
                                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Status</th>
                                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>MRP</th>
                                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Selling Price</th>
                                      {(user.role === 'admin' || user.role === 'manager') && <th style={{ padding: '0.5rem', textAlign: 'left' }}>Cost Price</th>}
                                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.pieces.map(piece => (
                                      <tr key={piece.id} style={{ borderBottom: '1px dashed var(--border-color)' }}>
                                        <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontWeight: 600 }}>{piece.id}</td>
                                        <td style={{ padding: '0.5rem' }}>
                                          <span className={`badge badge-${
                                            piece.status === 'in_stock' ? 'success' :
                                            piece.status === 'sold' ? 'info' :
                                            piece.status === 'refurbishing' ? 'warning' :
                                            piece.status === 'exchanged_returned' ? 'warning' : 'danger'
                                          }`} style={{ fontSize: '0.75rem' }}>
                                            {piece.status.replace('_', ' ')}
                                          </span>
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>₹{Number(piece.mrp).toLocaleString()}</td>
                                        <td style={{ padding: '0.5rem' }}>₹{Number(piece.selling_price).toLocaleString()}</td>
                                        {(user.role === 'admin' || user.role === 'manager') && (
                                          <td style={{ padding: '0.5rem', color: 'var(--primary-gold)' }}>₹{Number(piece.cost_price).toLocaleString()}</td>
                                        )}
                                        <td style={{ padding: '0.5rem' }}>
                                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                                            <button 
                                              onClick={() => setSelectedWatch(piece)}
                                              className="btn btn-secondary btn-sm"
                                              title="Photos & Details"
                                              style={{ padding: '0.2rem 0.4rem', height: '24px', minHeight: 'auto' }}
                                            >
                                              <Eye size={12} />
                                            </button>
                                            {(user.role === 'admin' || user.role === 'manager') && (
                                              <button 
                                                onClick={() => { setAdjustWatch(piece); setNewStatus(piece.status); }} 
                                                className="btn btn-secondary btn-sm"
                                                title="Adjust Status"
                                                style={{ padding: '0.2rem 0.4rem', height: '24px', minHeight: 'auto' }}
                                              >
                                                <Settings size={12} />
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={user.role === 'sales' ? 8 : 9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      No watch models match your filters or search terms.
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
