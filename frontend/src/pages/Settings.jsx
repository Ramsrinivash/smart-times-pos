import React, { useState, useEffect } from 'react';
import Header from '../components/Layout/Header';
import { api } from '../services/api';
import { Save, Settings as SettingsIcon, Users, FileText, Shield, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { alertService } from '../utils/alert';

const Settings = () => {
  const { user } = useAuth();

  // Showroom profile
  const [storeName, setStoreName] = useState('Smart Times');
  const [tagline, setTagline] = useState('TITAN - SONATA - FASTRACK - TIMEX - LENCO - SMART WATCHES');
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

  // Personal credentials edit state
  const [myEmail, setMyEmail] = useState(user?.email || '');
  const [myPassword, setMyPassword] = useState('');
  const [myConfirmPassword, setMyConfirmPassword] = useState('');

  // Staff password edit state
  const [editingUser, setEditingUser] = useState(null);
  const [newStaffPassword, setNewStaffPassword] = useState('');

  // Activity log
  const [activityLogs, setActivityLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('profile');

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

  const handleResetStaffPassword = async (e) => {
    e.preventDefault();
    if (!newStaffPassword) {
      alertService.warning('Required Field', 'Please enter a password.');
      return;
    }
    try {
      await api.updateUser(editingUser.id, { password: newStaffPassword }, user.id);
      alertService.success('Success', `Password updated successfully for user "${editingUser.name}".`);
      setEditingUser(null);
      setNewStaffPassword('');
      const u = await api.getUsers();
      setUsers(u);
    } catch (err) {
      alertService.error('Error', 'Failed to update staff password: ' + err.message);
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
    try {
      await api.addUser({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole
      });
      alertService.success('Success', `User "${newUserName}" created successfully.`);
      setNewUserName(''); setNewUserEmail(''); setNewUserPassword(''); setNewUserRole('sales');
      const u = await api.getUsers();
      setUsers(u);
    } catch (err) {
      alertService.error('Error', 'Failed to create user: ' + err.message);
    }
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
          <button style={tabStyle('profile')} onClick={() => setActiveTab('profile')}>
            <SettingsIcon size={14} style={{ marginRight: '0.3rem' }} /> Showroom Profile
          </button>
          <button style={tabStyle('invoice')} onClick={() => setActiveTab('invoice')}>
            <FileText size={14} style={{ marginRight: '0.3rem' }} /> Invoice & Rules
          </button>
          <button style={tabStyle('loyalty')} onClick={() => setActiveTab('loyalty')}>
            Loyalty Program
          </button>
          <button style={tabStyle('jobcard')} onClick={() => setActiveTab('jobcard')}>
            Job Card Terms
          </button>
          <button style={tabStyle('my_account')} onClick={() => setActiveTab('my_account')}>
            My Account
          </button>
          {user?.role === 'admin' && (
            <>
              <button style={tabStyle('users')} onClick={() => setActiveTab('users')}>
                <Users size={14} style={{ marginRight: '0.3rem' }} /> Staff Accounts
              </button>
              <button style={tabStyle('activity')} onClick={() => setActiveTab('activity')}>
                <Shield size={14} style={{ marginRight: '0.3rem' }} /> Activity Log
              </button>
              <button style={tabStyle('backup')} onClick={() => setActiveTab('backup')}>
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
              {/* Reset Password Form Inline */}
              {editingUser && (
                <div className="card" style={{ border: '1px solid var(--warning)' }}>
                  <h3 style={{ marginBottom: '1rem', color: 'var(--warning)' }}>Reset Password: {editingUser.name}</h3>
                  <form onSubmit={handleResetStaffPassword} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ margin: 0, flex: 1 }}>
                      <label className="form-label">New Password</label>
                      <input 
                        type="password" 
                        className="form-control" 
                        required 
                        placeholder="••••••••" 
                        value={newStaffPassword} 
                        onChange={e => setNewStaffPassword(e.target.value)} 
                      />
                    </div>
                    <button type="submit" className="btn btn-primary">Save</button>
                    <button type="button" onClick={() => setEditingUser(null)} className="btn btn-secondary">Cancel</button>
                  </form>
                </div>
              )}

              <div className="card">
                <h3 style={{ marginBottom: '1.25rem' }}>Current Staff ({users.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {users.map(u => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--surface-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-gold-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-gold)', fontWeight: 700, fontSize: '0.9rem' }}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</p>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                        <span className={`badge badge-${u.role === 'admin' ? 'danger' : u.role === 'manager' ? 'warning' : 'info'}`}>
                          {u.role}
                        </span>
                        <button 
                          onClick={() => { setEditingUser(u); setNewStaffPassword(''); }}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                        >
                          Reset Pass
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
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
          <div className="card" style={{ maxWidth: '600px' }}>
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
        )}

      </div>
    </div>
  );
};

export default Settings;
