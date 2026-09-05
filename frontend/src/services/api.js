import { syncQueue } from '../utils/syncQueue';

const getHeaders = () => {
  const token = localStorage.getItem('watch_auth_token');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

/**
 * Smart Times POS — Central Online Database Server Connection
 * Sends all API requests directly to the online server database (Laravel Backend).
 * Ensures zero data loss and persistent server storage across all devices.
 */
const sendOnlineRequest = async (endpoint, options = {}) => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = getHeaders();
    const config = {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {})
      }
    };

    const res = await fetch(url, config);
    if (res.ok) {
      return await res.json();
    }

    if (res.status === 401) {
      const errData = await res.json().catch(() => ({ message: 'Unauthenticated session.' }));
      throw new Error(errData.message || 'SESSION_EXPIRED');
    }

    const errData = await res.json().catch(() => ({ message: 'Server request failed.' }));
    throw new Error(errData.message || `API error ${res.status}`);
  } catch (err) {
    if (err.message === 'SESSION_EXPIRED' || err.message === 'SESSION_TERMINATED') {
      throw err;
    }
    throw new Error(err.message || `Unable to connect to Central Online Database Server at ${API_BASE_URL}`);
  }
};

export const api = {
  // Settings
  getSettings: async () => {
    return sendOnlineRequest('/settings');
  },
  saveSettings: async (data) => {
    return sendOnlineRequest('/settings', { method: 'PUT', body: JSON.stringify(data) });
  },
  resetDatabase: async () => {
    return sendOnlineRequest('/settings/reset-database', { method: 'POST' });
  },
  exportDatabase: async () => {
    return sendOnlineRequest('/settings/export-database');
  },
  importDatabase: async (data) => {
    return sendOnlineRequest('/settings/import-database', { method: 'POST', body: JSON.stringify(data) });
  },

  // Auth
  login: async (email, password, force = false, clientInfo = null) => {
    return sendOnlineRequest('/login', { method: 'POST', body: JSON.stringify({ email, password, force, clientInfo }) });
  },
  checkSession: async (userId, token) => {
    return sendOnlineRequest('/me');
  },
  getActiveSessionInfo: async (userId) => {
    return sendOnlineRequest('/me/session');
  },
  logout: async (userId) => {
    try {
      await sendOnlineRequest('/logout', { method: 'POST' });
    } catch (e) { /* ignore logout errors */ }
  },

  // Users
  getUsers: async () => {
    return sendOnlineRequest('/users');
  },
  addUser: async (data) => {
    return sendOnlineRequest('/users', { method: 'POST', body: JSON.stringify(data) });
  },
  updateUser: async (id, data) => {
    return sendOnlineRequest(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteUser: async (id) => {
    return sendOnlineRequest(`/users/${id}`, { method: 'DELETE' });
  },
  getActivityLogs: async () => {
    return sendOnlineRequest('/activity-logs');
  },

  // Attendance & Payroll
  getAttendance: async (date = '') => {
    return sendOnlineRequest(`/attendance?date=${encodeURIComponent(date)}`);
  },
  saveAttendance: async (date, records) => {
    return sendOnlineRequest('/attendance', { method: 'POST', body: JSON.stringify({ date, records }) });
  },
  getMonthlyAttendanceMatrix: async (month, year) => {
    return sendOnlineRequest(`/attendance/matrix?month=${month}&year=${year}`);
  },
  saveSingleAttendance: async (data) => {
    return sendOnlineRequest('/attendance/single', { method: 'POST', body: JSON.stringify(data) });
  },
  getPayroll: async (month, year) => {
    return sendOnlineRequest(`/payroll?month=${month}&year=${year}`);
  },
  paySalary: async (data) => {
    return sendOnlineRequest('/payroll/pay', { method: 'POST', body: JSON.stringify(data) });
  },

  // Customers
  getCustomers: async (search = '') => {
    return sendOnlineRequest(`/customers?search=${encodeURIComponent(search)}`);
  },
  addCustomer: async (data) => {
    return sendOnlineRequest('/customers', { method: 'POST', body: JSON.stringify(data) });
  },
  updateCustomer: async (id, data) => {
    return sendOnlineRequest(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  getCustomerHistory: async (id) => {
    return sendOnlineRequest(`/customers/${id}/history`);
  },

  // Inventory
  getInventory: async (search = '', status = '') => {
    return sendOnlineRequest(`/inventory?search=${encodeURIComponent(search)}&status=${status}`);
  },
  updateWatch: async (watchId, data) => {
    return sendOnlineRequest(`/inventory/${encodeURIComponent(watchId)}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  // Purchases
  getPurchases: async () => {
    return sendOnlineRequest('/purchase/ledger');
  },
  addPurchase: async (data) => {
    return sendOnlineRequest('/purchase', { method: 'POST', body: JSON.stringify(data) });
  },
  updatePurchasePayment: async (id, paymentStatus) => {
    return sendOnlineRequest(`/purchase/${id}/payment`, { method: 'PUT', body: JSON.stringify({ payment_status: paymentStatus }) });
  },

  // Sales
  getSales: async (search = '') => {
    return sendOnlineRequest(`/sales?search=${encodeURIComponent(search)}`);
  },
  getSale: async (id) => {
    return sendOnlineRequest(`/sales/${id}`);
  },
  addSale: async (data) => {
    return sendOnlineRequest('/sales', { method: 'POST', body: JSON.stringify(data) });
  },

  // Exchanges
  getExchanges: async () => {
    return sendOnlineRequest('/exchanges');
  },
  addExchange: async (data) => {
    return sendOnlineRequest('/exchanges', { method: 'POST', body: JSON.stringify(data) });
  },
  approveExchangeReview: async (id, status) => {
    return sendOnlineRequest(`/exchanges/${id}/approve`, { method: 'POST', body: JSON.stringify({ status }) });
  },

  // Services
  getServiceJobs: async (search = '', status = '') => {
    return sendOnlineRequest(`/services?search=${encodeURIComponent(search)}&status=${status}`);
  },
  addServiceJob: async (data) => {
    return sendOnlineRequest('/services', { method: 'POST', body: JSON.stringify(data) });
  },
  updateServiceJobStatus: async (id, status, actualCost = null) => {
    return sendOnlineRequest(`/services/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, actual_cost: actualCost }) });
  },

  // Dashboard
  getDashboardStats: async (role = 'sales') => {
    return sendOnlineRequest('/dashboard');
  },

  // Reports
  getStockValuation: async () => {
    return sendOnlineRequest('/reports/stock-valuation');
  },
  getSalesReport: async (startDate, endDate) => {
    return sendOnlineRequest(`/reports/sales?start_date=${startDate || ''}&end_date=${endDate || ''}`);
  },
  getProfitReport: async (startDate, endDate) => {
    return sendOnlineRequest(`/reports/profit?start_date=${startDate || ''}&end_date=${endDate || ''}`);
  },
  getExchangeReport: async () => {
    return sendOnlineRequest('/reports/exchanges');
  },
  getLoyaltyReport: async () => {
    return sendOnlineRequest('/reports/loyalty');
  },
  getPendingServiceReport: async () => {
    return sendOnlineRequest('/reports/services-pending');
  },
  getSupplierDuesReport: async () => {
    return sendOnlineRequest('/reports/supplier-dues');
  },
  getGstReport: async (month, year) => {
    return sendOnlineRequest(`/reports/gst?month=${month}&year=${year}`);
  },
  getPurchaseLedger: async () => {
    return sendOnlineRequest('/reports/purchase-ledger');
  },

  // Sales Returns
  getSalesReturns: async () => {
    return sendOnlineRequest('/returns');
  },
  addSalesReturn: async (data) => {
    return sendOnlineRequest('/returns', { method: 'POST', body: JSON.stringify(data) });
  },

  // Warranty Cards
  getWarrantyCards: async (search = '', statusFilter = 'all') => {
    return sendOnlineRequest(`/warranty?search=${encodeURIComponent(search)}&status=${statusFilter}`);
  },

  // Stock Adjustment Log
  getStockAdjustmentLogs: async () => {
    return sendOnlineRequest('/inventory/adjustments');
  },
  adjustStock: async (watchId, status, reason, remarks) => {
    return sendOnlineRequest('/inventory/adjust', { method: 'POST', body: JSON.stringify({ watch_id: watchId, status, reason, remarks }) });
  },

  // Service Billing
  addServiceBill: async (jobId, actualCost, paymentMode, invoiceType = 'non-gst') => {
    return sendOnlineRequest('/services/bill', { method: 'POST', body: JSON.stringify({ job_id: jobId, actual_cost: actualCost, payment_mode: paymentMode, invoice_type: invoiceType }) });
  },

  // Watch Image Upload
  uploadWatchImages: async (watchId, base64Array) => {
    return sendOnlineRequest('/inventory/images', { method: 'POST', body: JSON.stringify({ watch_id: watchId, images: base64Array }) });
  },
  removeWatchImage: async (watchId, index) => {
    return sendOnlineRequest(`/inventory/${encodeURIComponent(watchId)}/images/${index}`, { method: 'DELETE' });
  }
};
