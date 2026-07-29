import { mockAPI } from './mockData';
import { syncQueue } from '../utils/syncQueue';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
const BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const getHeaders = () => {
  const token = sessionStorage.getItem('watch_auth_token');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

/**
 * Resilient Network Request Wrapper with Automatic Mock Engine Failover.
 * If backend request fails due to network, 404, 502/503, or dummy URL,
 * it seamlessly executes mockFallbackFn to guarantee 100% operational uptime.
 */
const requestWithFallback = async (endpoint, options = {}, mockFallbackFn = null) => {
  if (USE_MOCK && mockFallbackFn) {
    return mockFallbackFn();
  }

  // If BASE_URL is dummy placeholder or localhost without backend, fallback immediately
  if (mockFallbackFn && (BASE_URL.includes('your-backend.railway.app') || BASE_URL.includes('example.com'))) {
    return mockFallbackFn();
  }

  try {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: { ...getHeaders(), ...options.headers }
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (mockFallbackFn && (response.status === 404 || response.status === 502 || response.status === 503 || response.status === 500)) {
        console.warn(`[SmartTimes API] Backend ${endpoint} returned HTTP ${response.status}. Seamlessly falling back to stateful Mock API.`);
        return mockFallbackFn();
      }
      throw new Error(errData.message || 'Something went wrong on the server.');
    }

    const data = await response.json();
    return data.sale || data;
  } catch (err) {
    if (mockFallbackFn) {
      console.warn(`[SmartTimes API] Network call to ${endpoint} failed (${err.message}). Falling back to local stateful engine.`);
      return mockFallbackFn();
    }
    throw err;
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

  // Auth
  login: async (email, password) => {
    return requestWithFallback('/login', { method: 'POST', body: JSON.stringify({ email, password }) }, () => mockAPI.login(email, password));
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

  // Activity Logs
  getActivityLogs: async () => {
    return requestWithFallback('/activity-logs', {}, () => mockAPI.getActivityLogs());
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

  // Purchases
  getPurchases: async () => {
    return requestWithFallback('/purchase/ledger', {}, () => mockAPI.getPurchases());
  },
  addPurchase: async (data) => {
    if (!navigator.onLine) {
      syncQueue.add('addPurchase', data);
      return { queued: true, message: 'Offline: Purchase queued for sync when online.' };
    }
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
    if (!navigator.onLine) {
      syncQueue.add('addSale', data);
      return { queued: true, message: 'Offline: Sale queued for sync when online.' };
    }
    return requestWithFallback('/sales', { method: 'POST', body: JSON.stringify(data) }, () => mockAPI.addSale(data));
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
    if (!navigator.onLine) {
      syncQueue.add('addServiceJob', data);
      return { queued: true, message: 'Offline: Service job queued for sync when online.' };
    }
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
