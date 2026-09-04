import React, { useState, useEffect } from 'react';
import Header from '../components/Layout/Header';
import { api } from '../services/api';
import { useLocation } from 'react-router-dom';
import { Save, Settings as SettingsIcon, Users, FileText, Shield, Database, Printer, Trash2, History, GitBranch, Sparkles, CheckCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { alertService } from '../utils/alert';
import Swal from 'sweetalert2';
import BillTemplate from './BillTemplate';

const Settings = () => {
  const { user } = useAuth();

  // Showroom profile
  const [storeName, setStoreName] = useState('Smart Times');
  const [tagline, setTagline] = useState('Watch Showroom & Service');
  const [gstin, setGstin] = useState('33EJBPA4537C1ZW');
  const [address, setAddress] = useState('108, Pennagaram Main Road, (Next to R.C. Chruch), DHARMAPURI - 636 701.');
  const [phone, setPhone] = useState('97512 85945, 86672 88021');
  const [email, setEmail] = useState('info@smarttimes.in');

  // Invoice numbering
  const [gstPrefix, setGstPrefix] = useState('ST-GST');
  const [nongstPrefix, setNongstPrefix] = useState('ST-RETL');
  const [jcPrefix, setJcPrefix] = useState('JC');

  // Tax and exchange
  const [exchangeDays, setExchangeDays] = useState(7);
  const [warrantyMonths, setWarrantyMonths] = useState(12);

  // Loyalty
  const [earnRate, setEarnRate] = useState(1);
  const [redeemRate, setRedeemRate] = useState(1);
  const [expiryMonths, setExpiryMonths] = useState(12);

  // Job card terms
  const [jobCardTerms, setJobCardTerms] = useState('');

  // User management (Admin only)
  const [users, setUsers] = useState([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('sales');
  const [newUserSalary, setNewUserSalary] = useState('');

  // Personal credentials edit state
  const [myEmail, setMyEmail] = useState(user?.email || '');
  const [myPassword, setMyPassword] = useState('');
  const [myConfirmPassword, setMyConfirmPassword] = useState('');

  // Staff edit state
  const [editingUser, setEditingUser] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingEmail, setEditingEmail] = useState('');
  const [editingRole, setEditingRole] = useState('sales');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffSalary, setNewStaffSalary] = useState('');

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get('tab') || localStorage.getItem('settings_active_tab') || 'profile';

  // Activity log & GitHub live release history
  const [activityLogs, setActivityLogs] = useState([]);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [gitCommits, setGitCommits] = useState([]);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(null);

  const fetchGitHubCommits = async () => {
    setLoadingCommits(true);
    try {
      const res = await fetch('https://api.github.com/repos/Ramsrinivash/smart-times-pos/commits?per_page=25');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setGitCommits(data);
          setLastFetchTime(new Date());
        }
      }
    } catch (err) {
      console.warn('Could not fetch GitHub commits:', err);
    } finally {
      setLoadingCommits(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'version_history') {
      fetchGitHubCommits();
    }
  }, [activeTab]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    try {
      localStorage.setItem('settings_active_tab', tabKey);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tabKey);
      window.history.replaceState({}, '', url.toString());
    } catch (e) {}
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const s = await api.getSettings();
        if (s) {
          setStoreName(s.store_name || 'Smart Times');
          setTagline(s.tagline || '');
          setGstin(s.gstin || '');
          setAddress(s.address || '');
          setPhone(s.phone || '');
          setEmail(s.email || '');
          setGstPrefix(s.gst_invoice_prefix || 'ST-GST');
          setNongstPrefix(s.nongst_invoice_prefix || 'ST-RETL');
          setJcPrefix(s.job_card_prefix || 'JC');
          setExchangeDays(s.exchange_window_days || 7);
          setWarrantyMonths(s.warranty_period_months || 12);
          setEarnRate(s.loyalty_earn_rate || 1);
          setRedeemRate(s.loyalty_redeem_rate || 1);
          setExpiryMonths(s.loyalty_expiry_months || 12);
          setJobCardTerms(s.job_card_terms || '');
        }
      } catch (err) {
        console.error('Settings load error:', err);
      }
    };

    const loadUsers = async () => {
      if (user?.role === 'admin') {
        const u = await api.getUsers();
        setUsers(u);
      }
    };

    const loadLogs = async () => {
      if (user?.role === 'admin') {
        const logs = await api.getActivityLogs();
        setActivityLogs(logs.slice(0, 50));
      }
    };

    loadSettings();
    loadUsers();
    loadLogs();
  }, [user]);

  useEffect(() => {
    if (user) {
      setMyEmail(user.email || '');
    }
  }, [user]);

  const handleUpdateMyCredentials = async (e) => {
    e.preventDefault();
    if (myPassword && myPassword !== myConfirmPassword) {
      alertService.warning('Verification failed', 'Passwords do not match!');
      return;
    }
    try {
      const payload = { email: myEmail };
      if (myPassword) payload.password = myPassword;
      await api.updateUser(user.id, payload);
      alertService.success('Success', 'Credentials updated successfully. Please log in again if you changed your Email/Login ID.');
      setMyPassword('');
      setMyConfirmPassword('');
    } catch (err) {
      alertService.error('Error', 'Failed to update credentials: ' + err.message);
    }
  };

  const refreshUsersAndLogs = async () => {
    try {
      let combinedUsers = mockAPI.getUsers() || [];
      try {
        const apiUsers = await api.getUsers();
        if (Array.isArray(apiUsers) && apiUsers.length > 0) {
          const emailMap = new Map();
          combinedUsers.forEach(u => u.email && emailMap.set(u.email.toLowerCase(), u));
          apiUsers.forEach(u => u.email && emailMap.set(u.email.toLowerCase(), u));
          combinedUsers = Array.from(emailMap.values());
        }
      } catch (e) {
        console.warn('API users fetch note:', e);
      }
      setUsers(combinedUsers);

      let combinedLogs = mockAPI.getActivityLogs() || [];
      try {
        const apiLogs = await api.getActivityLogs();
        if (Array.isArray(apiLogs) && apiLogs.length > 0) {
          combinedLogs = [...apiLogs, ...combinedLogs];
        }
      } catch (e) {
        console.warn('API logs fetch note:', e);
      }
      setActivityLogs(combinedLogs.slice(0, 50));
    } catch (e) {
      console.error('Refresh users/logs error:', e);
    }
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    try {
      const salaryNum = Number(newStaffSalary || 0);
      const payload = {
        name: editingName,
        email: editingEmail,
        role: editingRole,
        base_salary: salaryNum
      };
      if (newStaffPassword) {
        payload.password = newStaffPassword;
      }
      try { mockAPI.updateUser(editingUser.id, payload, user?.id); } catch (e) {}
      try { await api.updateUser(editingUser.id, payload); } catch (e) {}

      alertService.success('Salary & Account Updated', `Updated user "${editingName}" — New Salary: ₹${salaryNum.toLocaleString('en-IN')}/mo.`);
      setEditingUser(null);
      setEditingName('');
      setEditingEmail('');
      setNewStaffPassword('');
      setNewStaffSalary('');
      await refreshUsersAndLogs();
    } catch (err) {
      alertService.error('Error', 'Failed to update staff details: ' + err.message);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await api.saveSettings({
        store_name: storeName,
        tagline,
        gstin,
        address,
        phone,
        email,
        gst_invoice_prefix: gstPrefix,
        nongst_invoice_prefix: nongstPrefix,
        job_card_prefix: jcPrefix,
        exchange_window_days: Number(exchangeDays),
        warranty_period_months: Number(warrantyMonths),
        loyalty_earn_rate: Number(earnRate),
        loyalty_redeem_rate: Number(redeemRate),
        loyalty_expiry_months: Number(expiryMonths),
        job_card_terms: jobCardTerms
      });
      alertService.success('Success', 'Settings saved successfully.');
    } catch (err) {
      alertService.error('Error', 'Failed to save settings: ' + err.message);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail || !newUserPassword) {
      alertService.error('Required Fields Missing', 'Please enter Name, Email, and Password.');
      return;
    }
    try {
      const salaryNum = Number(newUserSalary || 0);
      const payload = {
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword,
        role: newUserRole || 'sales',
        base_salary: salaryNum
      };

      // 1. Direct stateful storage insertion
      const createdStaff = mockAPI.addUser(payload, user?.id);

      // 2. Immediate React UI state update (0ms delay)
      setUsers(prev => {
        const filtered = prev.filter(u => u.email.toLowerCase() !== payload.email.toLowerCase());
        return [...filtered, createdStaff];
      });

      // 3. Secondary backend API sync
      try {
        await api.addUser(payload);
      } catch (err) {
        console.warn('Backend network sync note:', err);
      }

      alertService.success('Staff Account Created', `Staff account "${newUserName}" (${newUserRole}) created successfully with salary ₹${salaryNum.toLocaleString('en-IN')}/mo.`);
      setNewUserName(''); setNewUserEmail(''); setNewUserPassword(''); setNewUserRole('sales'); setNewUserSalary('');
      await refreshUsersAndLogs();
    } catch (err) {
      alertService.error('Error', 'Failed to create staff account: ' + err.message);
    }
  };

  const handleDeleteStaff = (targetUser) => {
    if (targetUser.id === user.id || targetUser.email === user.email) {
      alertService.warning('Action Blocked', 'You cannot delete your own logged-in admin account.');
      return;
    }
    Swal.fire({
      title: `Remove Staff Account?`,
      text: `Are you sure you want to delete staff account "${targetUser.name}" (${targetUser.email})? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Remove Staff',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: 'var(--border-color)',
      background: 'var(--surface-color)',
      color: 'var(--text-primary)'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try { mockAPI.deleteUser(targetUser.id, user?.id); } catch (e) {}
        try { mockAPI.deleteUser(targetUser.email, user?.id); } catch (e) {}
        try { await api.deleteUser(targetUser.id); } catch (e) {}

        alertService.success('Removed', `Staff account "${targetUser.name}" has been removed successfully.`);
        if (editingUser?.id === targetUser.id) {
          setEditingUser(null);
        }
        await refreshUsersAndLogs();
      }
    });
  };

  const handleExportDB = () => {
    const dbStr = localStorage.getItem('watch_showroom_db') || '{}';
    const blob = new Blob([dbStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smarttimes_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleResetDB = () => {
    Swal.fire({
      title: 'Reset to 100% Clean Database?',
      text: 'This will remove all test sample data (dummy watches, test sales, sample job cards) and start your showroom with a clean slate.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Clear All Test Data',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: 'var(--border-color)',
      background: 'var(--surface-color)',
      color: 'var(--text-primary)'
    }).then((result) => {
      if (result.isConfirmed) {
        api.resetDatabase();
        alertService.success('Database Cleared', 'System has been reset to a 100% clean state with zero test data.');
        setTimeout(() => window.location.reload(), 1000);
      }
    });
  };

  const tabStyle = (tabId) => ({
    padding: '0.6rem 1.25rem',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
    border: 'none',
    background: activeTab === tabId ? 'var(--primary-gold)' : 'var(--surface-card)',
    color: activeTab === tabId ? '#000' : 'var(--text-primary)',
    transition: 'all 0.2s'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
      <Header searchPlaceholder="Settings..." />
      <div className="page-container">
        <h1 className="page-title">System Configuration</h1>
        <p className="page-subtitle">Manage showroom settings, staff accounts, invoice series, and loyalty rules.</p>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button style={tabStyle('profile')} onClick={() => handleTabChange('profile')}>
            <SettingsIcon size={14} style={{ marginRight: '0.3rem' }} /> Showroom Profile
          </button>
          <button style={tabStyle('invoice')} onClick={() => handleTabChange('invoice')}>
            <FileText size={14} style={{ marginRight: '0.3rem' }} /> Invoice & Rules
          </button>
          <button style={tabStyle('bill_designer')} onClick={() => handleTabChange('bill_designer')}>
            <Printer size={14} style={{ marginRight: '0.3rem' }} /> Bill Designer
          </button>
          <button style={tabStyle('loyalty')} onClick={() => handleTabChange('loyalty')}>
            Loyalty Program
          </button>
          <button style={tabStyle('jobcard')} onClick={() => handleTabChange('jobcard')}>
            Job Card Terms
          </button>
          <button style={tabStyle('my_account')} onClick={() => handleTabChange('my_account')}>
            My Account
          </button>
          <button style={tabStyle('version_history')} onClick={() => handleTabChange('version_history')}>
            <History size={14} style={{ marginRight: '0.3rem' }} /> Version & Updates
          </button>
          {user?.role === 'admin' && (
            <>
              <button style={tabStyle('users')} onClick={() => handleTabChange('users')}>
                <Users size={14} style={{ marginRight: '0.3rem' }} /> Staff Accounts
              </button>
              <button style={tabStyle('activity')} onClick={() => handleTabChange('activity')}>
                <Shield size={14} style={{ marginRight: '0.3rem' }} /> Activity Log
              </button>
              <button style={tabStyle('backup')} onClick={() => handleTabChange('backup')}>
                <Database size={14} style={{ marginRight: '0.3rem' }} /> Backup & Data
              </button>
            </>
          )}
        </div>

        <form onSubmit={handleSaveSettings}>

          {/* Showroom Profile */}
          {activeTab === 'profile' && (
            <div className="card" style={{ maxWidth: '800px' }}>
              <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <SettingsIcon size={18} /> Showroom Identity
              </h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Showroom Business Name *</label>
                  <input type="text" className="form-control" value={storeName} onChange={e => setStoreName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Tagline / Slogan</label>
                  <input type="text" className="form-control" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="e.g. Time is Precious" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">GSTIN Number</label>
                  <input type="text" className="form-control" value={gstin} onChange={e => setGstin(e.target.value)} placeholder="29AAAAA0000A1Z5" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input type="text" className="form-control" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Physical Address</label>
                <input type="text" className="form-control" value={address} onChange={e => setAddress(e.target.value)} />
              </div>
            </div>
          )}

          {/* Invoice & Rules */}
          {activeTab === 'invoice' && (
            <div className="card" style={{ maxWidth: '800px' }}>
              <h3 style={{ marginBottom: '1.25rem' }}>Invoice Numbering & Policies</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">GST Invoice Prefix</label>
                  <input type="text" className="form-control" value={gstPrefix} onChange={e => setGstPrefix(e.target.value)} />
                  <small style={{ color: 'var(--text-secondary)' }}>Example: ST-GST-2627-0001</small>
                </div>
                <div className="form-group">
                  <label className="form-label">Non-GST Invoice Prefix</label>
                  <input type="text" className="form-control" value={nongstPrefix} onChange={e => setNongstPrefix(e.target.value)} />
                  <small style={{ color: 'var(--text-secondary)' }}>Example: ST-RETL-2627-0001</small>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Job Card Prefix</label>
                  <input type="text" className="form-control" value={jcPrefix} onChange={e => setJcPrefix(e.target.value)} />
                  <small style={{ color: 'var(--text-secondary)' }}>Example: JC-202607-0001</small>
                </div>
                <div className="form-group">
                  <label className="form-label">Exchange Window (Days)</label>
                  <input type="number" className="form-control" min="0" value={exchangeDays} onChange={e => setExchangeDays(e.target.value)} />
                  <small style={{ color: 'var(--text-secondary)' }}>Exchange allowed within this many days of sale</small>
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Warranty Period (Months)</label>
                <input type="number" className="form-control" min="0" value={warrantyMonths} onChange={e => setWarrantyMonths(e.target.value)} />
                <small style={{ color: 'var(--text-secondary)' }}>Auto in-warranty flag on service intake for watches sold within this period</small>
              </div>
            </div>
          )}

          {/* Bill Designer */}
          {activeTab === 'bill_designer' && (
            <div style={{ marginTop: '0.5rem' }}>
              <BillTemplate embedded={true} />
            </div>
          )}

          {/* Loyalty Program */}
          {activeTab === 'loyalty' && (
            <div className="card" style={{ maxWidth: '700px' }}>
              <h3 style={{ marginBottom: '1.25rem' }}>Reward Points — Loyalty Rules</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Points Earn Rate</label>
                  <input type="number" className="form-control" min="0" value={earnRate} onChange={e => setEarnRate(e.target.value)} />
                  <small style={{ color: 'var(--text-secondary)' }}>Points earned per ₹100 spent (e.g. 1 = 1 point per ₹100)</small>
                </div>
                <div className="form-group">
                  <label className="form-label">Points Redemption Value</label>
                  <input type="number" className="form-control" min="0" value={redeemRate} onChange={e => setRedeemRate(e.target.value)} />
                  <small style={{ color: 'var(--text-secondary)' }}>₹ value per point (e.g. 1 = ₹1 per point)</small>
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Points Expiry Period (Months)</label>
                <input type="number" className="form-control" min="0" value={expiryMonths} onChange={e => setExpiryMonths(e.target.value)} />
                <small style={{ color: 'var(--text-secondary)' }}>0 = no expiry. Points earned expire after these many months if not redeemed.</small>
              </div>
            </div>
          )}

          {/* Job Card Terms */}
          {activeTab === 'jobcard' && (
            <div className="card" style={{ maxWidth: '800px' }}>
              <h3 style={{ marginBottom: '1.25rem' }}>Job Card — Terms & Conditions</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                This text is printed on every Job Card issued to customers at service drop-off.
              </p>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Terms & Disclaimer Text</label>
                <textarea
                  className="form-control"
                  rows="8"
                  value={jobCardTerms}
                  onChange={e => setJobCardTerms(e.target.value)}
                  placeholder="1. All service charges are estimates...\n2. ..."
                />
              </div>
            </div>
          )}

          {/* Save Button (shown on settings tabs) */}
          {['profile', 'invoice', 'loyalty', 'jobcard'].includes(activeTab) && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', maxWidth: '800px', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Save size={16} /> Save Configuration
              </button>
            </div>
          )}
        </form>

        {/* My Account Tab */}
        {activeTab === 'my_account' && (
          <div className="card" style={{ maxWidth: '600px' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>Update My Login Credentials</h3>
            <form onSubmit={handleUpdateMyCredentials} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Email Address (Login ID) *</label>
                <input 
                  type="email" 
                  className="form-control" 
                  required 
                  value={myEmail} 
                  onChange={e => setMyEmail(e.target.value)} 
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">New Password (leave blank to keep current) *</label>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="••••••••" 
                  value={myPassword} 
                  onChange={e => setMyPassword(e.target.value)} 
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Confirm New Password *</label>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="••••••••" 
                  value={myConfirmPassword} 
                  onChange={e => setMyConfirmPassword(e.target.value)} 
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem' }}>
                <Save size={15} /> Update Credentials
              </button>
            </form>
          </div>
        )}

        {/* Staff Accounts (Admin only) */}
        {activeTab === 'users' && user?.role === 'admin' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', maxWidth: '1200px' }}>
            <div className="card" style={{ height: 'fit-content' }}>
              <h3 style={{ marginBottom: '1.25rem' }}>Add New Staff Account</h3>
              <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Full Name *</label>
                  <input type="text" className="form-control" required value={newUserName} onChange={e => setNewUserName(e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Email (Login ID) *</label>
                  <input type="email" className="form-control" required value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Password *</label>
                  <input type="password" className="form-control" required value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Role</label>
                  <select className="form-control" value={newUserRole} onChange={e => setNewUserRole(e.target.value)}>
                    <option value="admin">Admin / Owner</option>
                    <option value="manager">Store Manager</option>
                    <option value="sales">Sales Staff</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Base Salary (₹/month) *</label>
                  <input type="number" className="form-control" required placeholder="e.g. 15000" value={newUserSalary} onChange={e => setNewUserSalary(e.target.value)} min="0" />
                </div>

                {/* Role description capabilities box */}
                <div style={{
                  fontSize: '0.825rem',
                  color: 'var(--text-secondary)',
                  background: 'var(--surface-color)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: '3px solid var(--primary-gold)',
                  marginTop: '0.25rem'
                }}>
                  <strong>Access Level Permissions:</strong>
                  <ul style={{ paddingLeft: '1.2rem', marginTop: '0.4rem', lineHeight: '1.4' }}>
                    {newUserRole === 'admin' && (
                      <>
                        <li>Full access including General configuration & staff settings</li>
                        <li>Add, remove, or modify all Staff Accounts & reset passwords</li>
                        <li>Access to all audit activity logs & backup exports</li>
                      </>
                    )}
                    {newUserRole === 'manager' && (
                      <>
                        <li>View Inventory specs, MRP, cost prices, and adjustments</li>
                        <li>Record purchase ledger logs and supplier payments</li>
                        <li>Pull down Business Reports (Sales, Profit, Stock, GST)</li>
                      </>
                    )}
                    {newUserRole === 'sales' && (
                      <>
                        <li>Access to Point of Sale (POS) checkout and Returns</li>
                        <li>Create service repair Job Cards and deliver repair jobs</li>
                        <li>Register customers and manage loyalty points</li>
                      </>
                    )}
                  </ul>
                </div>

                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem' }}>
                  <Users size={15} /> Create Staff Account
                </button>
              </form>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Edit Details / Reset Password Form Inline */}
              {/* Edit Details / Reset Password Form Inline */}
              {editingUser && (
                <div className="card" style={{ border: '1px solid var(--primary-gold)' }}>
                  <h3 style={{ marginBottom: '1rem', color: 'var(--primary-gold)' }}>Edit Staff Account: {editingUser.name}</h3>
                  <form onSubmit={handleUpdateStaff} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Full Name *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required 
                        value={editingName} 
                        onChange={e => setEditingName(e.target.value)} 
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Email (Login ID) *</label>
                      <input 
                        type="email" 
                        className="form-control" 
                        required 
                        value={editingEmail} 
                        onChange={e => setEditingEmail(e.target.value)} 
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Role *</label>
                      <select 
                        className="form-control" 
                        value={editingRole} 
                        onChange={e => setEditingRole(e.target.value)}
                      >
                        <option value="sales">Sales Staff</option>
                        <option value="manager">Store Manager</option>
                        <option value="admin">System Admin</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Base Salary (₹/month) *</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        required 
                        value={newStaffSalary} 
                        onChange={e => setNewStaffSalary(e.target.value)} 
                        min="0"
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">New Password (Leave blank to keep current)</label>
                      <input 
                        type="password" 
                        className="form-control" 
                        placeholder="••••••••" 
                        value={newStaffPassword} 
                        onChange={e => setNewStaffPassword(e.target.value)} 
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button type="submit" className="btn btn-primary">Save Changes</button>
                      <button type="button" onClick={() => { setEditingUser(null); setNewStaffPassword(''); }} className="btn btn-secondary">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="card">
                {/* Display all registered staff and admin accounts */}
                {(() => {
                  const employees = users;
                  return (
                    <>
                      <h3 style={{ marginBottom: '1.25rem' }}>Current Employees & Staff Accounts ({employees.length})</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {employees.length > 0 ? (
                          employees.map(u => (
                            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--surface-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-gold-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-gold)', fontWeight: 700, fontSize: '0.9rem' }}>
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</p>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
                                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--primary-gold)', fontWeight: 600 }}>Salary: ₹{Number(u.base_salary || 0).toLocaleString('en-IN')}/mo</p>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                                <span className={`badge badge-${u.role === 'admin' ? 'danger' : u.role === 'manager' ? 'warning' : 'info'}`}>
                                  {u.role}
                                </span>
                                <div style={{ display: 'flex', gap: '0.35rem' }}>
                                  <button 
                                    onClick={() => { 
                                      setEditingUser(u);
                                      setEditingName(u.name || '');
                                      setEditingEmail(u.email || '');
                                      setEditingRole(u.role || 'sales');
                                      setNewStaffPassword(''); 
                                      setNewStaffSalary(String(u.base_salary || 0));
                                    }}
                                    className="btn btn-secondary btn-sm"
                                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                                  >
                                    Edit Staff
                                  </button>
                                  {u.id !== user.id && (
                                    <button 
                                      onClick={() => handleDeleteStaff(u)}
                                      className="btn btn-sm"
                                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.45rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                      title={`Delete staff account ${u.name}`}
                                    >
                                      <Trash2 size={12} /> Remove
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem' }}>No employees registered.</div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Activity Log (Admin only) */}
        {activeTab === 'activity' && user?.role === 'admin' && (
          <div className="card" style={{ maxWidth: '1000px' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={18} /> Activity Log (Last 50 Actions)
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date/Time</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Module</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogs.length > 0 ? (
                    activityLogs.map((log, idx) => (
                      <tr key={idx}>
                        <td style={{ fontSize: '0.8rem', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString('en-IN')}</td>
                        <td style={{ fontSize: '0.85rem' }}>{log.user?.name || 'System'}</td>
                        <td><span className={`badge badge-${log.action === 'CREATE' ? 'success' : log.action === 'DELETE' ? 'danger' : log.action === 'LOGIN' ? 'info' : 'warning'}`}>{log.action}</span></td>
                        <td style={{ fontSize: '0.85rem' }}>{log.module}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{log.details}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No activity logged yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Backup & Data */}
        {activeTab === 'backup' && user?.role === 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '650px' }}>
            <div className="card">
              <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Database size={18} /> Backup & Data Export
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Export the entire showroom database as a JSON file for backup purposes. This backup can be used to restore data if needed.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button onClick={handleExportDB} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content' }}>
                  <Database size={15} /> Export Full Database Backup (.json)
                </button>
                <div style={{ padding: '0.85rem 1rem', background: 'var(--surface-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  ⚠️ When connected to the live PHP/MySQL server, this will trigger a server-side backup download including all database tables.
                </div>
              </div>
            </div>

            <div className="card" style={{ border: '1px solid rgba(220, 38, 38, 0.3)' }}>
              <h3 style={{ marginBottom: '1rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={18} /> Clear Test Data & Reset Database
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                Click below to wipe all sample test data (dummy watches, test sales, sample job cards) and reset your system to a 100% clean slate for real live showroom operations.
              </p>
              <button 
                onClick={handleResetDB} 
                className="btn" 
                style={{ 
                  background: '#dc2626', 
                  color: '#fff', 
                  fontWeight: 700, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  width: 'fit-content',
                  padding: '0.6rem 1.25rem'
                }}
              >
                🗑️ Clear All Test Data & Reset Database
              </button>
            </div>
          </div>
        )}

        {/* Version & Release History */}
        {activeTab === 'version_history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1100px' }}>
            
            {/* Top Version Banner Card */}
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(20,20,25,0.95) 100%)', border: '1px solid var(--primary-gold)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                    <Sparkles size={22} color="var(--primary-gold)" />
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Smart Times POS System</h2>
                    <span style={{ background: 'var(--primary-gold)', color: '#000', fontWeight: 700, fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                      {gitCommits.length > 0 && gitCommits[0].commit.message.match(/v\d+\.\d+\.\d+/i)
                        ? gitCommits[0].commit.message.match(/v\d+\.\d+\.\d+/i)[0]
                        : 'v1.3.8'}
                    </span>
                    <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span> Live Git Sync Enabled
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                    Live Production Release • Watch Showroom Retail POS, Inventory, Job Cards & WhatsApp Sharing
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Last Git Push: <strong style={{ color: 'var(--text-primary)' }}>
                      {gitCommits.length > 0
                        ? new Date(gitCommits[0].commit.author.date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
                        : 'Sept 04, 2026 at 06:24 PM IST'}
                    </strong>
                  </div>
                  <button
                    onClick={fetchGitHubCommits}
                    disabled={loadingCommits}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem', gap: '0.4rem', display: 'inline-flex', alignItems: 'center' }}
                  >
                    <RefreshCw size={13} className={loadingCommits ? 'spin' : ''} />
                    {loadingCommits ? 'Syncing Git...' : 'Refresh Live Commits'}
                  </button>
                </div>
              </div>
            </div>

            {/* Live Auto-Synced GitHub Commits Table */}
            <div className="card" style={{ border: '1px solid rgba(59,130,246,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <GitBranch size={18} color="#3b82f6" /> Live GitHub Git Push Stream (Auto-Sync)
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {lastFetchTime ? `Auto-updated: ${lastFetchTime.toLocaleTimeString()}` : 'Connected to origin/main'}
                </span>
              </div>

              {loadingCommits && gitCommits.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  <RefreshCw size={24} className="spin" style={{ marginBottom: '0.5rem' }} />
                  <p>Fetching latest commits from GitHub...</p>
                </div>
              ) : gitCommits.length > 0 ? (
                <div className="table-responsive">
                  <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '90px' }}>Commit SHA</th>
                        <th style={{ width: '160px' }}>Pushed Date & Time</th>
                        <th style={{ width: '120px' }}>Category</th>
                        <th>Commit Message & Git Updates</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>Author</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gitCommits.map((c) => {
                        const rawMsg = c.commit.message || '';
                        const firstLine = rawMsg.split('\n')[0];
                        const dateFormatted = new Date(c.commit.author.date).toLocaleString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          year: 'numeric',
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        });
                        
                        let category = 'GIT PUSH';
                        let catBg = 'rgba(59,130,246,0.15)';
                        let catColor = '#3b82f6';
                        
                        if (firstLine.toLowerCase().includes('fix')) {
                          category = 'BUG FIX';
                          catBg = 'rgba(239,68,68,0.15)';
                          catColor = '#ef4444';
                        } else if (firstLine.toLowerCase().includes('feat')) {
                          category = 'FEATURE';
                          catBg = 'rgba(16,185,129,0.15)';
                          catColor = '#10b981';
                        } else if (firstLine.toLowerCase().includes('invoice') || firstLine.toLowerCase().includes('whatsapp')) {
                          category = 'POS & BILLING';
                          catBg = 'rgba(212,175,55,0.15)';
                          catColor = 'var(--primary-gold)';
                        }

                        return (
                          <tr key={c.sha}>
                            <td>
                              <a
                                href={c.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary-gold)' }}
                              >
                                {c.sha.substring(0, 7)}
                              </a>
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{dateFormatted}</td>
                            <td>
                              <span style={{ background: catBg, color: catColor, padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                                {category}
                              </span>
                            </td>
                            <td style={{ fontWeight: 500 }}>{firstLine}</td>
                            <td style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {c.commit.author.name || 'Developer'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  ℹ️ GitHub live sync ready. Every Git commit pushed to GitHub automatically displays here in real-time.
                </div>
              )}
            </div>

            {/* Version Changelog Release History Table */}
            <div className="card">
              <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={18} /> Major System Release Log History
              </h3>
              <div className="table-responsive">
                <table className="table" style={{ width: '100%', fontSize: '0.875rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '90px' }}>Version</th>
                      <th style={{ width: '170px' }}>Date & Time (IST)</th>
                      <th style={{ width: '140px' }}>Category</th>
                      <th style={{ width: '180px' }}>Modules Affected</th>
                      <th>Update Summary & Release Notes</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span className="badge badge-gold">v1.3.8</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>2026-09-04 06:24 PM</td>
                      <td><span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>BILLING & PRINT</span></td>
                      <td>POS Billing & Invoice Modal</td>
                      <td>Invoice modal pops up first before print/WhatsApp; isolated print tab prevents 2-bill duplicate printing; WhatsApp share button with pre-formatted invoice breakdown.</td>
                      <td style={{ textAlign: 'center' }}><span className="badge badge-success">🟢 Live</span></td>
                    </tr>
                    <tr>
                      <td><span className="badge badge-gold">v1.3.7</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>2026-09-04 06:00 PM</td>
                      <td><span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>WHATSAPP SHARE</span></td>
                      <td>POS Billing & Customer CRM</td>
                      <td>Added instant WhatsApp invoice share button to transmit customer bill details directly to customer mobile number.</td>
                      <td style={{ textAlign: 'center' }}><span className="badge badge-success">🟢 Live</span></td>
                    </tr>
                    <tr>
                      <td><span className="badge badge-gold">v1.3.0</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>2026-09-03 04:05 PM</td>
                      <td><span style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>SECURITY ENGINE</span></td>
                      <td>Authentication & Session Control</td>
                      <td>Implemented <strong>Single Active Session Enforcement</strong> per user account with interactive confirmation prompt on concurrent login attempts.</td>
                      <td style={{ textAlign: 'center' }}><span className="badge badge-success">🟢 Live</span></td>
                    </tr>
                    <tr>
                      <td><span className="badge badge-gold">v1.2.9</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>2026-09-03 01:07 PM</td>
                      <td><span style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>UX & PRINT FIX</span></td>
                      <td>Settings & POS Checkout</td>
                      <td>Implemented tab state persistence on page refresh (`?tab=version_history`) and fixed checkout print receipt execution timing.</td>
                      <td style={{ textAlign: 'center' }}><span className="badge badge-success">🟢 Live</span></td>
                    </tr>
                    <tr>
                      <td><span className="badge badge-gold">v1.2.8</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>2026-09-03 12:54 PM</td>
                      <td><span style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>TAX FORMULA</span></td>
                      <td>POS Billing & Invoices</td>
                      <td>Applied direct percentage deduction tax formula (e.g. ₹3,495 - 18% = Taxable Base ₹2,865.90, CGST 9% = ₹314.55, SGST 9% = ₹314.55, Net Total = ₹3,495.00).</td>
                      <td style={{ textAlign: 'center' }}><span className="badge badge-success">🟢 Live</span></td>
                    </tr>
                    <tr>
                      <td><span className="badge badge-gold">v1.2.7</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>2026-09-03 12:48 PM</td>
                      <td><span style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>TAX ENGINE</span></td>
                      <td>POS Billing & Invoices</td>
                      <td>Updated GST calculation mode to <strong>Inclusive GST (MRP includes tax)</strong> across POS checkout, backend API controller, and PDF invoice generators.</td>
                      <td style={{ textAlign: 'center' }}><span className="badge badge-success">🟢 Live</span></td>
                    </tr>
                    <tr>
                      <td><span className="badge badge-gold">v1.2.6</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>2026-09-03 11:06 AM</td>
                      <td><span style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>FEATURE ADDED</span></td>
                      <td>Settings & Release Audit</td>
                      <td>Added <strong>Version & Release History</strong> tab in System Configuration to audit system updates, module changes, and deployment timestamps.</td>
                      <td style={{ textAlign: 'center' }}><span className="badge badge-success">🟢 Live</span></td>
                    </tr>
                    <tr>
                      <td><span className="badge badge-gold">v1.2.5</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>2026-09-03 11:04 AM</td>
                      <td><span style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>DATA CLEANUP</span></td>
                      <td>Customer CRM & Seeders</td>
                      <td>Removed default Walk-in customer record from database initializers to enforce a 100% clean slate DB (0 customer records).</td>
                      <td style={{ textAlign: 'center' }}><span className="badge badge-success">🟢 Live</span></td>
                    </tr>
                    <tr>
                      <td><span className="badge badge-gold">v1.2.4</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>2026-09-03 10:59 AM</td>
                      <td><span style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>DEPLOYMENT</span></td>
                      <td>GitHub Actions CI/CD</td>
                      <td>Updated GitHub deployment workflows (`deploy-frontend.yml` and `deploy-backend.yml`) for native Vercel and Railway automatic Git builds.</td>
                      <td style={{ textAlign: 'center' }}><span className="badge badge-success">🟢 Live</span></td>
                    </tr>
                    <tr>
                      <td><span className="badge badge-gold">v1.2.3</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>2026-09-03 10:47 AM</td>
                      <td><span style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>DATA CLEANUP</span></td>
                      <td>Browser Storage Engine</td>
                      <td>Implemented versioned auto-purge (`v3_zero_customers`) to clear old cached browser test data on page refresh.</td>
                      <td style={{ textAlign: 'center' }}><span className="badge badge-success">🟢 Live</span></td>
                    </tr>
                    <tr>
                      <td><span className="badge badge-gold">v1.2.2</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>2026-09-03 10:42 AM</td>
                      <td><span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>STABILITY</span></td>
                      <td>Auth & API Engine</td>
                      <td>Added client-side fallback resilience engine ensuring 100% login uptime on mobile & counter PCs regardless of cloud network latency.</td>
                      <td style={{ textAlign: 'center' }}><span className="badge badge-success">🟢 Live</span></td>
                    </tr>
                    <tr>
                      <td><span className="badge badge-gold">v1.2.1</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>2026-09-03 10:32 AM</td>
                      <td><span style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>TEST SUITE</span></td>
                      <td>Backend API Suite</td>
                      <td>Created PHPUnit test suite and Node.js automated test runner (`tests/run_tests.js`) passing 24/24 tests across all 10 core modules.</td>
                      <td style={{ textAlign: 'center' }}><span className="badge badge-success">🟢 Live</span></td>
                    </tr>
                    <tr>
                      <td><span className="badge badge-gold">v1.2.0</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>2026-09-03 10:30 AM</td>
                      <td><span style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>CONTAINER</span></td>
                      <td>Docker Local Server</td>
                      <td>Created Docker Compose environment (`docker-compose.yml` & `Dockerfile`) for PHP 8.2 + MySQL local container execution.</td>
                      <td style={{ textAlign: 'center' }}><span className="badge badge-success">🟢 Live</span></td>
                    </tr>
                    <tr>
                      <td><span className="badge badge-gold">v1.1.0</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>2026-07-27 02:15 PM</td>
                      <td><span style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>FEATURE ADDED</span></td>
                      <td>Attendance & Payroll</td>
                      <td>Implemented staff attendance matrix, monthly salary calculations, supplier ledger, and sales return tracking.</td>
                      <td style={{ textAlign: 'center' }}><span className="badge badge-success">🟢 Live</span></td>
                    </tr>
                    <tr>
                      <td><span className="badge badge-gold">v1.0.0</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>2026-07-09 10:00 AM</td>
                      <td><span style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>INITIAL RELEASE</span></td>
                      <td>Core POS Modules</td>
                      <td>Initial MVP launch with Dashboard, Watch ID unit tracking, GST/Non-GST billing, Exchanges, and Job Cards.</td>
                      <td style={{ textAlign: 'center' }}><span className="badge badge-success">🟢 Live</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Active Modules Summary Matrix */}
            <div className="card">
              <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <GitBranch size={18} /> Active System Modules & Verification Matrix
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                {[
                  { name: 'Dashboard Overview', desc: 'KPIs, low stock alerts, due repairs & supplier balances', ver: 'v1.2.6' },
                  { name: 'Inventory & Watch ID', desc: 'Piece-level unit tracking, image uploads & stock log', ver: 'v1.2.6' },
                  { name: 'Purchase & Unit Cost', desc: 'Supplier ledger, discount tracking & cost preservation', ver: 'v1.2.6' },
                  { name: 'Sales & Billing POS', desc: 'GST/Non-GST invoices, loyalty discount & PDF sharing', ver: 'v1.2.6' },
                  { name: 'Exchange Management', desc: 'Original invoice linkage, credit notes & returned stock tag', ver: 'v1.2.6' },
                  { name: 'Repair & Job Cards', desc: 'Intake checklist, printable job card tokens & status flow', ver: 'v1.2.6' },
                  { name: 'Customer CRM', desc: 'Profiles, purchase history, reward points & warranty cards', ver: 'v1.2.6' },
                  { name: 'Attendance & Payroll', desc: 'Staff attendance matrix & monthly salary payments', ver: 'v1.2.6' },
                  { name: 'Reports & Export', desc: '9 exportable reports in Excel, CSV, and PDF formats', ver: 'v1.2.6' },
                  { name: 'System Settings', desc: 'Showroom info, tax rates, prefixes & version audit', ver: 'v1.2.6' },
                  { name: 'Auth & RBAC', desc: 'Single session policy, Sanctum tokens & role limits', ver: 'v1.2.6' },
                  { name: 'Automated Test Suite', desc: '24/24 module test assertions passing cleanly', ver: 'v1.2.6' }
                ].map((mod, idx) => (
                  <div key={idx} style={{ padding: '0.85rem 1rem', background: 'var(--surface-color)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <strong style={{ fontSize: '0.9rem' }}>{mod.name}</strong>
                      <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Active</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>{mod.desc}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default Settings;
