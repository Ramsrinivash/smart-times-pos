import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Header from '../components/Layout/Header';
import { Calendar, Users, DollarSign, CheckCircle2, AlertCircle, FileText, Printer, Save, Award } from 'lucide-react';
import { alertService } from '../utils/alert';
import Swal from 'sweetalert2';

const AttendancePayroll = () => {
  const [activeTab, setActiveTab] = useState('attendance');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Attendance state
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Payroll state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [loadingPayroll, setLoadingPayroll] = useState(false);

  // Print slip state
  const [activeSlip, setActiveSlip] = useState(null);

  const fetchAttendance = async (date) => {
    setLoadingAttendance(true);
    try {
      const data = await api.getAttendance(date);
      setAttendanceRecords(data);
    } catch (err) {
      console.error(err);
      alertService.error('Error', 'Failed to load attendance records.');
    } finally {
      setLoadingAttendance(false);
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
    if (activeTab === 'attendance') {
      fetchAttendance(selectedDate);
    } else {
      fetchPayroll(selectedMonth, selectedYear);
    }
  }, [activeTab, selectedDate, selectedMonth, selectedYear]);

  const handleStatusChange = (userId, status) => {
    setAttendanceRecords(prev => 
      prev.map(r => r.user_id === userId ? { ...r, status } : r)
    );
  };

  const handleNotesChange = (userId, notes) => {
    setAttendanceRecords(prev => 
      prev.map(r => r.user_id === userId ? { ...r, notes } : r)
    );
  };

  const handleSaveAttendance = async () => {
    try {
      const payload = attendanceRecords.map(r => ({
        user_id: r.user_id,
        status: r.status,
        notes: r.notes
      }));
      await api.saveAttendance(selectedDate, payload);
      alertService.success('Success', `Attendance for ${selectedDate} saved successfully.`);
      fetchAttendance(selectedDate);
    } catch (err) {
      alertService.error('Error', 'Failed to save attendance: ' + err.message);
    }
  };

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

  // Stats calculation
  const totalEmployees = attendanceRecords.length;
  const presentToday = attendanceRecords.filter(r => r.status === 'present').length;
  const leaveToday = attendanceRecords.filter(r => r.status === 'leave').length;
  const halfDayToday = attendanceRecords.filter(r => r.status === 'half_day').length;
  const absentToday = attendanceRecords.filter(r => r.status === 'absent').length;

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

  const handlePrintSlip = (record) => {
    setActiveSlip(record);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
      <Header searchPlaceholder="Search attendance..." />
      
      <div className="page-container no-print">
        <h1 className="page-title">Attendance & Payroll Ledger</h1>
        <p className="page-subtitle">Track employee daily attendance logs and calculate net monthly salary pay outs.</p>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button 
            className={`btn ${activeTab === 'attendance' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('attendance')}
            style={{ padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-sm)' }}
          >
            <Calendar size={14} style={{ marginRight: '0.3rem' }} /> Attendance Register
          </button>
          <button 
            className={`btn ${activeTab === 'payroll' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('payroll')}
            style={{ padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-sm)' }}
          >
            <DollarSign size={14} style={{ marginRight: '0.3rem' }} /> Payroll Calculator
          </button>
        </div>

        {/* Attendance Tab Panel */}
        {activeTab === 'attendance' && (
          <>
            {/* Quick Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="card" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Staff</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalEmployees}</div>
              </div>
              <div className="card" style={{ padding: '1rem', borderLeft: '3px solid var(--success)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Present Today</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{presentToday}</div>
              </div>
              <div className="card" style={{ padding: '1rem', borderLeft: '3px solid var(--warning)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Half Day</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>{halfDayToday}</div>
              </div>
              <div className="card" style={{ padding: '1rem', borderLeft: '3px solid var(--info)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>On Leave</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--info)' }}>{leaveToday}</div>
              </div>
              <div className="card" style={{ padding: '1rem', borderLeft: '3px solid var(--error)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Absent</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--error)' }}>{absentToday}</div>
              </div>
            </div>

            <div className="card" style={{ maxWidth: '900px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0 }}>Register Staff Attendance</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Date:</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={selectedDate} 
                    onChange={e => setSelectedDate(e.target.value)}
                    style={{ width: '160px' }}
                  />
                </div>
              </div>

              {loadingAttendance ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading staff records...</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Employee Name</th>
                        <th>Role</th>
                        <th style={{ textAlign: 'center' }}>Attendance Status</th>
                        <th>Remarks / Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRecords.length > 0 ? (
                        attendanceRecords.map(rec => (
                          <tr key={rec.user_id}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{rec.user_name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{rec.user_email}</div>
                            </td>
                            <td>
                              <span className={`badge badge-${rec.user_role === 'manager' ? 'warning' : 'info'}`}>
                                {rec.user_role}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                <button 
                                  type="button"
                                  onClick={() => handleStatusChange(rec.user_id, 'present')}
                                  className="btn btn-sm"
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '0.3rem 0.6rem',
                                    background: rec.status === 'present' ? 'var(--success-bg)' : 'transparent',
                                    color: rec.status === 'present' ? 'var(--success)' : 'var(--text-secondary)',
                                    border: `1px solid ${rec.status === 'present' ? 'var(--success)' : 'var(--border-color)'}`
                                  }}
                                >
                                  Present
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleStatusChange(rec.user_id, 'half_day')}
                                  className="btn btn-sm"
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '0.3rem 0.6rem',
                                    background: rec.status === 'half_day' ? 'rgba(245,158,11,0.15)' : 'transparent',
                                    color: rec.status === 'half_day' ? 'var(--warning)' : 'var(--text-secondary)',
                                    border: `1px solid ${rec.status === 'half_day' ? 'var(--warning)' : 'var(--border-color)'}`
                                  }}
                                >
                                  Half Day
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleStatusChange(rec.user_id, 'leave')}
                                  className="btn btn-sm"
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '0.3rem 0.6rem',
                                    background: rec.status === 'leave' ? 'rgba(59,130,246,0.15)' : 'transparent',
                                    color: rec.status === 'leave' ? 'var(--info)' : 'var(--text-secondary)',
                                    border: `1px solid ${rec.status === 'leave' ? 'var(--info)' : 'var(--border-color)'}`
                                  }}
                                >
                                  Leave
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleStatusChange(rec.user_id, 'absent')}
                                  className="btn btn-sm"
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '0.3rem 0.6rem',
                                    background: rec.status === 'absent' ? 'rgba(239,68,68,0.15)' : 'transparent',
                                    color: rec.status === 'absent' ? 'var(--error)' : 'var(--text-secondary)',
                                    border: `1px solid ${rec.status === 'absent' ? 'var(--error)' : 'var(--border-color)'}`
                                  }}
                                >
                                  Absent
                                </button>
                              </div>
                            </td>
                            <td>
                              <input 
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Reason for leave/absence, notes..."
                                value={rec.notes}
                                onChange={e => handleNotesChange(rec.user_id, e.target.value)}
                                style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', height: '32px' }}
                              />
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No active staff profiles found to take attendance.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {attendanceRecords.length > 0 && (
                <button 
                  onClick={handleSaveAttendance}
                  className="btn btn-primary"
                  style={{ marginTop: '1.25rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Save size={16} /> Save Today's Attendance Register
                </button>
              )}
            </div>
          </>
        )}

        {/* Payroll Tab Panel */}
        {activeTab === 'payroll' && (
          <div className="card" style={{ maxWidth: '1100px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0 }}>Monthly Salary Calculator</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select 
                  className="form-control" 
                  value={selectedMonth} 
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  style={{ width: '140px' }}
                >
                  {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select 
                  className="form-control" 
                  value={selectedYear} 
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  style={{ width: '100px' }}
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {loadingPayroll ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Calculating salary slips...</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee Name</th>
                      <th>Role</th>
                      <th>Base Salary (₹)</th>
                      <th>Attendance Log</th>
                      <th>Payable Net Salary (₹)</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollRecords.length > 0 ? (
                      payrollRecords.map(rec => (
                        <tr key={rec.user_id}>
                          <td style={{ fontWeight: 600 }}>{rec.user_name}</td>
                          <td>
                            <span className={`badge badge-${rec.user_role === 'manager' ? 'warning' : 'info'}`}>
                              {rec.user_role}
                            </span>
                          </td>
                          <td>₹{Number(rec.base_salary).toLocaleString('en-IN')}</td>
                          <td>
                            <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                              <span>Present: <strong>{rec.present_days}</strong>, Half: <strong>{rec.half_days}</strong></span>
                              <span>Leave: <strong>{rec.leave_days}</strong>, Absent: <strong>{rec.absent_days}</strong></span>
                            </div>
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--primary-gold)' }}>
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
                                <button 
                                  onClick={() => handlePaySalary(rec)} 
                                  className="btn btn-primary btn-sm"
                                  style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                                >
                                  Pay Salary
                                </button>
                              ) : (
                                <>
                                  <button 
                                    onClick={() => handlePrintSlip(rec)} 
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '0.3rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8rem' }}
                                    title="Print Payslip"
                                  >
                                    <Printer size={12} /> Payslip
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No payroll data found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Salary Slip Print Mode (Hidden in UI, Visible when printing) */}
      {activeSlip && (
        <div className="print-only salary-slip" style={{ padding: '2rem', background: '#fff', color: '#000', fontFamily: 'serif', maxWidth: '800px', margin: '0 auto', fontSize: '14px', border: '1px solid #ddd' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '24px', margin: '0 0 0.25rem 0', fontWeight: 'bold' }}>SMART TIMES</h1>
            <p style={{ margin: 0, fontStyle: 'italic', fontSize: '13px' }}>Watch Showroom Management</p>
            <p style={{ margin: '0.4rem 0 0 0', fontSize: '12px' }}>108, Pennagaram Main Road, (Next to R.C. Church), DHARMAPURI - 636 701.</p>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '12px' }}>Phone: 97512 85945, 86672 88021</p>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '18px', textDecoration: 'underline', margin: 0, fontWeight: 'bold' }}>SALARY PAY SLIP</h2>
            <p style={{ margin: '0.25rem 0 0 0' }}>For Month: <strong>{new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' })} {selectedYear}</strong></p>
          </div>

          <table style={{ width: '100%', marginBottom: '1.5rem', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '0.5rem 0', width: '35%' }}>Employee Name:</td>
                <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>{activeSlip.user_name}</td>
              </tr>
              <tr>
                <td style={{ padding: '0.5rem 0' }}>Designation / Role:</td>
                <td style={{ padding: '0.5rem 0', textTransform: 'capitalize' }}>{activeSlip.user_role}</td>
              </tr>
              <tr>
                <td style={{ padding: '0.5rem 0' }}>Pay Period Days:</td>
                <td style={{ padding: '0.5rem 0' }}>{activeSlip.total_days} Days</td>
              </tr>
              <tr>
                <td style={{ padding: '0.5rem 0' }}>Attendance Breakdowns:</td>
                <td style={{ padding: '0.5rem 0' }}>
                  Present: {activeSlip.present_days} | Half Day: {activeSlip.half_days} | Leave: {activeSlip.leave_days} | Absent: {activeSlip.absent_days}
                </td>
              </tr>
            </tbody>
          </table>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: '3rem' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', borderBottom: '1px solid #000' }}>
                <th style={{ padding: '0.6rem 1rem', textAlign: 'left', borderRight: '1px solid #000' }}>Particulars</th>
                <th style={{ padding: '0.6rem 1rem', textAlign: 'right' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '0.6rem 1rem', borderRight: '1px solid #000' }}>Base Monthly Salary:</td>
                <td style={{ padding: '0.6rem 1rem', textAlign: 'right' }}>₹{Number(activeSlip.base_salary).toLocaleString('en-IN')}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '0.6rem 1rem', borderRight: '1px solid #000' }}>Absence Deductions:</td>
                <td style={{ padding: '0.6rem 1rem', textAlign: 'right', color: '#000' }}>
                  - ₹{Number(activeSlip.base_salary - activeSlip.net_salary).toLocaleString('en-IN')}
                </td>
              </tr>
              <tr style={{ fontWeight: 'bold', background: '#f9f9f9', borderTop: '1px solid #000' }}>
                <td style={{ padding: '0.75rem 1rem', borderRight: '1px solid #000' }}>Net Payable Salary:</td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '16px' }}>
                  ₹{Number(activeSlip.net_salary).toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4rem' }}>
            <div style={{ textAlign: 'center', width: '35%' }}>
              <div style={{ borderBottom: '1px solid #000', height: '30px', marginBottom: '0.4rem' }}></div>
              <p style={{ margin: 0, fontSize: '12px' }}>Employee Signature</p>
            </div>
            <div style={{ textAlign: 'center', width: '35%' }}>
              <div style={{ borderBottom: '1px solid #000', height: '30px', marginBottom: '0.4rem' }}></div>
              <p style={{ margin: 0, fontSize: '12px' }}>Authorized Signatory</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePayroll;
