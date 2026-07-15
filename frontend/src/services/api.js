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

const request = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: { ...getHeaders(), ...options.headers }
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Something went wrong on the server.');
  }
  return response.json();
};

export const api = {
  // Settings
  getSettings: async () => {
    if (USE_MOCK) return mockAPI.getSettings();
    return request('/settings');
  },
  saveSettings: async (data) => {
    if (USE_MOCK) return mockAPI.saveSettings(data);
    return request('/settings', { method: 'PUT', body: JSON.stringify(data) });
  },

  // Auth
  login: async (email, password) => {
    if (USE_MOCK) return mockAPI.login(email, password);
    return request('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  },

  // Users
  getUsers: async () => {
    if (USE_MOCK) return mockAPI.getUsers();
    return request('/users');
  },
  addUser: async (data) => {
    if (USE_MOCK) return mockAPI.addUser(data);
    return request('/users', { method: 'POST', body: JSON.stringify(data) });
  },
  updateUser: async (id, data) => {
    if (USE_MOCK) return mockAPI.updateUser(id, data);
    return request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  // Activity Logs
  getActivityLogs: async () => {
    if (USE_MOCK) return mockAPI.getActivityLogs();
    return request('/activity-logs');
  },

  // Customers
  getCustomers: async (search = '') => {
    if (USE_MOCK) return mockAPI.getCustomers(search);
    return request(`/customers?search=${encodeURIComponent(search)}`);
  },
  addCustomer: async (data) => {
    if (USE_MOCK) return mockAPI.addCustomer(data);
    return request('/customers', { method: 'POST', body: JSON.stringify(data) });
  },
  updateCustomer: async (id, data) => {
    if (USE_MOCK) return mockAPI.updateCustomer(id, data);
    return request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  getCustomerHistory: async (id) => {
    if (USE_MOCK) return mockAPI.getCustomerHistory(id);
    return request(`/customers/${id}/history`);
  },

  // Inventory
  getInventory: async (search = '', status = '') => {
    if (USE_MOCK) return mockAPI.getInventory(search, status);
    return request(`/inventory?search=${encodeURIComponent(search)}&status=${status}`);
  },
  updateWatch: async (watchId, data) => {
    if (USE_MOCK) return mockAPI.updateWatch(watchId, data);
    return request(`/inventory/${encodeURIComponent(watchId)}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  // Purchases
  getPurchases: async () => {
    if (USE_MOCK) return mockAPI.getPurchases();
    return request('/purchase/ledger');
  },
  addPurchase: async (data) => {
    if (USE_MOCK) return mockAPI.addPurchase(data);
    if (!navigator.onLine) {
      syncQueue.add('addPurchase', data);
      return { queued: true, message: 'Offline: Purchase queued for sync when online.' };
    }
    return request('/purchase', { method: 'POST', body: JSON.stringify(data) });
  },
  updatePurchasePayment: async (id, paymentStatus) => {
    if (USE_MOCK) return mockAPI.updatePurchasePayment(id, paymentStatus);
    return request(`/purchase/${id}/payment`, { method: 'PUT', body: JSON.stringify({ payment_status: paymentStatus }) });
  },

  // Sales
  getSales: async (search = '') => {
    if (USE_MOCK) return mockAPI.getSales(search);
    return request(`/sales?search=${encodeURIComponent(search)}`);
  },
  getSale: async (id) => {
    if (USE_MOCK) return mockAPI.getSale(id);
    return request(`/sales/${id}`);
  },
  addSale: async (data) => {
    if (USE_MOCK) return mockAPI.addSale(data);
    if (!navigator.onLine) {
      syncQueue.add('addSale', data);
      return { queued: true, message: 'Offline: Sale queued for sync when online.' };
    }
    return request('/sales', { method: 'POST', body: JSON.stringify(data) });
  },

  // Exchanges
  getExchanges: async () => {
    if (USE_MOCK) return mockAPI.getExchanges();
    return request('/exchanges');
  },
  addExchange: async (data) => {
    if (USE_MOCK) return mockAPI.addExchange(data);
    return request('/exchanges', { method: 'POST', body: JSON.stringify(data) });
  },
  approveExchangeReview: async (id, status) => {
    if (USE_MOCK) return mockAPI.approveExchangeReview(id, status);
    return request(`/exchanges/${id}/approve`, { method: 'POST', body: JSON.stringify({ status }) });
  },

  // Services
  getServiceJobs: async (search = '', status = '') => {
    if (USE_MOCK) return mockAPI.getServiceJobs(search, status);
    return request(`/services?search=${encodeURIComponent(search)}&status=${status}`);
  },
  addServiceJob: async (data) => {
    if (USE_MOCK) return mockAPI.addServiceJob(data);
    if (!navigator.onLine) {
      syncQueue.add('addServiceJob', data);
      return { queued: true, message: 'Offline: Service job queued for sync when online.' };
    }
    return request('/services', { method: 'POST', body: JSON.stringify(data) });
  },
  updateServiceJobStatus: async (id, status, actualCost = null) => {
    if (USE_MOCK) return mockAPI.updateServiceJobStatus(id, status, actualCost);
    return request(`/services/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, actual_cost: actualCost }) });
  },

  // Dashboard
  getDashboardStats: async (role = 'sales') => {
    if (USE_MOCK) return mockAPI.getDashboardStats(role);
    return request('/dashboard');
  },

  // Reports
  getStockValuation: async () => {
    if (USE_MOCK) return mockAPI.getStockValuation();
    return request('/reports/stock-valuation');
  },
  getSalesReport: async (startDate, endDate) => {
    if (USE_MOCK) return mockAPI.getSalesReport(startDate, endDate);
    return request(`/reports/sales?start_date=${startDate || ''}&end_date=${endDate || ''}`);
  },
  getProfitReport: async (startDate, endDate) => {
    if (USE_MOCK) return mockAPI.getProfitReport(startDate, endDate);
    return request(`/reports/profit?start_date=${startDate || ''}&end_date=${endDate || ''}`);
  },
  getExchangeReport: async () => {
    if (USE_MOCK) return mockAPI.getExchangeReport();
    return request('/reports/exchanges');
  },
  getLoyaltyReport: async () => {
    if (USE_MOCK) return mockAPI.getLoyaltyReport();
    return request('/reports/loyalty');
  },
  getPendingServiceReport: async () => {
    if (USE_MOCK) return mockAPI.getPendingServiceReport();
    return request('/reports/services-pending');
  },
  getSupplierDuesReport: async () => {
    if (USE_MOCK) return mockAPI.getSupplierDuesReport();
    return request('/reports/supplier-dues');
  },
  getGstReport: async (month, year) => {
    if (USE_MOCK) return mockAPI.getGstReport(month, year);
    return request(`/reports/gst?month=${month}&year=${year}`);
  },
  getPurchaseLedger: async () => {
    if (USE_MOCK) return mockAPI.getPurchaseLedger();
    return request('/reports/purchase-ledger');
  },

  // Sales Returns
  getSalesReturns: async () => {
    if (USE_MOCK) return mockAPI.getSalesReturns();
    return request('/returns');
  },
  addSalesReturn: async (data) => {
    if (USE_MOCK) return mockAPI.addSalesReturn(data);
    return request('/returns', { method: 'POST', body: JSON.stringify(data) });
  },

  // Warranty Cards
  getWarrantyCards: async (search = '', statusFilter = 'all') => {
    if (USE_MOCK) return mockAPI.getWarrantyCards(search, statusFilter);
    return request(`/warranty?search=${encodeURIComponent(search)}&status=${statusFilter}`);
  },

  // Stock Adjustment Log
  getStockAdjustmentLogs: async () => {
    if (USE_MOCK) return mockAPI.getStockAdjustmentLogs();
    return request('/inventory/adjustments');
  },
  adjustStock: async (watchId, status, reason, remarks) => {
    if (USE_MOCK) return mockAPI.adjustStockWithLog(watchId, status, reason, remarks);
    return request('/inventory/adjust', { method: 'POST', body: JSON.stringify({ watch_id: watchId, status, reason, remarks }) });
  },

  // Service Billing
  addServiceBill: async (jobId, actualCost, paymentMode) => {
    if (USE_MOCK) return mockAPI.addServiceBill(jobId, actualCost, paymentMode);
    return request('/services/bill', { method: 'POST', body: JSON.stringify({ job_id: jobId, actual_cost: actualCost, payment_mode: paymentMode }) });
  },

  // Watch Image Upload
  uploadWatchImages: async (watchId, base64Array) => {
    if (USE_MOCK) return mockAPI.uploadWatchImages(watchId, base64Array);
    return request('/inventory/images', { method: 'POST', body: JSON.stringify({ watch_id: watchId, images: base64Array }) });
  },
  removeWatchImage: async (watchId, index) => {
    if (USE_MOCK) return mockAPI.removeWatchImage(watchId, index);
    return request(`/inventory/${encodeURIComponent(watchId)}/images/${index}`, { method: 'DELETE' });
  }
};

