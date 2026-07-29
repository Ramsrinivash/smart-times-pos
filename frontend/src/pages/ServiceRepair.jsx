import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Header from '../components/Layout/Header';
import { Plus, Wrench, Calendar, ClipboardList, Printer, CheckCircle, UserCheck } from 'lucide-react';
import { alertService } from '../utils/alert';
import Swal from 'sweetalert2';

const ServiceRepair = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [settings, setSettings] = useState(null);
  
  const [registeredWatches, setRegisteredWatches] = useState([]);
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [jobs, setJobs] = useState([]);
  const [selectedJobsForCard, setSelectedJobsForCard] = useState(null); // Array of jobs to print on 1 job card

  const handleOpenJobCardModal = (job) => {
    // Find sister jobs for same customer on same received date to print together on 1 page
    const sisterJobs = safeJobs.filter(j => 
      (j.customer_id === job.customer_id || j.customer?.phone === job.customer?.phone) && 
      j.received_date === job.received_date
    );
    setSelectedJobsForCard(sisterJobs.length > 0 ? sisterJobs : [job]);
  };

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
      externalGender: 'Unisex',
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
        externalGender: 'Unisex',
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

  const filteredJobs = (Array.isArray(jobs) ? jobs : []).filter(job => {
    if (!job) return false;
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
                         String(job.id || '').toLowerCase().includes(query);
    const matchesStatus = !statusFilter || jobStatus === statusFilter;
    const matchesHide = !hideDelivered || jobStatus !== 'delivered';

    return matchesQuery && matchesStatus && matchesHide;
  });

  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const deliveredCount = safeJobs.filter(j => j?.status === 'delivered').length;
  const todayStr = new Date().toLocaleDateString('en-CA');
  const readyTodayCount = safeJobs.filter(j => j?.status !== 'delivered' && j?.expected_delivery_date === todayStr).length;
  const overdueCount = safeJobs.filter(j => j?.status !== 'delivered' && j?.expected_delivery_date && j?.expected_delivery_date < todayStr).length;
  const totalReadyCount = safeJobs.filter(j => j?.status === 'ready').length;

  const loadData = async () => {
    try {
      const custs = await api.getCustomers();
      setCustomers(Array.isArray(custs) ? custs : []);

      const items = await api.getInventory('', 'sold');
      setRegisteredWatches(Array.isArray(items) ? items : []);

      const serviceJobs = await api.getServiceJobs();
      setJobs(Array.isArray(serviceJobs) ? serviceJobs : []);

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
      const matched = (Array.isArray(customers) ? customers : []).find(c => c && (c.phone || '').trim() === custPhone.trim());
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
      alertService.warning('Required Fields', 'Please fill out customer name and phone.');
      return;
    }

    // Validate each watch details
    for (let i = 0; i < watchesToService.length; i++) {
      const w = watchesToService[i];
      if ((!w.isExternal && !w.selectedWatchId) || (w.isExternal && !w.externalBrand) || !w.issue) {
        alertService.warning('Required Fields', `Please fill out all mandatory fields (Brand/Watch ID and Issue) for Watch #${i + 1}.`);
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
          watch_details: w.isExternal ? { brand: w.externalBrand, model: w.externalModel, gender: w.externalGender || 'Unisex' } : null,
          issue_reported: w.issue,
          drop_off_condition: w.condition,
          estimated_cost: w.estimate || null,
          expected_delivery_date: w.dueDate || null,
          received_date: receivedDate
        };

        const result = await api.addServiceJob(payload);
        createdJobs.push(result);
      }

      alertService.success('Job Registered!', `Successfully registered ${createdJobs.length} watch repair service job card(s).`);

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
          externalGender: 'Unisex',
          issue: '',
          condition: '',
          estimate: '',
          dueDate: ''
        }
      ]);
      loadData();
    } catch (err) {
      alertService.error('Error', err.message || 'Failed to create job card.');
    }
  };

  const handleUpdateStatus = async (jobId, nextStatus) => {
    try {
      if (nextStatus === 'delivered') {
        const { value: inputCost } = await Swal.fire({
          title: 'Delivering Service',
          text: 'Enter final service charges to collect from customer (₹):',
          input: 'number',
          inputLabel: 'Amount in ₹',
          inputValue: '0',
          showCancelButton: true,
          confirmButtonText: 'Proceed',
          cancelButtonText: 'Cancel',
          background: 'var(--surface-color)',
          color: 'var(--text-primary)',
          confirmButtonColor: 'var(--primary-gold)',
          cancelButtonColor: 'var(--border-color)',
          buttonsStyling: false,
          width: '360px',
          customClass: {
            popup: 'swal2-custom-popup',
            title: 'swal2-custom-title',
            htmlContainer: 'swal2-custom-html',
            confirmButton: 'btn btn-primary swal-btn-margin',
            cancelButton: 'btn btn-secondary swal-btn-margin',
            input: 'form-control'
          }
        });
        if (inputCost === undefined || inputCost === null) return;
        const actualCost = Number(inputCost || 0);

        const payModeChoice = await Swal.fire({
          title: 'Payment Mode',
          text: 'How was the payment received?',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'UPI / Card',
          cancelButtonText: 'Cash',
          background: 'var(--surface-color)',
          color: 'var(--text-primary)',
          confirmButtonColor: 'var(--primary-gold)',
          cancelButtonColor: 'var(--border-color)',
          buttonsStyling: false,
          width: '360px',
          customClass: {
            popup: 'swal2-custom-popup',
            title: 'swal2-custom-title',
            htmlContainer: 'swal2-custom-html',
            confirmButton: 'btn btn-primary swal-btn-margin',
            cancelButton: 'btn btn-secondary swal-btn-margin'
          }
        });
        const payMode = payModeChoice.isConfirmed ? 'upi' : 'cash';

        // Fix #11: Ask invoice type — GST or non-GST
        const invoiceTypeChoice = await Swal.fire({
          title: 'Invoice Type',
          text: 'Does this customer require a GST invoice?',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'GST Invoice',
          cancelButtonText: 'Non-GST / Plain Bill',
          background: 'var(--surface-color)',
          color: 'var(--text-primary)',
          confirmButtonColor: 'var(--primary-gold)',
          cancelButtonColor: 'var(--border-color)',
          buttonsStyling: false,
          width: '380px',
          customClass: {
            popup: 'swal2-custom-popup',
            title: 'swal2-custom-title',
            htmlContainer: 'swal2-custom-html',
            confirmButton: 'btn btn-primary swal-btn-margin',
            cancelButton: 'btn btn-secondary swal-btn-margin'
          }
        });
        const invoiceType = invoiceTypeChoice.isConfirmed ? 'gst' : 'non-gst';

        const result = await api.addServiceBill(jobId, actualCost, payMode, invoiceType);
        alertService.success(
          'Service Delivered!',
          `Service billed and delivered successfully. Bill Invoice No: ${result.id || result}. Total collected: ₹${actualCost.toLocaleString()}.`
        );
        loadData();
        return;
      }

      await api.updateServiceJobStatus(jobId, nextStatus, null);
      alertService.success(
        'Status Updated',
        `Job Card status successfully updated to: ${nextStatus.toUpperCase().replace('_', ' ')}.`
      );
      loadData();
    } catch (err) {
      alertService.error('Update Failed', err.message || 'Failed to update job status.');
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

        {/* Statistics Panels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', color: 'var(--success)' }}>
              <Wrench size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Due Today</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{readyTodayCount}</div>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: '50%', background: 'rgba(239,68,68,0.15)', color: 'var(--error)' }}>
              <Calendar size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Overdue Repair Jobs</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: overdueCount > 0 ? 'var(--error)' : 'var(--text-primary)' }}>{overdueCount}</div>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: '50%', background: 'rgba(212,175,55,0.15)', color: 'var(--primary-gold)' }}>
              <CheckCircle size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Total Ready (Pending Pickup)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-gold)' }}>{totalReadyCount}</div>
            </div>
          </div>
        </div>

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
                        <label className="form-label">Watch Gender *</label>
                        <select 
                          className="form-control" 
                          value={watch.externalGender || 'Unisex'} 
                          onChange={e => handleWatchToServiceChange(index, 'externalGender', e.target.value)}
                          required
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Unisex">Unisex</option>
                        </select>
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
                {hideDelivered ? `Show Delivered (${deliveredCount})` : 'Hide Delivered'}
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
                    <p style={{ fontSize: '0.85rem', margin: '0.2rem 0' }}>
                      Due Date: <strong style={{ color: job.status !== 'delivered' && job.expected_delivery_date && job.expected_delivery_date < todayStr ? 'var(--error)' : 'inherit' }}>
                        {job.expected_delivery_date || 'N/A'}
                      </strong>
                      {job.expected_delivery_date && job.expected_delivery_date < todayStr && job.status !== 'delivered' && (
                        <span className="badge badge-danger" style={{ marginLeft: '0.5rem', fontSize: '0.65rem', padding: '0.1rem 0.3rem' }}>OVERDUE</span>
                      )}
                    </p>
                    
                    {job.estimated_cost && <p style={{ fontSize: '0.85rem', color: 'var(--primary-gold)', margin: '0.2rem 0' }}>Estimate: ₹{Number(job.estimated_cost).toLocaleString()}</p>}
                    
                    {/* Status modifications */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', flexWrap: 'wrap' }}>
                      {(job.status === 'received' || job.status === 'in_repair') && (
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
                        onClick={() => handleOpenJobCardModal(job)} 
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

        {/* Printable Job Card Modal (Single Page Print for 1 or Multiple Watches) */}
        {selectedJobsForCard && selectedJobsForCard.length > 0 && (
          <div className="modal-overlay">
            <div className="modal-content printable-area job-card-print-container" style={{ maxWidth: '800px', background: '#ffffff', color: '#000000', padding: '1.5rem', boxSizing: 'border-box' }}>
              <style>{`
                @media print {
                  body {
                    background: #ffffff !important;
                    color: #000000 !important;
                  }
                  .job-card-print-container {
                    width: 210mm !important;
                    max-width: 210mm !important;
                    height: auto !important;
                    max-height: 297mm !important;
                    border: none !important;
                    box-sizing: border-box !important;
                    padding: 10mm !important;
                    page-break-after: avoid !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                }
              `}</style>
              
              <div style={{ borderBottom: '2px solid #333', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ color: '#d4af37', fontSize: '1.5rem', margin: 0, fontWeight: 800 }}>{settings?.store_name || 'SMART TIMES'}</h2>
                    <h4 style={{ margin: '0.1rem 0 0', color: '#444', fontSize: '0.85rem' }}>Service & Repair Department</h4>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: '#555' }}>
                      {settings?.address || '108, Pennagaram Main Road, (Next to R.C. Church), DHARMAPURI - 636 701.'}
                    </p>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#111', fontWeight: 700 }}>
                      Call: {settings?.phone || '97512 85945, 86672 88021'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <h3 style={{ margin: 0, textTransform: 'uppercase', color: '#333', fontSize: '1.2rem' }}>Service Job Card</h3>
                    <p style={{ margin: '0.1rem 0', fontWeight: 700, fontSize: '0.85rem' }}>
                      JC #: {selectedJobsForCard.map(j => j.id).join(', ')}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8rem' }}>Date: {selectedJobsForCard[0]?.received_date || new Date().toISOString().split('T')[0]}</p>
                  </div>
                </div>
              </div>

              {/* Customer Profile Banner */}
              <div style={{ padding: '0.5rem 0.75rem', background: '#f8f8f8', borderRadius: '4px', border: '1px solid #ddd', marginBottom: '0.85rem', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div><strong>Customer:</strong> {selectedJobsForCard[0]?.customer?.name}</div>
                <div><strong>Phone:</strong> {selectedJobsForCard[0]?.customer?.phone}</div>
                <div><strong>Total Items:</strong> {selectedJobsForCard.length} Watch(es)</div>
              </div>

              {/* Itemized Watches Table for Single Page Print */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0.85rem', fontSize: '0.8rem', border: '1px solid #ddd' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0', borderBottom: '1.5px solid #333' }}>
                    <th style={{ padding: '0.4rem 0.5rem', textAlign: 'left', width: '25px' }}>#</th>
                    <th style={{ padding: '0.4rem 0.5rem', textAlign: 'left', width: '90px' }}>JC No.</th>
                    <th style={{ padding: '0.4rem 0.5rem', textAlign: 'left' }}>Watch Model & Details</th>
                    <th style={{ padding: '0.4rem 0.5rem', textAlign: 'left' }}>Issue & Condition</th>
                    <th style={{ padding: '0.4rem 0.5rem', textAlign: 'right', width: '85px' }}>Est. Cost</th>
                    <th style={{ padding: '0.4rem 0.5rem', textAlign: 'right', width: '95px' }}>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedJobsForCard.map((job, idx) => (
                    <tr key={job.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.45rem 0.5rem', fontWeight: 700 }}>{idx + 1}</td>
                      <td style={{ padding: '0.45rem 0.5rem', fontFamily: 'monospace', fontWeight: 700 }}>{job.id}</td>
                      <td style={{ padding: '0.45rem 0.5rem' }}>
                        <div style={{ fontWeight: 700 }}>
                          {job.watch_id ? `${job.watch?.brand} ${job.watch?.model}` : `${job.watch_details?.brand} ${job.watch_details?.model}`}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#555' }}>
                          {job.watch_id ? `Serial: ${job.watch_id}` : `Gender: ${job.watch_details?.gender || 'Unisex'}`}
                        </div>
                      </td>
                      <td style={{ padding: '0.45rem 0.5rem' }}>
                        <div>"{job.issue_reported}"</div>
                        {job.drop_off_condition && <div style={{ fontSize: '0.72rem', color: '#666' }}>Condition: {job.drop_off_condition}</div>}
                      </td>
                      <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right', fontWeight: 700, color: '#d4af37' }}>
                        {job.estimated_cost ? `₹${Number(job.estimated_cost).toLocaleString()}` : '—'}
                      </td>
                      <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right' }}>
                        {job.expected_delivery_date || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ borderTop: '1px solid #ccc', paddingTop: '0.5rem', fontSize: '0.72rem', color: '#555' }}>
                <h5 style={{ margin: '0 0 0.2rem 0', textTransform: 'uppercase', fontSize: '0.75rem' }}>Terms & Service Agreement:</h5>
                <p style={{ margin: '0.1rem 0' }}>1. Service repairs carry a 6 Months (180 Days) warranty period on replaced parts/labor.</p>
                <p style={{ margin: '0.1rem 0' }}>2. If water damage or tampering occurs, this service warranty is void.</p>
                <p style={{ margin: '0.1rem 0' }}>3. Please produce this card at delivery. Unclaimed items after 90 days are subject to disposal.</p>
              </div>

              {/* Signatures Section */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', fontSize: '0.75rem' }}>
                <div style={{ borderTop: '1px dashed #333', width: '140px', textAlign: 'center', paddingTop: '0.2rem' }}>
                  Customer Signature
                </div>
                <div style={{ borderTop: '1px dashed #333', width: '140px', textAlign: 'center', paddingTop: '0.2rem' }}>
                  Technician / Store Sign
                </div>
              </div>

              <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.25rem', borderTop: '1px solid #eee', paddingTop: '0.75rem' }}>
                <button onClick={handlePrint} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Printer size={16} /> Print Job Card ({selectedJobsForCard.length} Watch{selectedJobsForCard.length > 1 ? 'es' : ''})
                </button>
                <button onClick={() => setSelectedJobsForCard(null)} className="btn btn-secondary">
                  Close
                </button>
              </div>

            </div>
          </div>
        )}

        {/* SweetAlert Custom Modal Overlay replaced with sweetalert2 */}
      </div>
    </div>
  );
};

export default ServiceRepair;
