import { mockAPI } from './mockData';
import { syncQueue } from '../utils/syncQueue';
import { alertService } from '../utils/alert';

const getHeaders = () => {
  const token = localStorage.getItem('watch_auth_token');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
// Enabled local mock mode if explicitly set, or default to true on local if server is offline
const USE_MOCK_ONLY = import.meta.env.VITE_USE_MOCK === 'true' || import.meta.env.VITE_USE_MOCK === true;

/**
 * Smart Times POS — Resilient Online & Local Fail-Safe API Engine
 * Runs completely locally with in-browser mock database when VITE_USE_MOCK is true or
 * when the online/local server is unreachable.
 */
const requestWithFallback = async (endpoint, options = {}, mockFallbackFn) => {
  if (USE_MOCK_ONLY && mockFallbackFn) {
    return Promise.resolve(mockFallbackFn());
  }

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

    // Fall back to local mock database if available
    if (mockFallbackFn) {
      console.warn(`[Local Fallback] Server unreachable (${err.message}) for ${endpoint}. Running local database.`);
      return Promise.resolve(mockFallbackFn());
    }

    const isNetworkError = err.message === 'Failed to fetch' || err.message.includes('NetworkError');
    const isServerError = err.message.includes('API error 5');

    if (isNetworkError) {
      alertService.error('Connection Lost', 'Unable to connect to the server. Running in local mode.');
    } else if (isServerError || err.message.includes('Maintenance')) {
      alertService.warning('Server Maintenance', 'The server is currently under maintenance. Please try again later.');
    } else if (err.message.includes('API error 404')) {
      alertService.warning('Not Found', 'The requested resource was not found on the server.');
    } else {
      console.error('API Request Failed:', err.message);
    }

    throw new Error(err.message || `Unable to reach server at ${API_BASE_URL}`);
  }
};

export const api = {
  // Settings
  getSettings: async () => {
    return requestWithFallback('/settings', {}, () => mockAPI.getSettings());
  },
  saveSettings: async (data) => {
    return requestWithFallback('/settings', { method: 'PUT', body: JSON.stringify(data) }, () => mockAPI.saveSettings(data));
  },
  resetDatabase: async (otp = null) => {
    return requestWithFallback('/settings/reset-database', { method: 'POST', body: JSON.stringify({ otp }) }, () => mockAPI.resetDatabase(otp));
  },
  exportDatabase: async () => {
    return requestWithFallback('/settings/export-database', {}, () => mockAPI.exportDatabase());
  },
  importDatabase: async (data) => {
    return requestWithFallback('/settings/import-database', { method: 'POST', body: JSON.stringify(data) }, () => mockAPI.importDatabase(data));
  },

  // Auth
  login: async (email, password, force = false, clientInfo = null) => {
    return requestWithFallback('/login', { method: 'POST', body: JSON.stringify({ email, password, force, clientInfo }) }, () => mockAPI.login(email, password, force, clientInfo));
  },
  checkSession: async (userId, token) => {
    return requestWithFallback('/me', {}, () => mockAPI.verifyActiveSession(userId, token));
  },
  getActiveSessionInfo: async (userId) => {
    return requestWithFallback('/me/session', {}, () => mockAPI.getActiveSessionInfo(userId));
  },
  logout: async (userId) => {
    try {
      await requestWithFallback('/logout', { method: 'POST' }, () => mockAPI.clearActiveSession(userId));
    } catch (e) { /* ignore logout errors */ }
  },

  // Users
  getUsers: async () => {
    return requestWithFallback('/users', {}, () => mockAPI.getUsers());
  },
  addUser: async (data) => {
    return requestWithFallback('/users', { method: 'POST', body: JSON.stringify(data) }, () => mockAPI.addUser(data));
  },
  updateUser: async (id, data) => {
    return requestWithFallback(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }, () => mockAPI.updateUser(id, data));
  },
  deleteUser: async (id) => {
    return requestWithFallback(`/users/${id}`, { method: 'DELETE' }, () => mockAPI.deleteUser(id));
  },
  getActivityLogs: async () => {
    return requestWithFallback('/activity-logs', {}, () => mockAPI.getActivityLogs());
  },

  // Attendance & Payroll
  getAttendance: async (date = '') => {
    return requestWithFallback(`/attendance?date=${encodeURIComponent(date)}`, {}, () => mockAPI.getAttendance(date));
  },
  saveAttendance: async (date, records) => {
    return requestWithFallback('/attendance', { method: 'POST', body: JSON.stringify({ date, records }) }, () => mockAPI.saveAttendance(date, records));
  },
  getMonthlyAttendanceMatrix: async (month, year) => {
    return requestWithFallback(`/attendance/matrix?month=${month}&year=${year}`, {}, () => mockAPI.getMonthlyAttendanceMatrix(month, year));
  },
  saveSingleAttendance: async (data) => {
    return requestWithFallback('/attendance/single', { method: 'POST', body: JSON.stringify(data) }, () => mockAPI.saveSingleAttendance(data));
  },
  getPayroll: async (month, year) => {
    return requestWithFallback(`/payroll?month=${month}&year=${year}`, {}, () => mockAPI.getPayroll(month, year));
  },
  paySalary: async (data) => {
    return requestWithFallback('/payroll/pay', { method: 'POST', body: JSON.stringify(data) }, () => mockAPI.paySalary(data));
  },

  // Customers
  getCustomers: async (search = '') => {
    return requestWithFallback(`/customers?search=${encodeURIComponent(search)}`, {}, () => mockAPI.getCustomers(search));
  },
  addCustomer: async (data) => {
    return requestWithFallback('/customers', { method: 'POST', body: JSON.stringify(data) }, () => mockAPI.addCustomer(data));
  },
  updateCustomer: async (id, data) => {
    return requestWithFallback(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }, () => mockAPI.updateCustomer(id, data));
  },
  getCustomerHistory: async (id) => {
    return requestWithFallback(`/customers/${id}/history`, {}, () => mockAPI.getCustomerHistory(id));
  },

  // Inventory
  getInventory: async (search = '', status = '') => {
    return requestWithFallback(`/inventory?search=${encodeURIComponent(search)}&status=${status}`, {}, () => mockAPI.getInventory(search, status));
  },
  updateWatch: async (watchId, data) => {
    return requestWithFallback(`/inventory/${encodeURIComponent(watchId)}`, { method: 'PUT', body: JSON.stringify(data) }, () => mockAPI.updateWatch(watchId, data));
  },
  updateWatchGroup: async (data) => {
    return requestWithFallback('/inventory/group', { method: 'PUT', body: JSON.stringify(data) }, () => mockAPI.updateWatchGroup(data));
  },

  // Purchases
  getPurchases: async () => {
    return requestWithFallback('/purchase/ledger', {}, () => mockAPI.getPurchases());
  },
  addPurchase: async (data) => {
    return requestWithFallback('/purchase', { method: 'POST', body: JSON.stringify(data) }, () => mockAPI.addPurchase(data));
  },
  updatePurchasePayment: async (id, paymentStatus) => {
    return requestWithFallback(`/purchase/${id}/payment`, { method: 'PUT', body: JSON.stringify({ payment_status: paymentStatus }) }, () => mockAPI.updatePurchasePayment(id, paymentStatus));
  },

  // Sales
  getSales: async (search = '') => {
    return requestWithFallback(`/sales?search=${encodeURIComponent(search)}`, {}, () => mockAPI.getSales(search));
  },
  getSale: async (id) => {
    return requestWithFallback(`/sales/${id}`, {}, () => mockAPI.getSale(id));
  },
  addSale: async (data) => {
    return requestWithFallback('/sales', { method: 'POST', body: JSON.stringify(data) }, () => mockAPI.addSale(data));
  },
  settleSaleDebt: async (id, paymentMode) => {
    return requestWithFallback(`/sales/${id}/settle`, { method: 'POST', body: JSON.stringify({ payment_mode: paymentMode }) }, () => mockAPI.settleSaleDebt(id, paymentMode));
  },

  // Exchanges
  getExchanges: async () => {
    return requestWithFallback('/exchanges', {}, () => mockAPI.getExchanges());
  },
  addExchange: async (data) => {
    return requestWithFallback('/exchanges', { method: 'POST', body: JSON.stringify(data) }, () => mockAPI.addExchange(data));
  },
  approveExchangeReview: async (id, status) => {
    return requestWithFallback(`/exchanges/${id}/approve`, { method: 'POST', body: JSON.stringify({ status }) }, () => mockAPI.approveExchangeReview(id, status));
  },

  // Services
  getServiceJobs: async (search = '', status = '') => {
    return requestWithFallback(`/services?search=${encodeURIComponent(search)}&status=${status}`, {}, () => mockAPI.getServiceJobs(search, status));
  },
  addServiceJob: async (data) => {
    return requestWithFallback('/services', { method: 'POST', body: JSON.stringify(data) }, () => mockAPI.addServiceJob(data));
  },
  updateServiceJobStatus: async (id, status, actualCost = null) => {
    return requestWithFallback(`/services/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, actual_cost: actualCost }) }, () => mockAPI.updateServiceJobStatus(id, status, actualCost));
  },

  // Dashboard
  getDashboardStats: async (role = 'sales') => {
    return requestWithFallback('/dashboard', {}, () => mockAPI.getDashboardStats(role));
  },

  // Reports
  getStockValuation: async () => {
    return requestWithFallback('/reports/stock-valuation', {}, () => mockAPI.getStockValuation());
  },
  getSalesReport: async (startDate, endDate) => {
    return requestWithFallback(`/reports/sales?start_date=${startDate || ''}&end_date=${endDate || ''}`, {}, () => mockAPI.getSalesReport(startDate, endDate));
  },
  getProfitReport: async (startDate, endDate) => {
    return requestWithFallback(`/reports/profit?start_date=${startDate || ''}&end_date=${endDate || ''}`, {}, () => mockAPI.getProfitReport(startDate, endDate));
  },
  getExchangeReport: async () => {
    return requestWithFallback('/reports/exchanges', {}, () => mockAPI.getExchangeReport());
  },
  getLoyaltyReport: async () => {
    return requestWithFallback('/reports/loyalty', {}, () => mockAPI.getLoyaltyReport());
  },
  getPendingServiceReport: async () => {
    return requestWithFallback('/reports/services-pending', {}, () => mockAPI.getPendingServiceReport());
  },
  getSupplierDuesReport: async () => {
    return requestWithFallback('/reports/supplier-dues', {}, () => mockAPI.getSupplierDuesReport());
  },
  getGstReport: async (month, year) => {
    return requestWithFallback(`/reports/gst?month=${month}&year=${year}`, {}, () => mockAPI.getGstReport(month, year));
  },
  getPurchaseLedger: async () => {
    return requestWithFallback('/reports/purchase-ledger', {}, () => mockAPI.getPurchaseLedger());
  },

  // Sales Returns
  getSalesReturns: async () => {
    return requestWithFallback('/returns', {}, () => mockAPI.getSalesReturns());
  },
  addSalesReturn: async (data) => {
    return requestWithFallback('/returns', { method: 'POST', body: JSON.stringify(data) }, () => mockAPI.addSalesReturn(data));
  },

  // Warranty Cards
  getWarrantyCards: async (search = '', statusFilter = 'all') => {
    return requestWithFallback(`/warranty?search=${encodeURIComponent(search)}&status=${statusFilter}`, {}, () => mockAPI.getWarrantyCards(search, statusFilter));
  },

  // Stock Adjustment Log
  getStockAdjustmentLogs: async () => {
    return requestWithFallback('/inventory/adjustments', {}, () => mockAPI.getStockAdjustmentLogs());
  },
  adjustStock: async (watchId, status, reason, remarks) => {
    return requestWithFallback('/inventory/adjust', { method: 'POST', body: JSON.stringify({ watch_id: watchId, status, reason, remarks }) }, () => mockAPI.adjustStockWithLog(watchId, status, reason, remarks));
  },

  // Service Billing
  addServiceBill: async (jobId, actualCost, paymentMode, invoiceType = 'non-gst') => {
    return requestWithFallback('/services/bill', { method: 'POST', body: JSON.stringify({ job_id: jobId, actual_cost: actualCost, payment_mode: paymentMode, invoice_type: invoiceType }) }, () => mockAPI.addServiceBill(jobId, actualCost, paymentMode));
  },

  // Watch Image Upload
  uploadWatchImages: async (watchId, base64Array) => {
    return requestWithFallback('/inventory/images', { method: 'POST', body: JSON.stringify({ watch_id: watchId, images: base64Array }) }, () => mockAPI.uploadWatchImages(watchId, base64Array));
  },
  removeWatchImage: async (watchId, index) => {
    return requestWithFallback(`/inventory/${encodeURIComponent(watchId)}/images/${index}`, { method: 'DELETE' }, () => mockAPI.removeWatchImage(watchId, index));
  }
};
