import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Header from '../components/Layout/Header';
import { Plus, Wrench, Calendar, ClipboardList, Printer, CheckCircle, UserCheck, Share2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PrintableInvoice from '../components/PrintableInvoice';
import { alertService } from '../utils/alert';
import Swal from 'sweetalert2';

const ServiceRepair = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [settings, setSettings] = useState(null);
  const [customerWatches, setCustomerWatches] = useState([]);
  
  const [registeredWatches, setRegisteredWatches] = useState([]);
  const [receivedDate, setReceivedDate] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; });
  const [jobs, setJobs] = useState([]);
  const [selectedJobsForCard, setSelectedJobsForCard] = useState(null); // Array of jobs to print on 1 job card
  const [showPreviewModal, setShowPreviewModal] = useState(false); // Modal for previewing intake cart

  // Service Delivery Invoice Modal state
  const [deliveryInvoice, setDeliveryInvoice] = useState(null);
  const [deliveryWhatsAppUrl, setDeliveryWhatsAppUrl] = useState(null);

  // Delivery checkout modal state (replaces multi-step SweetAlert)
  const [deliveryModalJob, setDeliveryModalJob] = useState(null);
  const [deliveryActualCost, setDeliveryActualCost] = useState('');
  const [deliveryPaymentMode, setDeliveryPaymentMode] = useState('cash');
  const [deliveryInvoiceType, setDeliveryInvoiceType] = useState('non-gst');
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);

  const handleOpenJobCardModal = (job, allJobsList = jobs) => {
    // Open exactly and only the selected Job Card to prevent confusing sister-job merging
    setSelectedJobsForCard([job]);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [hideDelivered, setHideDelivered] = useState(true);

  // Pagination for service tracker
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 5;

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

  // Calculate pagination
  const indexOfLastJob = currentPage * jobsPerPage;
  const indexOfFirstJob = indexOfLastJob - jobsPerPage;
  const currentJobs = filteredJobs.slice(indexOfFirstJob, indexOfLastJob);
  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, hideDelivered]);

  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const deliveredCount = safeJobs.filter(j => j?.status === 'delivered').length;
  const todayStr = new Date().toLocaleDateString('en-CA');
  const pendingRepairCount = safeJobs.filter(j => j?.status === 'received' || j?.status === 'in_repair').length;
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
      const normalizePhone = (p) => (p || '').replace(/\D/g, '').replace(/^91(\d{10})$/, '$1');
      const searchNorm = normalizePhone(custPhone);
      
      if (searchNorm.length >= 10) {
        const matched = (Array.isArray(customers) ? customers : []).find(c => normalizePhone(c.phone) === searchNorm);
        if (matched) {
          setCustName(matched.name);
          setSelectedCustomerId(matched.id);
        } else {
          setSelectedCustomerId('');
        }
      } else {
        setSelectedCustomerId('');
      }
    } else {
      setSelectedCustomerId('');
    }
  }, [custPhone, customers]);

  // Fetch customer's watch purchase history when customer is identified
  useEffect(() => {
    if (selectedCustomerId) {
      api.getCustomerHistory(selectedCustomerId)
        .then(sales => {
          const watches = [];
          sales.forEach(sale => {
            (sale.items || []).forEach(item => {
              if (item.watch) {
                // Prevent duplicates if a watch was somehow bought twice
                if (!watches.find(w => w.id === item.watch.id)) {
                  watches.push(item.watch);
                }
              }
            });
          });
          setCustomerWatches(watches);
        })
        .catch(err => console.error('Failed to fetch customer history', err));
    } else {
      setCustomerWatches([]);
    }
  }, [selectedCustomerId]);

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

    // If validation passes, show the preview modal instead of submitting immediately
    setShowPreviewModal(true);
  };

  const confirmSubmitIntake = async () => {
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
        createdJobs.push(result.job || result);
      }

      alertService.success('Job Registered!', `Successfully registered ${createdJobs.length} watch repair service job card(s).`);
      
      setShowPreviewModal(false);

      // Auto open printable job card modal for the first created job
      const freshJobs = await api.getServiceJobs();
      setJobs(freshJobs);
      const matched = freshJobs.find(j => j.id === createdJobs[0].id);
      handleOpenJobCardModal(matched || createdJobs[0]);

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
        const target = jobs.find(j => j.id === jobId);
        setDeliveryModalJob(target || { id: jobId });
        setDeliveryActualCost(target?.estimated_cost ? String(target.estimated_cost) : '');
        setDeliveryPaymentMode('cash');
        setDeliveryInvoiceType('non-gst');
        return;
      }

      await api.updateServiceJobStatus(jobId, nextStatus, null);
      alertService.success(
        'Status Updated',
        `Job Card status successfully updated to: ${nextStatus.toUpperCase().replace('_', ' ')}.`
      );
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: nextStatus } : j));
    } catch (err) {
      alertService.error('Update Failed', err.message || 'Failed to update job status.');
    }
  };

  const handleConfirmDelivery = async (e) => {
    e.preventDefault();
    if (!deliveryModalJob) return;

    const actualCost = Number(deliveryActualCost || 0);
    const payMode = deliveryPaymentMode || 'cash';
    const invoiceType = deliveryInvoiceType || 'non-gst';
    const jobId = deliveryModalJob.id;

    setIsSubmittingDelivery(true);
    try {
      const result = await api.addServiceBill(jobId, actualCost, payMode, invoiceType);
      const invoiceId = result.id || (result.sale ? result.sale.id : result);
      
      // Fetch full sale detail for printing and preview
      let fullSale = null;
      try {
        fullSale = await api.getSale(invoiceId);
      } catch (fetchErr) {
        fullSale = result.sale || null;
      }

      // Generate WhatsApp link for the service bill
      const targetJob = jobs.find(j => j.id === jobId) || deliveryModalJob;
      const custObj = fullSale?.customer || targetJob?.customer || {};
      const rawCustPhone = (custObj.phone || '').replace(/\D/g, '').replace(/^91(\d{10})$/, '$1');
      const phoneFormatted = rawCustPhone.length === 10 ? `91${rawCustPhone}` : rawCustPhone;
      const watchBrand = targetJob?.watch_id 
        ? (targetJob.watch?.brand || 'Watch') 
        : (targetJob?.watch_details?.brand || 'Watch Service');
      const watchModel = targetJob?.watch_id 
        ? (targetJob.watch?.model || '') 
        : (targetJob?.watch_details?.model || '');
      const watchName = `${watchBrand} ${watchModel}`.trim();

      const billWaText = `Dear ${custObj.name || 'Valued Customer'}, thank you for choosing *${settings?.store_name || 'Smart Times'}* for your watch service!\n\n📄 *Service Invoice: ${invoiceId}*\n• Job Card: *${jobId}*\n• Watch: ${watchName || 'Watch Service'}\n• Service Issue: "${targetJob?.issue_reported || 'Repair'}"\n\n💰 *Total Paid: ₹${actualCost.toLocaleString('en-IN')}*\nPayment Mode: ${payMode.toUpperCase()} (${invoiceType.toUpperCase()})\nWarranty: 6 Months Service Warranty\n\n🙏 Visit us again!\n– ${settings?.store_name || 'Smart Times'}, ${settings?.phone || ''}`;

      const billWaUrl = phoneFormatted.length >= 10 
        ? `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(billWaText)}` 
        : null;

      setDeliveryWhatsAppUrl(billWaUrl);
      setDeliveryInvoice(fullSale || {
        id: invoiceId,
        invoice_type: invoiceType,
        invoice_date: new Date().toISOString().split('T')[0],
        customer: custObj,
        user: user,
        subtotal: actualCost,
        net_amount: actualCost,
        payment_mode: payMode,
        items: [{
          watch_id: targetJob?.watch_id || `SERVICE-${jobId}`,
          watch: {
            brand: watchBrand,
            model: watchModel,
            hsn_code: invoiceType === 'gst' ? '998729' : null
          },
          price_sold: actualCost,
          gst_rate: invoiceType === 'gst' ? 18 : 0,
          gst_amount: invoiceType === 'gst' ? Math.round((actualCost - (actualCost / 1.18)) * 100) / 100 : 0
        }]
      });

      setDeliveryModalJob(null);
      loadData();
    } catch (err) {
      alertService.error('Delivery Failed', err.message || 'Failed to complete service delivery.');
    } finally {
      setIsSubmittingDelivery(false);
    }
  };

  const handlePrint = () => {
    // Print job card via dedicated window to preserve format cleanly
    const cardEl = document.querySelector('.job-card-print-container');
    if (!cardEl) {
      window.print();
      return;
    }
    const styleSheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(s => s.outerHTML).join('');
    const pw = window.open('', '_blank', 'width=900,height=700');
    pw.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>JobCard_${selectedJobsForCard?.[0]?.id || 'Service'}</title>${styleSheets}<style>
      html, body { height: auto !important; min-height: auto !important; overflow: visible !important; margin: 0; padding: 10mm; background: #fff !important; color: #000 !important; }
      @media print { html, body { height: auto !important; overflow: visible !important; padding: 0 !important; } .no-print { display: none !important; } }
    </style></head><body>${cardEl.outerHTML}</body></html>`);
    pw.document.close();
    pw.focus();
    setTimeout(() => { pw.print(); pw.close(); }, 350);
  };

  const handlePrintDeliveryBill = () => {
    // Print service delivery bill via isolated window so it is not hidden by .no-print
    const invoiceEl = document.querySelector('.smarttimes-printable-invoice');
    if (!invoiceEl) {
      window.print();
      return;
    }
    const styleSheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(s => s.outerHTML).join('');
    const pw = window.open('', '_blank', 'width=900,height=700');
    pw.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice_${deliveryInvoice?.id || 'Service_Bill'}</title>${styleSheets}<style>
      html, body { height: auto !important; min-height: auto !important; overflow: visible !important; margin: 0; padding: 0; background: #fff !important; color: #000 !important; }
      @media print { html, body { height: auto !important; overflow: visible !important; } .no-print { display: none !important; } }
    </style></head><body>${invoiceEl.outerHTML}</body></html>`);
    pw.document.close();
    pw.focus();
    setTimeout(() => { pw.print(); pw.close(); }, 350);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
      <Header searchPlaceholder="Search service jobs..." />
      <div className="page-container">
        <h1 className="page-title">Service & Repair / Warranty</h1>
        <p className="page-subtitle">Generate Job Cards and track repair progress.</p>

        {/* Statistics Panels */}
        {/* Top Service Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: '50%', background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
              <ClipboardList size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Pending Repair Jobs</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-gold)' }}>{pendingRepairCount}</div>
            </div>
          </div>

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
                        {customerWatches.length > 0 && (
                          <optgroup label={`Purchased by ${custName || 'Customer'}`}>
                            {customerWatches.map(w => (
                              <option key={w.id} value={w.id}>{w.brand} {w.model} (Serial: {w.id})</option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="All Sold Showroom Watches">
                          {registeredWatches
                            .filter(w => !customerWatches.find(cw => cw.id === w.id))
                            .map(w => (
                            <option key={w.id} value={w.id}>{w.brand} {w.model} (Serial: {w.id})</option>
                          ))}
                        </optgroup>
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
                Preview Service Job(s)
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
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {currentJobs.length > 0 ? (
                currentJobs.map(job => (
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
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No service jobs found matching your criteria.
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Showing {indexOfFirstJob + 1} to {Math.min(indexOfLastJob, filteredJobs.length)} of {filteredJobs.length} jobs
                </span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button 
                    onClick={() => handlePageChange(currentPage - 1)} 
                    disabled={currentPage === 1}
                    className="btn btn-secondary btn-sm"
                  >
                    Prev
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => handlePageChange(i + 1)}
                      className={`btn btn-sm ${currentPage === i + 1 ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.25rem 0.6rem' }}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button 
                    onClick={() => handlePageChange(currentPage + 1)} 
                    disabled={currentPage === totalPages}
                    className="btn btn-secondary btn-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
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
                    <p style={{ margin: 0, fontSize: '0.8rem' }}>Date: {selectedJobsForCard[0]?.created_at ? selectedJobsForCard[0].created_at.split('T')[0].split(' ')[0] : new Date().toISOString().split('T')[0]}</p>
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
                          {job.watch_id 
                            ? `${job.watch?.brand || 'Watch'} ${job.watch?.model || ''}`.trim() 
                            : `${job.watch_details?.brand || 'External Watch'} ${job.watch_details?.model || ''}`.trim()}
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

              <div style={{ fontSize: '0.7rem', color: '#444', lineHeight: 1.4, marginBottom: '2.5rem' }}>
                <p style={{ fontWeight: 700, margin: '0 0 0.2rem 0', fontSize: '0.75rem' }}>TERMS & SERVICE AGREEMENT:</p>
                1. Service repairs carry a 6 Months (180 Days) warranty period on replaced parts/labor.<br/>
                2. If water damage or tampering occurs, this service warranty is void.<br/>
                3. Please produce this card at delivery. Unclaimed items after 90 days are subject to disposal.
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', fontSize: '0.8rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px dashed #000', width: '150px', marginBottom: '0.2rem' }}></div>
                  Customer Signature
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px dashed #000', width: '150px', marginBottom: '0.2rem' }}></div>
                  Technician / Store Sign
                </div>
              </div>
              
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1rem', flexWrap: 'wrap' }}>
                <div>
                  {(() => {
                    const custObj = selectedJobsForCard[0]?.customer;
                    const rawCustPhone = (custObj?.phone || '').replace(/\D/g, '').replace(/^91(\d{10})$/, '$1');
                    const phoneFormatted = rawCustPhone.length === 10 ? `91${rawCustPhone}` : rawCustPhone;
                    const jcIds = selectedJobsForCard.map(j => j.id).join(', ');
                    const watchesSummary = selectedJobsForCard.map(j => {
                      const name = j.watch_id 
                        ? `${j.watch?.brand || 'Watch'} ${j.watch?.model || ''}`.trim() 
                        : `${j.watch_details?.brand || 'External Watch'} ${j.watch_details?.model || ''}`.trim();
                      const est = j.estimated_cost ? ` (Est: ₹${Number(j.estimated_cost).toLocaleString('en-IN')})` : '';
                      return `• *${j.id}*: ${name} — "${j.issue_reported}"${est}`;
                    }).join('\n');
                    const jcDate = selectedJobsForCard[0]?.created_at ? selectedJobsForCard[0].created_at.split('T')[0].split(' ')[0] : new Date().toISOString().split('T')[0];
                    const dueDate = selectedJobsForCard[0]?.expected_delivery_date || 'Informed via phone';

                    const jcWaText = `Dear ${custObj?.name || 'Customer'}, your Service Job Card has been registered at *${settings?.store_name || 'Smart Times'}*!\n\n📋 *Job Card: ${jcIds}*\nDate: ${jcDate}\nDue Date: ${dueDate}\n\n*Watches Registered:*\n${watchesSummary}\n\n📍 ${settings?.address || 'Smart Times Showroom'}\n📞 Helpline: ${settings?.phone || '97512 85945'}\n\n_Please retain this job card message at pickup._`;

                    const jcWaUrl = phoneFormatted.length >= 10 
                      ? `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(jcWaText)}` 
                      : null;

                    return jcWaUrl ? (
                      <a
                        href={jcWaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#25D366', color: '#fff', borderColor: '#25D366', textDecoration: 'none' }}
                      >
                        <Share2 size={16} /> Share Job Card on WhatsApp
                      </a>
                    ) : null;
                  })()}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={handlePrint} className="btn btn-primary" style={{ padding: '0.5rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Printer size={16} /> Print Job Card ({selectedJobsForCard.length} Watch)
                  </button>
                  <button onClick={() => setSelectedJobsForCard(null)} className="btn btn-secondary">
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Preview Cart Modal */}
        {showPreviewModal && (
          <div className="modal-overlay" style={{ zIndex: 1000 }}>
            <div className="modal-content" style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.4rem', color: 'var(--primary-gold)', margin: 0 }}>Review Intake Cart</h2>
                <button 
                  onClick={() => setShowPreviewModal(false)} 
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}
                >
                  &times;
                </button>
              </div>

              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '0.9rem' }}>Customer Information</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                  <div><span style={{ color: 'var(--text-secondary)' }}>Name:</span> {custName}</div>
                  <div><span style={{ color: 'var(--text-secondary)' }}>Phone:</span> {custPhone}</div>
                  <div><span style={{ color: 'var(--text-secondary)' }}>Status:</span> {selectedCustomerId ? <span style={{ color: 'var(--success)' }}>Existing CRM Profile</span> : <span style={{ color: 'var(--primary-gold)' }}>New Profile Will Be Created</span>}</div>
                  <div><span style={{ color: 'var(--text-secondary)' }}>Received:</span> {receivedDate}</div>
                </div>
              </div>

              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', fontSize: '0.9rem' }}>Watches in Service Cart ({watchesToService.length})</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                {watchesToService.map((watch, idx) => {
                  let watchName = '';
                  if (watch.isExternal) {
                    watchName = `${watch.externalBrand} ${watch.externalModel}`.trim() + ` (External, ${watch.externalGender})`;
                  } else {
                    const matchedWatch = registeredWatches.find(w => w.id === watch.selectedWatchId);
                    watchName = matchedWatch ? `${matchedWatch.brand} ${matchedWatch.model} (Serial: ${watch.selectedWatchId})` : 'Showroom Watch';
                  }

                  return (
                    <div key={idx} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                        <strong style={{ color: 'var(--primary-gold)', fontSize: '0.9rem' }}>Watch #{idx + 1}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Due: {watch.dueDate || 'N/A'}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gap: '0.4rem', fontSize: '0.85rem' }}>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>Model:</strong> {watchName}</div>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>Issue:</strong> {watch.issue}</div>
                        {watch.condition && <div><strong style={{ color: 'var(--text-secondary)' }}>Condition:</strong> {watch.condition}</div>}
                        <div><strong style={{ color: 'var(--text-secondary)' }}>Estimate:</strong> {watch.estimate ? `₹${watch.estimate}` : 'To be determined'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button 
                  onClick={() => setShowPreviewModal(false)} 
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '0.8rem' }}
                >
                  Edit Inputs
                </button>
                <button 
                  onClick={confirmSubmitIntake} 
                  className="btn btn-primary" 
                  style={{ flex: 1, padding: '0.8rem', fontWeight: 'bold' }}
                >
                  Confirm & Create Job Card
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Service Delivery & Billing Modal (Clean alignment & Explicit Fields) */}
        {deliveryModalJob && (
          <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="modal-content" style={{ maxWidth: '440px', padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={20} color="var(--primary-gold)" /> Deliver & Bill Service
                </h3>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-gold)', fontSize: '0.9rem' }}>
                  {deliveryModalJob.id}
                </span>
              </div>

              {/* Service Job Summary */}
              <div style={{ background: 'var(--surface-card)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Customer:</span>
                  <strong>{deliveryModalJob.customer?.name} ({deliveryModalJob.customer?.phone})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Watch:</span>
                  <span>{deliveryModalJob.watch_id ? `${deliveryModalJob.watch?.brand || ''} ${deliveryModalJob.watch?.model || ''}` : `${deliveryModalJob.watch_details?.brand || ''} ${deliveryModalJob.watch_details?.model || ''}`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Issue:</span>
                  <span>"{deliveryModalJob.issue_reported}"</span>
                </div>
                {deliveryModalJob.estimated_cost && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color)', paddingTop: '0.35rem', marginTop: '0.2rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Initial Estimate:</span>
                    <strong style={{ color: 'var(--primary-gold)' }}>₹{Number(deliveryModalJob.estimated_cost).toLocaleString('en-IN')}</strong>
                  </div>
                )}
              </div>

              <form onSubmit={handleConfirmDelivery} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Final Service Charges Input */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Amount to Collect from Customer (₹) *</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    placeholder="Enter amount in ₹"
                    value={deliveryActualCost}
                    onChange={e => setDeliveryActualCost(e.target.value)}
                    required
                    autoFocus
                    style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary-gold)' }}
                  />
                </div>

                {/* Payment Mode Selection */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Payment Mode *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    {[
                      { id: 'cash', label: 'Cash' },
                      { id: 'upi', label: 'UPI' },
                      { id: 'card', label: 'Card' }
                    ].map(mode => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setDeliveryPaymentMode(mode.id)}
                        className={`btn ${deliveryPaymentMode === mode.id ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.5rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Invoice Type Selection */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Invoice Type *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setDeliveryInvoiceType('non-gst')}
                      className={`btn ${deliveryInvoiceType === 'non-gst' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                      Non-GST / Plain Bill
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryInvoiceType('gst')}
                      className={`btn ${deliveryInvoiceType === 'gst' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                      GST Invoice (18%)
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setDeliveryModalJob(null)}
                    disabled={isSubmittingDelivery}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '0.65rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingDelivery}
                    className="btn btn-primary"
                    style={{ flex: 1.5, padding: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    {isSubmittingDelivery ? 'Processing...' : 'Confirm & Bill'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delivery Invoice & WhatsApp Modal */}
        {deliveryInvoice && (
          <div className="modal-overlay no-print" style={{ overflowY: 'auto', padding: '2rem 1rem', zIndex: 1100 }}>
            <div style={{ background: '#fff', borderRadius: '8px', maxWidth: '850px', margin: '0 auto', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', padding: '1rem' }}>
              <PrintableInvoice
                invoice={deliveryInvoice}
                storeSettings={settings}
                currentUser={user}
                waUrl={deliveryWhatsAppUrl}
                onPrint={handlePrintDeliveryBill}
                onClose={() => { setDeliveryInvoice(null); setDeliveryWhatsAppUrl(null); }}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ServiceRepair;
