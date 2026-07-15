import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Header from '../components/Layout/Header';
import { Plus, Wrench, Calendar, ClipboardList, Printer, CheckCircle, UserCheck } from 'lucide-react';

const ServiceRepair = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [settings, setSettings] = useState(null);
  
  const [registeredWatches, setRegisteredWatches] = useState([]);
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [jobs, setJobs] = useState([]);
  const [selectedJobForCard, setSelectedJobForCard] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [hideDelivered, setHideDelivered] = useState(true);

  // Dynamic list of watches to service
  const [watchesToService, setWatchesToService] = useState([
    {
      isExternal: false,
      selectedWatchId: '',
      externalBrand: '',
      externalModel: '',
      externalSerial: '',
      issue: '',
      condition: '',
      estimate: '',
      dueDate: ''
    }
  ]);

  const handleAddWatchToService = () => {
    setWatchesToService([
      ...watchesToService,
      {
        isExternal: false,
        selectedWatchId: '',
        externalBrand: '',
        externalModel: '',
        externalSerial: '',
        issue: '',
        condition: '',
        estimate: '',
        dueDate: ''
      }
    ]);
  };

  const handleRemoveWatchFromService = (index) => {
    setWatchesToService(watchesToService.filter((_, idx) => idx !== index));
  };

  const handleWatchToServiceChange = (index, field, value) => {
    const next = [...watchesToService];
    next[index][field] = value;
    setWatchesToService(next);
  };

  const filteredJobs = jobs.filter(job => {
    const custNameField = job.customer?.name?.toLowerCase() || '';
    const custPhoneField = job.customer?.phone || '';
    const watchId = job.watch_id?.toLowerCase() || '';
    const extSerial = job.watch_details?.serial?.toLowerCase() || '';
    const jobStatus = job.status || '';
    const query = searchQuery.toLowerCase();

    const matchesQuery = custNameField.includes(query) || 
                         custPhoneField.includes(query) || 
                         watchId.includes(query) || 
                         extSerial.includes(query) || 
                         job.id.toLowerCase().includes(query);
    const matchesStatus = !statusFilter || jobStatus === statusFilter;
    const matchesHide = !hideDelivered || jobStatus !== 'delivered';

    return matchesQuery && matchesStatus && matchesHide;
  });

  const deliveredCount = jobs.filter(j => j.status === 'delivered').length;

  const loadData = async () => {
    try {
      const custs = await api.getCustomers();
      setCustomers(custs);

      const items = await api.getInventory('', 'sold');
      setRegisteredWatches(items);

      const serviceJobs = await api.getServiceJobs();
      setJobs(serviceJobs);

      const s = await api.getSettings();
      setSettings(s);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // CRM customer auto-lookup by phone
  useEffect(() => {
    if (custPhone.length >= 10) {
      const matched = customers.find(c => c.phone.trim() === custPhone.trim());
      if (matched) {
        setCustName(matched.name);
        setSelectedCustomerId(matched.id);
      } else {
        setSelectedCustomerId('');
      }
    } else {
      setSelectedCustomerId('');
    }
  }, [custPhone, customers]);

  const handleSubmitIntake = async (e) => {
    e.preventDefault();
    if (!custName || !custPhone) {
      alert('Please fill out customer name and phone.');
      return;
    }

    // Validate each watch details
    for (let i = 0; i < watchesToService.length; i++) {
      const w = watchesToService[i];
      if ((!w.isExternal && !w.selectedWatchId) || (w.isExternal && !w.externalBrand) || !w.issue) {
        alert(`Please fill out all mandatory fields (Brand/Watch ID and Issue) for Watch #${i + 1}.`);
        return;
      }
    }

    try {
      let finalCustomerId = selectedCustomerId;
      if (!finalCustomerId) {
        // Automatically register customer in CRM first
        const newCust = await api.addCustomer({ name: custName, phone: custPhone });
        finalCustomerId = newCust.customer ? newCust.customer.id : newCust.id;
      }

      const createdJobs = [];
      for (const w of watchesToService) {
        const payload = {
          customer_id: finalCustomerId,
          watch_id: w.isExternal ? null : w.selectedWatchId,
          watch_details: w.isExternal ? { brand: w.externalBrand, model: w.externalModel, serial: w.externalSerial } : null,
          issue_reported: w.issue,
          drop_off_condition: w.condition,
          estimated_cost: w.estimate || null,
          expected_delivery_date: w.dueDate || null,
          received_date: receivedDate
        };

        const result = await api.addServiceJob(payload);
        createdJobs.push(result);
      }

      alert(`Successfully created ${createdJobs.length} Service Job Card(s).`);

      // Auto open printable job card modal for the first created job
      const freshJobs = await api.getServiceJobs();
      setJobs(freshJobs);
      const matched = freshJobs.find(j => j.id === createdJobs[0].id);
      setSelectedJobForCard(matched || createdJobs[0]);

      // Reset form
      setCustName('');
      setCustPhone('');
      setSelectedCustomerId('');
      setWatchesToService([
        {
          isExternal: false,
          selectedWatchId: '',
          externalBrand: '',
          externalModel: '',
          externalSerial: '',
          issue: '',
          condition: '',
          estimate: '',
          dueDate: ''
        }
      ]);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to create job card.');
    }
  };

  const handleUpdateStatus = async (jobId, nextStatus) => {
    try {
      if (nextStatus === 'delivered') {
        const inputCost = prompt('Enter final service charges to collect from customer (₹):');
        if (inputCost === null) return;
        const actualCost = Number(inputCost || 0);

        const payMode = window.confirm('Payment received via UPI/Card? Click OK for UPI, Cancel for Cash.') ? 'upi' : 'cash';
        const result = await api.addServiceBill(jobId, actualCost, payMode);
        alert(`✅ Service delivered!\nBill Invoice: ${result.id}\nAmount: ₹${actualCost.toLocaleString()}\nPoints credited to customer.`);
        loadData();
        return;
      }

      await api.updateServiceJobStatus(jobId, nextStatus, null);
      alert(`Job status updated to: ${nextStatus.replace('_', ' ')}`);
      loadData();
    } catch (err) {
      alert(err.message || 'Status update failed.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
      <Header searchPlaceholder="Search service jobs..." />
      <div className="page-container">
        <h1 className="page-title">Service & Repair / Warranty</h1>
        <p className="page-subtitle">Generate Job Cards and track repair progress.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '1.5rem', flexWrap: 'wrap' }}>
          
          {/* Service Intake Form */}
          <div className="card">
            <h3 style={{ marginBottom: '1.25rem' }}>Repair Intake Form</h3>
            <form onSubmit={handleSubmitIntake} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Customer Details Form */}
              <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--surface-card)' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--primary-gold)', margin: 0 }}>Customer Info *</h4>
                
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Phone Number *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. 9876543210" 
                    value={custPhone} 
                    onChange={e => setCustPhone(e.target.value)} 
                    required 
                  />
                </div>
                
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Customer Name *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Customer Name" 
                    value={custName} 
                    onChange={e => setCustName(e.target.value)} 
                    required 
                  />
                </div>

                {custPhone.length >= 10 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--primary-gold-glow)', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <UserCheck size={12} />
                      {selectedCustomerId ? 'Registered CRM Profile' : 'New CRM Profile'}
                    </span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Received Date *</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={receivedDate} 
                  onChange={e => setReceivedDate(e.target.value)} 
                  required 
                />
              </div>

              {watchesToService.map((watch, index) => (
                <div key={index} style={{ border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--surface-card)', marginBottom: '1rem', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--primary-gold)', margin: 0 }}>Watch #{index + 1} Details</h4>
                    {watchesToService.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveWatchFromService(index)}
                        className="btn btn-danger btn-sm"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input 
                        type="checkbox" 
                        checked={watch.isExternal} 
                        onChange={e => handleWatchToServiceChange(index, 'isExternal', e.target.checked)} 
                      />
                      External Watch (Not purchased from showroom)
                    </label>
                  </div>

                  {watch.isExternal ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderLeft: '3px solid var(--primary-gold)', paddingLeft: '0.75rem', marginTop: '0.5rem' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Brand Name *</label>
                        <input type="text" className="form-control" placeholder="e.g. Tissot" value={watch.externalBrand} onChange={e => handleWatchToServiceChange(index, 'externalBrand', e.target.value)} required />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Model Name</label>
                        <input type="text" className="form-control" placeholder="e.g. Le Locle" value={watch.externalModel} onChange={e => handleWatchToServiceChange(index, 'externalModel', e.target.value)} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Serial / Watch ID</label>
                        <input type="text" className="form-control" placeholder="e.g. TS-8902" value={watch.externalSerial} onChange={e => handleWatchToServiceChange(index, 'externalSerial', e.target.value)} />
                      </div>
                    </div>
                  ) : (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Select Sold Showroom Watch *</label>
                      <select 
                        className="form-control"
                        value={watch.selectedWatchId}
                        onChange={e => handleWatchToServiceChange(index, 'selectedWatchId', e.target.value)}
                        required
                      >
                        <option value="">-- Choose Watch --</option>
                        {registeredWatches.map(w => (
                          <option key={w.id} value={w.id}>{w.brand} {w.model} (Serial: {w.id})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Issue Reported *</label>
                    <textarea 
                      className="form-control" 
                      rows="2" 
                      placeholder="Describe the complaint..." 
                      value={watch.issue}
                      onChange={e => handleWatchToServiceChange(index, 'issue', e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Drop-off Condition / Physical Checks</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Scratches on bezel, missing link" 
                      value={watch.condition}
                      onChange={e => handleWatchToServiceChange(index, 'condition', e.target.value)}
                    />
                  </div>

                  <div className="form-row" style={{ margin: 0 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Estimated Cost (₹)</label>
                      <input type="number" className="form-control" placeholder="Estimate" value={watch.estimate} onChange={e => handleWatchToServiceChange(index, 'estimate', e.target.value)} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Expected Date</label>
                      <input type="date" className="form-control" value={watch.dueDate} onChange={e => handleWatchToServiceChange(index, 'dueDate', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddWatchToService}
                className="btn btn-secondary"
                style={{ width: '100%', marginBottom: '1rem', border: '1px dashed var(--primary-gold)', color: 'var(--primary-gold)' }}
              >
                + Add Another Watch to Service
              </button>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Create Job Card(s)
              </button>
            </form>
          </div>

          {/* Active Services List */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ClipboardList size={18} /> Service Tracker
            </h3>

            {/* Service Search & Filters */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <input 
                type="text" 
                className="form-control" 
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }} 
                placeholder="Search by customer name, phone, serial or JC number..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <select
                className="form-control"
                style={{ width: '130px', fontSize: '0.85rem', padding: '0.4rem' }}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="received">Received</option>
                <option value="in_repair">In Repair</option>
                <option value="ready">Ready</option>
                <option value="delivered">Delivered</option>
              </select>
              <button
                onClick={() => setHideDelivered(h => !h)}
                className={`btn ${hideDelivered ? 'btn-secondary' : 'btn-primary'}`}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}
                title={hideDelivered ? 'Show delivered jobs' : 'Hide delivered jobs'}
              >
                {hideDelivered ? `Show Delivered (${deliveredCount})` : '🙈 Hide Delivered'}
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '600px' }}>
              {filteredJobs.length > 0 ? (
                filteredJobs.map(job => (
                  <div key={job.id} style={{ background: 'var(--surface-card)', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>JC: {job.id}</span>
                      <span className={`badge badge-${
                        job.status === 'received' ? 'danger' :
                        job.status === 'in_repair' ? 'warning' :
                        job.status === 'ready' ? 'success' : 'info'
                      }`}>
                        {job.status.replace('_', ' ')}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.9rem', margin: '0.2rem 0' }}>Customer: <strong>{job.customer?.name}</strong> ({job.customer?.phone})</p>
                    <p style={{ fontSize: '0.9rem', margin: '0.2rem 0' }}>
                      Watch: <strong>
                        {job.watch_id ? `${job.watch?.brand} ${job.watch?.model}` : `${job.watch_details?.brand} ${job.watch_details?.model}`}
                      </strong>
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.4rem 0' }}>Issue: "{job.issue_reported}"</p>
                    
                    {job.estimated_cost && <p style={{ fontSize: '0.85rem', color: 'var(--primary-gold)' }}>Estimate: ₹{Number(job.estimated_cost).toLocaleString()}</p>}
                    
                    {/* Status modifications */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', flexWrap: 'wrap' }}>
                      {job.status === 'received' && (
                        <button onClick={() => handleUpdateStatus(job.id, 'in_repair')} className="btn btn-secondary btn-sm">
                          Start Repair
                        </button>
                      )}
                      {job.status === 'in_repair' && (
                        <button onClick={() => handleUpdateStatus(job.id, 'ready')} className="btn btn-secondary btn-sm" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
                          Mark Ready
                        </button>
                      )}
                      {job.status === 'ready' && (
                        <button onClick={() => handleUpdateStatus(job.id, 'delivered')} className="btn btn-primary btn-sm">
                          Deliver & Cash-In
                        </button>
                      )}
                      
                      <button 
                        onClick={() => setSelectedJobForCard(job)} 
                        className="btn btn-secondary btn-sm"
                        style={{ border: '1px solid var(--border-color)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Printer size={12} /> Job Card
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No service jobs registered.</p>
              )}
            </div>
          </div>

        </div>

        {/* Printable Job Card Modal */}
        {selectedJobForCard && (
          <div className="modal-overlay">
            <div className="modal-content printable-area" style={{ maxWidth: '750px', background: '#ffffff', color: '#000000', padding: '2.5rem' }}>
              
              <div style={{ borderBottom: '2px solid #333', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ color: '#d4af37', fontSize: '1.8rem', margin: 0 }}>{settings?.store_name || 'SMART TIMES'}</h2>
                    <h4 style={{ margin: '0.1rem 0 0', color: '#444' }}>Service & Repair Department</h4>
                    <p style={{ margin: '0.1rem 0', fontSize: '0.8rem', color: '#555' }}>
                      {settings?.address || '108, Pennagaram Main Road, (Next to R.C. Chruch), DHARMAPURI - 636 701.'} • Call: {settings?.phone || '97512 85945, 86672 88021'} • {settings?.email || 'info@smarttimes.in'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <h3 style={{ margin: 0, textTransform: 'uppercase', color: '#333' }}>Service Job Card</h3>
                    <p style={{ margin: '0.1rem 0', fontWeight: 600 }}>JC Number: {selectedJobForCard.id}</p>
                    <p style={{ margin: 0 }}>Date: {selectedJobForCard.received_date || new Date().toISOString().split('T')[0]}</p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <div style={{ borderRight: '1px solid #ddd', paddingRight: '1.5rem' }}>
                  <h4 style={{ textTransform: 'uppercase', color: '#666', marginBottom: '0.4rem' }}>Customer Profile:</h4>
                  <p style={{ margin: '0.1rem 0', fontWeight: 600 }}>{selectedJobForCard.customer?.name}</p>
                  <p style={{ margin: '0.1rem 0' }}>Phone: {selectedJobForCard.customer?.phone}</p>
                  {selectedJobForCard.customer?.address && (
                    <p style={{ margin: '0.1rem 0' }}>{selectedJobForCard.customer.address}</p>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h4 style={{ textTransform: 'uppercase', color: '#666', marginBottom: '0.4rem' }}>Watch Description:</h4>
                  <p style={{ margin: '0.1rem 0' }}>
                    Watch: <strong>
                      {selectedJobForCard.watch_id 
                        ? `${selectedJobForCard.watch?.brand} ${selectedJobForCard.watch?.model}` 
                        : `${selectedJobForCard.watch_details?.brand} ${selectedJobForCard.watch_details?.model}`
                      }
                    </strong>
                  </p>
                  <p style={{ margin: '0.1rem 0' }}>
                    Serial: {selectedJobForCard.watch_id || selectedJobForCard.watch_details?.serial || 'N/A'}
                  </p>
                </div>
              </div>

              <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                <p style={{ margin: '0.25rem 0' }}><strong>Job Status:</strong> {selectedJobForCard.status.toUpperCase()}</p>
                <p style={{ margin: '0.25rem 0' }}><strong>Issue Reported:</strong> "{selectedJobForCard.issue_reported}"</p>
                {selectedJobForCard.drop_off_condition && <p style={{ margin: '0.25rem 0' }}><strong>Physical Condition:</strong> {selectedJobForCard.drop_off_condition}</p>}
                {selectedJobForCard.estimated_cost && <p style={{ margin: '0.25rem 0', color: '#d4af37', fontWeight: 600 }}><strong>Estimated Charges:</strong> ₹{Number(selectedJobForCard.estimated_cost).toLocaleString()}</p>}
                {selectedJobForCard.expected_delivery_date && <p style={{ margin: '0.25rem 0' }}><strong>Expected Delivery:</strong> {selectedJobForCard.expected_delivery_date}</p>}
              </div>

              <div style={{ borderTop: '1px solid #ccc', paddingTop: '1rem', fontSize: '0.75rem', color: '#666' }}>
                <h5 style={{ margin: '0 0 0.25rem 0', textTransform: 'uppercase' }}>Terms & Service Agreement:</h5>
                <p style={{ margin: '0.1rem 0' }}>1. Repairs are warrantied for 90 days from hand-over date.</p>
                <p style={{ margin: '0.1rem 0' }}>2. Please produce this card at delivery. Unclaimed items after 30 days are subject to storage fees.</p>
              </div>

              <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                <button onClick={handlePrint} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Printer size={16} /> Print Job Card
                </button>
                <button onClick={() => setSelectedJobForCard(null)} className="btn btn-secondary">
                  Close
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceRepair;
