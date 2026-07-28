import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Header from '../components/Layout/Header';
import { 
  Calendar as CalendarIcon, 
  Users, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Printer, 
  Save, 
  Clock,
  Edit3,
  Download,
  Info,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { alertService } from '../utils/alert';
import Swal from 'sweetalert2';

const STATUS_CONFIG = {
  present:  { label: 'Present',       short: 'P',  color: '#10b981', bg: 'rgba(16, 185, 129, 0.18)', border: '#10b981' },
  half_day: { label: 'Half Day',      short: 'HD', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.18)', border: '#f59e0b' },
  cl:       { label: 'Casual Leave',  short: 'CL', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.18)', border: '#3b82f6' },
  ml:       { label: 'Medical Leave', short: 'ML', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.18)', border: '#8b5cf6' },
  absent:   { label: 'Absent',        short: 'A',  color: '#ef4444', bg: 'rgba(239, 68, 68, 0.18)',   border: '#ef4444' },
  leave:    { label: 'Unpaid Leave',  short: 'L',  color: '#f97316', bg: 'rgba(249, 115, 22, 0.18)', border: '#f97316' },
};

const AttendancePayroll = () => {
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'daily' | 'payroll'
  
  // Date states
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Data states
  const [dailyRecords, setDailyRecords] = useState([]);
  const [loadingDaily, setLoadingDaily] = useState(false);

  const [matrixData, setMatrixData] = useState(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);

  const [payrollRecords, setPayrollRecords] = useState([]);
  const [loadingPayroll, setLoadingPayroll] = useState(false);

  // Single cell edit modal state
  const [editingCell, setEditingCell] = useState(null); // { user_id, user_name, date, status, notes }
  const [editStatus, setEditStatus] = useState('present');
  const [editNotes, setEditNotes] = useState('');
  const [savingCell, setSavingCell] = useState(false);

  // Active slip for printing
  const [activeSlip, setActiveSlip] = useState(null);

  // Fetchers
  const fetchDailyAttendance = async (date) => {
    setLoadingDaily(true);
    try {
      const data = await api.getAttendance(date);
      setDailyRecords(data);
    } catch (err) {
      console.error(err);
      alertService.error('Error', 'Failed to load daily attendance.');
    } finally {
      setLoadingDaily(false);
    }
  };

  const fetchMonthlyMatrix = async (month, year) => {
    setLoadingMatrix(true);
    try {
      const data = await api.getMonthlyAttendanceMatrix(month, year);
      setMatrixData(data);
    } catch (err) {
      console.error(err);
      alertService.error('Error', 'Failed to load monthly attendance sheet.');
    } finally {
      setLoadingMatrix(false);
    }
  };

  const fetchPayroll = async (month, year) => {
    setLoadingPayroll(true);
    try {
      const data = await api.getPayroll(month, year);
      setPayrollRecords(data);
    } catch (err) {
      console.error(err);
      alertService.error('Error', 'Failed to load payroll records.');
    } finally {
      setLoadingPayroll(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'matrix') {
      fetchMonthlyMatrix(selectedMonth, selectedYear);
    } else if (activeTab === 'daily') {
      fetchDailyAttendance(selectedDate);
    } else if (activeTab === 'payroll') {
      fetchPayroll(selectedMonth, selectedYear);
    }
  }, [activeTab, selectedDate, selectedMonth, selectedYear]);

  // Handlers for Daily Register
  const handleDailyStatusChange = (userId, status) => {
    setDailyRecords(prev => prev.map(r => r.user_id === userId ? { ...r, status } : r));
  };

  const handleDailyNotesChange = (userId, notes) => {
    setDailyRecords(prev => prev.map(r => r.user_id === userId ? { ...r, notes } : r));
  };

  // Derived stats for Daily Register tab (safely computed to prevent runtime crash)
  const safeDailyRecords = Array.isArray(dailyRecords) ? dailyRecords : [];
  const presentToday = safeDailyRecords.filter(r => r.status === 'present').length;
  const clToday = safeDailyRecords.filter(r => r.status === 'cl').length;
  const mlToday = safeDailyRecords.filter(r => r.status === 'ml').length;
  const halfDayToday = safeDailyRecords.filter(r => r.status === 'half_day').length;
  const absentToday = safeDailyRecords.filter(r => r.status === 'absent').length;
  const safePayrollRecords = Array.isArray(payrollRecords) ? payrollRecords : [];
  const handleSaveDailyRegister = async () => {
    try {
      const payload = dailyRecords.map(r => ({
        user_id: r.user_id,
        status: r.status,
        notes: r.notes
      }));
      await api.saveAttendance(selectedDate, payload);
      alertService.success('Saved', `Attendance for ${selectedDate} saved successfully.`);
      fetchDailyAttendance(selectedDate);
    } catch (err) {
      alertService.error('Error', 'Failed to save daily register: ' + err.message);
    }
  };

  // Cell Edit Modal Handler (for monthly matrix)
  const handleOpenCellEdit = (user, dayNumber) => {
    const monthStr = String(selectedMonth).padStart(2, '0');
    const dayStr = String(dayNumber).padStart(2, '0');
    const dateStr = `${selectedYear}-${monthStr}-${dayStr}`;
    const dayInfo = user.days[dayNumber] || {};
    
    setEditingCell({
      user_id: user.user_id,
      user_name: user.user_name,
      day: dayNumber,
      date: dateStr
    });
    setEditStatus(dayInfo.status || 'present');
    setEditNotes(dayInfo.notes || '');
  };

  const handleSaveSingleCell = async () => {
    if (!editingCell) return;
    setSavingCell(true);
    try {
      await api.saveSingleAttendance({
        user_id: editingCell.user_id,
        date: editingCell.date,
        status: editStatus,
        notes: editNotes
      });
      alertService.success('Updated', `Attendance for ${editingCell.user_name} on ${editingCell.date} set to ${STATUS_CONFIG[editStatus]?.label || editStatus}`);
      setEditingCell(null);
      fetchMonthlyMatrix(selectedMonth, selectedYear);
    } catch (err) {
      alertService.error('Error', 'Failed to update attendance: ' + err.message);
    } finally {
      setSavingCell(false);
    }
  };

  // Payroll Pay handler
  const handlePaySalary = async (record) => {
    const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' });
    
    Swal.fire({
      title: 'Pay Salary?',
      html: `Register salary payment of <strong>₹${Number(record.net_salary).toLocaleString('en-IN')}</strong> to <strong>${record.user_name}</strong> for ${monthName} ${selectedYear}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirm Payment',
      cancelButtonText: 'Cancel',
      confirmButtonColor: 'var(--primary-gold)',
      cancelButtonColor: 'var(--border-color)',
      background: 'var(--surface-color)',
      color: 'var(--text-primary)'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.paySalary({
            user_id: record.user_id,
            month: selectedMonth,
            year: selectedYear,
            base_salary: record.base_salary,
            net_salary: record.net_salary
          });
          alertService.success('Payment Recorded', `Successfully registered salary payment for ${record.user_name}.`);
          fetchPayroll(selectedMonth, selectedYear);
        } catch (err) {
          alertService.error('Error', 'Failed to process salary payment: ' + err.message);
        }
      }
    });
  };

  const handlePrintSlip = (record) => {
    setActiveSlip(record);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const years = [2025, 2026, 2027, 2028];

  const currentMonthName = months.find(m => m.value === Number(selectedMonth))?.label || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
      <Header searchPlaceholder="Search attendance & payroll..." />
      <div className="page-container">
        
        {/* Page Title Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Attendance & Payroll Ledger</h1>
            <p className="page-subtitle" style={{ margin: '0.2rem 0 0' }}>
              Track daily staff store attendance, manage leaves (CL/ML), and compute monthly salaries.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button 
              className={`btn ${activeTab === 'matrix' ? 'btn-primary' : 'btn-secondary'}`} 
              onClick={() => setActiveTab('matrix')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <CalendarIcon size={16} /> Monthly Sheet
            </button>
            <button 
              className={`btn ${activeTab === 'daily' ? 'btn-primary' : 'btn-secondary'}`} 
              onClick={() => setActiveTab('daily')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <CheckCircle2 size={16} /> Daily Register
            </button>
            <button 
              className={`btn ${activeTab === 'payroll' ? 'btn-primary' : 'btn-secondary'}`} 
              onClick={() => setActiveTab('payroll')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <DollarSign size={16} /> Payroll Calculator
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: MONTHLY ATTENDANCE MATRIX SHEET                                */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'matrix' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Filter controls & Status Legend bar */}
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                
                {/* Month/Year selectors */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Select Month:</div>
                  <select 
                    className="form-control" 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    style={{ width: '140px', height: '38px', fontSize: '0.85rem' }}
                  >
                    {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>

                  <select 
                    className="form-control" 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    style={{ width: '100px', height: '38px', fontSize: '0.85rem' }}
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>

                  <button 
                    onClick={() => fetchMonthlyMatrix(selectedMonth, selectedYear)} 
                    className="btn btn-secondary btn-sm"
                    style={{ height: '38px' }}
                  >
                    Refresh Sheet
                  </button>
                </div>

                {/* Legend badges */}
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.78rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Legend:</span>
                  {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
                    <span 
                      key={k} 
                      style={{ 
                        padding: '2px 7px', 
                        borderRadius: '4px', 
                        background: cfg.bg, 
                        color: cfg.color, 
                        border: `1px solid ${cfg.border}`,
                        fontWeight: 700,
                        fontSize: '0.75rem'
                      }}
                    >
                      {cfg.short} = {cfg.label}
                    </span>
                  ))}
                  <span style={{ padding: '2px 7px', borderRadius: '4px', background: 'var(--surface-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>
                    — = Missed/Unrecorded
                  </span>
                </div>
              </div>
            </div>

            {/* Monthly Matrix Grid Table */}
            <div className="card" style={{ padding: '1rem', overflowX: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>
                  {currentMonthName} {selectedYear} — Staff Attendance Sheet
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  💡 Click on any day cell to edit or add missed attendance for that specific date.
                </span>
              </div>

              {loadingMatrix ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  Loading monthly attendance matrix...
                </div>
              ) : matrixData ? (
                <table className="data-table" style={{ borderCollapse: 'collapse', fontSize: '0.8rem', width: '100%', minWidth: '1100px' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-card)' }}>
                      <th style={{ sticky: 'left', background: 'var(--surface-card)', zIndex: 5, padding: '0.5rem 0.75rem', textAlign: 'left', minWidth: '150px' }}>Staff Name</th>
                      <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center', width: '70px' }}>Role</th>
                      
                      {/* Day columns 1 to daysInMonth */}
                      {Array.from({ length: matrixData.days_in_month }, (_, i) => i + 1).map(day => (
                        <th key={day} style={{ padding: '0.4rem 0.2rem', textAlign: 'center', minWidth: '28px', fontSize: '0.75rem' }}>
                          {day}
                        </th>
                      ))}

                      {/* Summary Columns */}
                      <th style={{ padding: '0.4rem 0.5rem', textAlign: 'center', background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>P</th>
                      <th style={{ padding: '0.4rem 0.5rem', textAlign: 'center', background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>CL</th>
                      <th style={{ padding: '0.4rem 0.5rem', textAlign: 'center', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>ML</th>
                      <th style={{ padding: '0.4rem 0.5rem', textAlign: 'center', background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>HD</th>
                      <th style={{ padding: '0.4rem 0.5rem', textAlign: 'center', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>A</th>
                      <th style={{ padding: '0.4rem 0.5rem', textAlign: 'center', background: 'var(--primary-gold-glow)', color: 'var(--primary-gold)', fontWeight: 800 }}>Paid Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrixData.employees.map(emp => (
                      <tr key={emp.user_id}>
                        {/* Employee Name */}
                        <td style={{ fontWeight: 600, sticky: 'left', background: 'var(--surface-color)', zIndex: 4, padding: '0.5rem 0.75rem' }}>
                          {emp.user_name}
                        </td>
                        
                        {/* Role */}
                        <td style={{ textAlign: 'center', padding: '0.4rem 0.2rem' }}>
                          <span className={`badge badge-${emp.user_role === 'manager' ? 'warning' : 'info'}`} style={{ fontSize: '0.68rem', padding: '1px 5px' }}>
                            {emp.user_role}
                          </span>
                        </td>

                        {/* Day cells 1 to daysInMonth */}
                        {Array.from({ length: matrixData.days_in_month }, (_, i) => i + 1).map(dayNum => {
                          const dayData = emp.days[dayNum];
                          const stKey = dayData?.status;
                          const cfg = STATUS_CONFIG[stKey];

                          return (
                            <td 
                              key={dayNum}
                              onClick={() => handleOpenCellEdit(emp, dayNum)}
                              title={`${emp.user_name} - Day ${dayNum}: ${cfg ? cfg.label : 'Unrecorded'}${dayData?.notes ? ' (' + dayData.notes + ')' : ''} [Click to Edit]`}
                              style={{ 
                                textAlign: 'center', 
                                padding: '0.35rem 0.1rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                            >
                              {cfg ? (
                                <span 
                                  style={{ 
                                    display: 'inline-block',
                                    width: '24px', 
                                    height: '24px', 
                                    lineHeight: '22px',
                                    borderRadius: '4px', 
                                    background: cfg.bg, 
                                    color: cfg.color, 
                                    border: `1px solid ${cfg.border}`,
                                    fontWeight: 800,
                                    fontSize: '0.72rem'
                                  }}
                                >
                                  {cfg.short}
                                </span>
                              ) : (
                                <span 
                                  style={{ 
                                    display: 'inline-block',
                                    width: '24px', 
                                    height: '24px', 
                                    lineHeight: '22px',
                                    borderRadius: '4px', 
                                    background: 'var(--surface-card)', 
                                    color: 'var(--text-secondary)',
                                    border: '1px dashed var(--border-color)',
                                    fontSize: '0.72rem'
                                  }}
                                >
                                  —
                                </span>
                              )}
                            </td>
                          );
                        })}

                        {/* Summary Totals */}
                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#10b981' }}>{emp.summary.present}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#3b82f6' }}>{emp.summary.cl}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#8b5cf6' }}>{emp.summary.ml}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#f59e0b' }}>{emp.summary.half_day}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#ef4444' }}>{emp.summary.absent}</td>
                        <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--primary-gold)', fontSize: '0.85rem' }}>
                          {emp.summary.payable_days}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No attendance data.</div>
              )}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: DAILY ATTENDANCE REGISTER                                      */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'daily' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Header controls & Date Picker */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700 }}>Select Register Date:</div>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={selectedDate} 
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{ width: '180px', height: '40px' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    (Select any past date to record or update attendance for that day)
                  </span>
                </div>

                <button 
                  onClick={handleSaveDailyRegister}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
                >
                  <Save size={16} /> Save Daily Register
                </button>
              </div>
            </div>

            {/* Attendance Summary Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
              <div className="card" style={{ textAlign: 'center', padding: '0.85rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Staff Present</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>{presentToday}</div>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: '0.85rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Casual Leave (CL)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3b82f6' }}>{clToday}</div>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: '0.85rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Medical Leave (ML)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#8b5cf6' }}>{mlToday}</div>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: '0.85rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Half Day</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>{halfDayToday}</div>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: '0.85rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Absent</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>{absentToday}</div>
              </div>
            </div>

            {/* Daily Register Table */}
            <div className="card">
              <h3 style={{ marginBottom: '1rem' }}>Daily Attendance Entry ({selectedDate})</h3>
              
              {loadingDaily ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading staff list...</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Employee Name</th>
                        <th>Role</th>
                        <th style={{ width: '220px' }}>Attendance Status</th>
                        <th>Remarks / Leave Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {safeDailyRecords.length > 0 ? (
                        safeDailyRecords.map(rec => (
                          <tr key={rec.user_id}>
                            <td style={{ fontWeight: 600 }}>{rec.user_name}</td>
                            <td>
                              <span className={`badge badge-${rec.user_role === 'manager' ? 'warning' : 'info'}`}>
                                {rec.user_role}
                              </span>
                            </td>
                            <td>
                              <select 
                                className="form-control"
                                value={rec.status}
                                onChange={(e) => handleDailyStatusChange(rec.user_id, e.target.value)}
                                style={{ 
                                  fontWeight: 600,
                                  color: STATUS_CONFIG[rec.status]?.color || 'inherit'
                                }}
                              >
                                <option value="present">🟢 Present (P)</option>
                                <option value="half_day">🟡 Half Day (HD)</option>
                                <option value="cl">🔵 Casual Leave (CL)</option>
                                <option value="ml">🟣 Medical Leave (ML)</option>
                                <option value="absent">🔴 Absent (A)</option>
                                <option value="leave">🟠 Unpaid Leave (L)</option>
                              </select>
                            </td>
                            <td>
                              <input 
                                type="text"
                                className="form-control"
                                placeholder="e.g. Fever - ML, Family function - CL..."
                                value={rec.notes}
                                onChange={(e) => handleDailyNotesChange(rec.user_id, e.target.value)}
                              />
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No employees found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: PAYROLL CALCULATOR                                             */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'payroll' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Month & Year Filter */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 700 }}>Select Payroll Period:</div>
                <select 
                  className="form-control" 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  style={{ width: '150px' }}
                >
                  {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select 
                  className="form-control" 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  style={{ width: '110px' }}
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>

                <button 
                  onClick={() => fetchPayroll(selectedMonth, selectedYear)}
                  className="btn btn-secondary btn-sm"
                >
                  Recalculate
                </button>
              </div>
            </div>

            {/* Payroll Table */}
            <div className="card">
              <h3 style={{ marginBottom: '1.25rem' }}>
                Monthly Payroll Breakup ({currentMonthName} {selectedYear})
              </h3>

              {loadingPayroll ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Calculating salary breakups...</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Role</th>
                        <th>Base Salary (₹)</th>
                        <th>Monthly Attendance Breakup</th>
                        <th>Paid Days</th>
                        <th>Net Payable Salary (₹)</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {safePayrollRecords.length > 0 ? (
                        safePayrollRecords.map(rec => (
                          <tr key={rec.user_id}>
                            <td style={{ fontWeight: 600 }}>{rec.user_name}</td>
                            <td>
                              <span className={`badge badge-${rec.user_role === 'manager' ? 'warning' : 'info'}`}>
                                {rec.user_role}
                              </span>
                            </td>
                            <td>₹{Number(rec.base_salary).toLocaleString('en-IN')}</td>
                            <td>
                              <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                <span>Present: <strong>{rec.present_days}</strong> | CL: <strong>{rec.cl_days || 0}</strong> | ML: <strong>{rec.ml_days || 0}</strong></span>
                                <span>Half: <strong>{rec.half_days}</strong> | Absent: <strong>{rec.absent_days}</strong> | Leave: <strong>{rec.leave_days}</strong></span>
                                {rec.unrecorded_days > 0 && (
                                  <span style={{ color: 'var(--warning, #f59e0b)', fontWeight: 600, fontSize: '0.72rem' }}>
                                    ⚠ {rec.unrecorded_days} day(s) missed — counted as absent
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ fontWeight: 700 }}>
                              {(rec.present_days || 0) + (rec.cl_days || 0) + (rec.ml_days || 0) + ((rec.half_days || 0) * 0.5)} / {rec.total_days}
                            </td>
                            <td style={{ fontWeight: 800, color: 'var(--primary-gold)', fontSize: '0.95rem' }}>
                              ₹{Number(rec.net_salary).toLocaleString('en-IN')}
                            </td>
                            <td>
                              <span className={`badge badge-${rec.status === 'paid' ? 'success' : 'danger'}`}>
                                {rec.status.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                                {rec.status === 'unpaid' ? (
                                  <>
                                    {rec.attendance_incomplete && (
                                      <span title="Attendance is incomplete for this month" style={{ color: 'var(--warning, #f59e0b)', fontSize: '0.75rem', alignSelf: 'center' }}>⚠ Incomplete</span>
                                    )}
                                    <button 
                                      onClick={() => handlePaySalary(rec)} 
                                      className="btn btn-primary btn-sm"
                                      style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                                    >
                                      Pay Salary
                                    </button>
                                  </>
                                ) : (
                                  <button 
                                    onClick={() => handlePrintSlip(rec)} 
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '0.3rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8rem' }}
                                    title="Print Payslip"
                                  >
                                    <Printer size={12} /> Payslip
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No payroll data found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* QUICK ATTENDANCE EDIT MODAL (FOR SINGLE CELL IN MONTHLY MATRIX)       */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {editingCell && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px', padding: '1.5rem', background: 'var(--surface-color)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Edit3 size={18} color="var(--primary-gold)" /> Mark Attendance
              </h3>
              <button 
                onClick={() => setEditingCell(null)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'var(--surface-card)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Staff Member</div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{editingCell.user_name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--primary-gold)', marginTop: '0.2rem', fontWeight: 600 }}>
                  Date: {editingCell.date} (Day {editingCell.day} of {currentMonthName})
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Attendance Status *</label>
                <select 
                  className="form-control"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  style={{ fontWeight: 700, fontSize: '0.9rem', color: STATUS_CONFIG[editStatus]?.color || 'inherit' }}
                >
                  <option value="present">🟢 Present (P) — Full Day Paid</option>
                  <option value="half_day">🟡 Half Day (HD) — 0.5 Day Paid</option>
                  <option value="cl">🔵 Casual Leave (CL) — Paid Leave</option>
                  <option value="ml">🟣 Medical Leave (ML) — Paid Leave</option>
                  <option value="absent">🔴 Absent (A) — Unpaid</option>
                  <option value="leave">🟠 Unpaid Leave (L) — Unpaid</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Remarks / Leave Reason (Optional)</label>
                <input 
                  type="text"
                  className="form-control"
                  placeholder="e.g. Fever, Emergency, Personal work..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setEditingCell(null)} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveSingleCell} 
                  disabled={savingCell}
                  className="btn btn-primary"
                  style={{ fontWeight: 700 }}
                >
                  {savingCell ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* PAYSLIP PRINT TEMPLATE (Hidden in UI, Visible when printing)         */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeSlip && (
        <div className="printable-area" style={{ display: 'none', background: '#fff', color: '#000', padding: '2rem', fontFamily: 'sans-serif' }}>
          <div style={{ borderBottom: '2px solid #333', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0, color: '#d4af37' }}>SMART TIMES</h2>
              <p style={{ margin: '0.2rem 0', fontSize: '0.85rem' }}>Watch Showroom & Service Center</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#555' }}>Dharmapuri, Tamil Nadu</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h3 style={{ margin: 0, textTransform: 'uppercase' }}>Salary Payslip</h3>
              <p style={{ margin: '0.2rem 0', fontWeight: 600 }}>Period: {currentMonthName} {selectedYear}</p>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>Payment Date: {activeSlip.payment_date || new Date().toISOString().split('T')[0]}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            <div style={{ borderRight: '1px solid #ddd', paddingRight: '1rem' }}>
              <p style={{ margin: '0.2rem 0' }}>Employee Name: <strong>{activeSlip.user_name}</strong></p>
              <p style={{ margin: '0.2rem 0' }}>Designation / Role: <strong style={{ textTransform: 'capitalize' }}>{activeSlip.user_role}</strong></p>
            </div>
            <div>
              <p style={{ margin: '0.2rem 0' }}>Total Days in Month: <strong>{activeSlip.total_days}</strong></p>
              <p style={{ margin: '0.2rem 0' }}>Payable Days: <strong>{(activeSlip.present_days || 0) + (activeSlip.cl_days || 0) + (activeSlip.ml_days || 0) + ((activeSlip.half_days || 0) * 0.5)}</strong></p>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', borderBottom: '1.5px solid #333' }}>
                <th style={{ padding: '0.5rem', textAlign: 'left' }}>Description</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Details / Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem' }}>Monthly Base Salary</td>
                <td style={{ padding: '0.5rem', textAlign: 'right' }}>₹{Number(activeSlip.base_salary).toLocaleString('en-IN')}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem' }}>Attendance Breakdown</td>
                <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                  P: {activeSlip.present_days || 0} | CL: {activeSlip.cl_days || 0} | ML: {activeSlip.ml_days || 0} | HD: {activeSlip.half_days || 0} | Absent: {activeSlip.absent_days || 0}
                </td>
              </tr>
              <tr style={{ borderBottom: '2px solid #333', fontWeight: 700, fontSize: '1.1rem' }}>
                <td style={{ padding: '0.75rem 0.5rem' }}>Net Salary Paid</td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: '#d4af37' }}>₹{Number(activeSlip.net_salary).toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4rem', fontSize: '0.85rem' }}>
            <div style={{ borderTop: '1px dashed #333', width: '180px', textAlign: 'center', paddingTop: '0.25rem' }}>
              Employee Signature
            </div>
            <div style={{ borderTop: '1px dashed #333', width: '180px', textAlign: 'center', paddingTop: '0.25rem' }}>
              Authorized Signatory (Smart Times)
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AttendancePayroll;
