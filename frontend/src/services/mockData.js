// Stateful Mock Database for Offline / Local testing (syncs to localStorage)
const STORAGE_KEY = 'watch_showroom_db';

const defaultDB = {
  settings: {
    store_name: 'Smart Times',
    tagline: 'Watch Showroom & Service',
    gstin: '33EJBPA4537C1ZW',
    address: '108, Pennagaram Main Road, (Next to R.C. Chruch), DHARMAPURI - 636 701.',
    phone: '97512 85945, 86672 88021',
    email: 'info@smarttimes.in',
    exchange_window_days: 7,
    loyalty_earn_rate: 1,   // 1 point per ₹100
    loyalty_redeem_rate: 1, // 1 point = ₹1
    loyalty_expiry_months: 12,
    warranty_period_months: 12,
    gst_invoice_prefix: 'ST-GST',
    nongst_invoice_prefix: 'ST-RETL',
    job_card_prefix: 'JC',
    job_card_terms: '1. All service charges are estimates. Actual costs might vary up to 15%.\n2. Smart Times is not responsible for watches left unclaimed for more than 90 days.\n3. Warranty on serviced parts is 90 days from delivery date.',
    logo_url: null
  },
  users: [
    { id: 1, name: 'Ram Srinivash (Admin)', email: 'admin@smarttimes.in', password: 'admin123', role: 'admin', base_salary: 30000, created_at: '2026-07-01' },
    { id: 2, name: 'Store Manager', email: 'manager@smarttimes.in', password: 'manager123', role: 'manager', base_salary: 28000, created_at: '2026-07-01' },
    { id: 3, name: 'Sales Counter', email: 'sales@smarttimes.in', password: 'sales123', role: 'sales', base_salary: 22000, created_at: '2026-07-01' },
    { id: 4, name: 'Suresh', email: 'suresh@smarttimes.in', password: 'suresh123', role: 'sales', base_salary: 25000, created_at: '2026-08-01' }
  ],
  activity_logs: [],
  customers: [
    { id: 1, name: 'Walk-in Customer', phone: '9999999999', alt_phone: '', email: 'walkin@smarttimes.in', address: 'Counter Sale', dob: null, anniversary: null, points_balance: 0, tags: 'Walk-in', notes: 'Default billing account for unregistered walk-ins.', outstanding_dues: 0, id_proof: '' }
  ],
  purchases: [],
  watches: [],
  sales: [],
  sale_items: [],
  exchanges: [],
  sales_returns: [],
  warranty_cards: [],
  stock_adjustments: [],
  service_jobs: [],
  loyalty_ledgers: [],
  attendance: [],
  payroll: []
};

export const resetDatabase = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultDB));
  localStorage.setItem('watch_db_version', 'v2_clean');
  return JSON.parse(JSON.stringify(defaultDB));
};

export const loadDB = () => {
  const version = localStorage.getItem('watch_db_version');
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data || version !== 'v2_clean') {
    return resetDatabase();
  }
  const db = JSON.parse(data);
  if (!db.attendance) db.attendance = [];
  if (!db.payroll) db.payroll = [];

  // Auto-apply current correct store info
  if (db.settings) {
    db.settings.store_name = defaultDB.settings.store_name;
    db.settings.tagline = defaultDB.settings.tagline;
    db.settings.gstin = defaultDB.settings.gstin;
    db.settings.address = defaultDB.settings.address;
    db.settings.phone = defaultDB.settings.phone;
    db.settings.email = defaultDB.settings.email;
  }

  // Ensure default staff accounts are present
  if (db.users) {
    defaultDB.users.forEach(defaultUser => {
      const existing = db.users.find(u => u.email && u.email.toLowerCase() === defaultUser.email.toLowerCase());
      if (!existing) {
        db.users.push(defaultUser);
      }
    });

    db.users.forEach(u => {
      if (u.role === 'admin' && (u.base_salary > 100000 || !u.base_salary)) {
        u.base_salary = 30000;
      }
      if (u.base_salary === undefined || u.base_salary === null) {
        u.base_salary = 0;
      }
    });
  }
  saveDB(db);
  return db;
};

const saveDB = (db) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

// Helper: always returns local date string in YYYY-MM-DD (IST-safe, no UTC offset bug)
const localDateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const logActivity = (db, userId, action, module, details) => {
  db.activity_logs.push({
    id: db.activity_logs.length + 1,
    user_id: userId,
    action,
    module,
    details,
    created_at: new Date().toISOString()
  });
};

// Helper matching PHP's isset — checks value is defined and not null
const isset = (val) => val !== undefined && val !== null;


export const mockAPI = {
  // Settings
  getSettings: () => {
    const db = loadDB();
    return db.settings;
  },

  saveSettings: (data) => {
    const db = loadDB();
    db.settings = { ...db.settings, ...data };
    saveDB(db);
    return db.settings;
  },

  resetDatabase: () => {
    return resetDatabase();
  },

  // Authentication
  login: (email, password) => {
    const db = loadDB();
    const cleanEmail = (email || '').trim().toLowerCase();
    const user = db.users.find(u => u.email && u.email.toLowerCase() === cleanEmail && u.password === password);
    if (!user) throw new Error('Invalid email or password.');
    
    const sessionToken = `mock-session-${user.id}-${Date.now()}`;
    if (!db.active_sessions) db.active_sessions = {};
    db.active_sessions[user.id] = sessionToken;

    logActivity(db, user.id, 'LOGIN', 'Auth', `User ${user.name} logged in (Session: ${sessionToken})`);
    saveDB(db);
    return {
      access_token: sessionToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    };
  },

  verifyActiveSession: (userId, currentToken) => {
    const db = loadDB();
    if (!userId || !currentToken) return { valid: true };
    if (db.active_sessions && db.active_sessions[userId]) {
      const activeToken = db.active_sessions[userId];
      if (activeToken !== currentToken) {
        throw new Error('SESSION_TERMINATED');
      }
    }
    return { valid: true };
  },

  // User Management (Admin only)
  getUsers: () => {
    const db = loadDB();
    return db.users.map(u => ({ ...u, password: undefined }));
  },

  addUser: (data, adminId) => {
    const db = loadDB();
    const cleanEmail = (data.email || '').trim().toLowerCase();
    const existing = db.users.find(u => u.email && u.email.toLowerCase() === cleanEmail);
    if (existing) throw new Error(`A staff account with email "${data.email}" already exists.`);

    const salaryVal = (data.base_salary !== undefined && data.base_salary !== '' && !isNaN(data.base_salary))
      ? Number(data.base_salary)
      : 0;

    let maxId = 0;
    db.users.forEach(u => {
      const nid = Number(u.id);
      if (!isNaN(nid) && nid > maxId) maxId = nid;
    });

    const newUser = {
      id: maxId + 1,
      name: data.name,
      email: data.email.trim(),
      password: data.password,
      role: data.role || 'sales',
      base_salary: salaryVal,
      created_at: localDateStr()
    };
    db.users.push(newUser);
    logActivity(db, adminId || 1, 'CREATE', 'Users', `Created staff account ${data.name} (${data.role}) — Salary: ₹${salaryVal.toLocaleString('en-IN')}`);
    saveDB(db);
    return { ...newUser, password: undefined };
  },

  updateUser: (userId, data, adminId) => {
    const db = loadDB();
    const idx = db.users.findIndex(u => u.id === Number(userId));
    if (idx === -1) throw new Error('User not found.');

    const newSalary = (data.base_salary !== undefined && data.base_salary !== null && data.base_salary !== '')
      ? Number(data.base_salary)
      : (db.users[idx].base_salary || 0);

    db.users[idx] = {
      ...db.users[idx],
      name: data.name || db.users[idx].name,
      email: data.email || db.users[idx].email,
      role: data.role || db.users[idx].role,
      base_salary: newSalary
    };

    if (data.password) {
      db.users[idx].password = data.password;
    }

    logActivity(db, adminId || userId, 'UPDATE', 'Users', `Updated ${db.users[idx].name} — Salary set to ₹${newSalary.toLocaleString('en-IN')}`);
    saveDB(db);
    return { ...db.users[idx], password: undefined };
  },

  deleteUser: (userId, adminId) => {
    const db = loadDB();
    const target = String(userId).toLowerCase();
    const idx = db.users.findIndex(u => 
      String(u.id).toLowerCase() === target || 
      (u.email && u.email.toLowerCase() === target) ||
      (u.name && u.name.toLowerCase() === target)
    );
    if (idx !== -1) {
      const userName = db.users[idx].name;
      db.users.splice(idx, 1);
      logActivity(db, adminId || 1, 'DELETE', 'Users', `Removed staff account "${userName}"`);
      saveDB(db);
    }
    return { success: true };
  },

  // Activity Logs
  getActivityLogs: () => {
    const db = loadDB();
    return db.activity_logs.slice().reverse().map(log => {
      const user = db.users.find(u => u.id === log.user_id);
      return { ...log, user };
    });
  },

  // Customers
  getCustomers: (search = '') => {
    const db = loadDB();
    let list = db.customers;
    if (search) {
      const lower = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(lower) ||
        c.phone.includes(lower) ||
        (c.email && c.email.toLowerCase().includes(lower))
      );
    }
    return list;
  },

  addCustomer: (data, userId = 1) => {
    const db = loadDB();
    const cleanP = (data.phone || '').replace(/\D/g, '');
    const existing = db.customers.find(c => c.phone === data.phone || (cleanP && c.phone.replace(/\D/g, '') === cleanP));
    if (existing) return existing;
    const newCustomer = {
      id: db.customers.length + 1,
      name: data.name,
      phone: data.phone,
      alt_phone: data.alt_phone || '',
      email: data.email || '',
      address: data.address || '',
      dob: data.dob || null,
      anniversary: data.anniversary || null,
      points_balance: 0,
      tags: data.tags || 'Regular',
      notes: data.notes || '',
      outstanding_dues: 0,
      id_proof: data.id_proof || ''
    };
    db.customers.push(newCustomer);
    logActivity(db, userId, 'CREATE', 'Customers', `Created customer ${data.name}`);
    saveDB(db);
    return newCustomer;
  },

  updateCustomer: (id, data, userId = 1) => {
    const db = loadDB();
    const idx = db.customers.findIndex(c => c.id === Number(id));
    if (idx === -1) throw new Error('Customer not found.');
    db.customers[idx] = { ...db.customers[idx], ...data };
    logActivity(db, userId, 'UPDATE', 'Customers', `Updated customer ${db.customers[idx].name}`);
    saveDB(db);
    return db.customers[idx];
  },

  getCustomerHistory: (customerId) => {
    const db = loadDB();
    const sales = db.sales.filter(s => s.customer_id === Number(customerId));
    const exchanges = db.exchanges.filter(ex => {
      const sale = db.sales.find(s => s.id === ex.original_sale_id);
      return sale && sale.customer_id === Number(customerId);
    });
    return {
      sales: sales.map(s => {
        const items = db.sale_items.filter(si => si.sale_id === s.id).map(si => {
          const watch = db.watches.find(w => w.id === si.watch_id);
          return { ...si, watch };
        });
        return { ...s, items };
      }),
      exchanges
    };
  },

  // Inventory
  getInventory: (search = '', status = '') => {
    const db = loadDB();
    let list = db.watches;
    if (status) list = list.filter(w => w.status === status);
    if (search) {
      const lower = search.toLowerCase();
      list = list.filter(w =>
        w.id.toLowerCase().includes(lower) ||
        w.brand.toLowerCase().includes(lower) ||
        w.model.toLowerCase().includes(lower) ||
        (w.category && w.category.toLowerCase().includes(lower))
      );
    }
    return list.map(w => {
      const purchase = db.purchases.find(p => p.id === w.purchase_id);
      return { ...w, purchase };
    });
  },

  updateWatch: (watchId, data, userId = 1) => {
    const db = loadDB();
    const idx = db.watches.findIndex(w => w.id === watchId);
    if (idx === -1) throw new Error('Watch not found.');
    db.watches[idx] = { ...db.watches[idx], ...data };
    logActivity(db, userId, 'UPDATE', 'Inventory', `Updated watch ${watchId}`);
    saveDB(db);
    return db.watches[idx];
  },

  adjustStock: (watchId, status, userId = 1) => {
    const db = loadDB();
    const watch = db.watches.find(w => w.id === watchId);
    if (!watch) throw new Error('Watch not found.');
    watch.status = status;
    logActivity(db, userId, 'ADJUST', 'Inventory', `Adjusted watch ${watchId} to status: ${status}`);
    saveDB(db);
    return watch;
  },

  // Purchases
  getPurchases: () => {
    const db = loadDB();
    return db.purchases.map(p => {
      const watches = db.watches.filter(w => w.purchase_id === p.id);
      return { ...p, watches };
    });
  },

  addPurchase: (data, userId = 1) => {
    const db = loadDB();
    const newPurchaseId = db.purchases.length + 1;
    let totalVal = 0;

    // Case-insensitive supplier deduplication
    const existingSupplierName = db.purchases.find(p => p.supplier_name.toLowerCase() === data.supplier_name.toLowerCase())?.supplier_name;
    const finalSupplierName = existingSupplierName || data.supplier_name;

    data.items.forEach(item => {
      const qty = isset(item.quantity) ? Number(item.quantity) : 1;

      for (let q = 0; q < qty; q++) {
        const watchId = (q === 0) ? item.id : `${item.id}-${q}`;
        
        const exists = db.watches.find(w => w.id === watchId);
        if (exists) throw new Error(`Watch with serial number "${watchId}" already exists in inventory.`);

        const newWatch = {
          id: watchId,
          purchase_id: newPurchaseId,
          brand: item.brand,
          model: item.model,
          category: item.category || '',
          gender: item.gender || '',
          strap_type: item.strap_type || '',
          dial_color: item.dial_color || '',
          movement_type: item.movement_type || '',
          mrp: Number(item.mrp),
          discount_percent: Number(item.discount_percent || 0),
          cost_price: Number(item.cost_price),
          selling_price: Number(item.selling_price),
          gst_rate: Number(item.gst_rate || 18),
          status: 'in_stock',
          image_urls: item.image_urls || [],
          hsn_code: item.hsn_code || '9102'
        };
        db.watches.push(newWatch);
        totalVal += newWatch.cost_price;
      }
    });

    const newPurchase = {
      id: newPurchaseId,
      supplier_name: finalSupplierName,
      purchase_date: data.purchase_date,
      invoice_number: data.invoice_number || '',
      total_amount: totalVal,
      payment_status: data.payment_status || 'paid',
      remarks: data.remarks || ''
    };

    db.purchases.push(newPurchase);
    logActivity(db, userId, 'CREATE', 'Purchase', `Recorded purchase from ${finalSupplierName} — Total Val: ₹${totalVal}`);
    saveDB(db);
    return { ...newPurchase, watches: db.watches.filter(w => w.purchase_id === newPurchaseId) };
  },

  updatePurchasePayment: (id, paymentStatus, userId = 1) => {
    const db = loadDB();
    const purchase = db.purchases.find(p => p.id === Number(id));
    if (!purchase) throw new Error('Purchase not found.');
    purchase.payment_status = paymentStatus;
    logActivity(db, userId, 'UPDATE', 'Purchase', `Marked purchase ${id} as ${paymentStatus}`);
    saveDB(db);
    return purchase;
  },

  // Sales
  getSales: (search = '') => {
    const db = loadDB();
    let list = db.sales;
    if (search) {
      const lower = search.toLowerCase();
      list = list.filter(s =>
        s.id.toLowerCase().includes(lower) ||
        db.customers.find(c => c.id === s.customer_id)?.name.toLowerCase().includes(lower) ||
        db.customers.find(c => c.id === s.customer_id)?.phone.includes(lower)
      );
    }
    return list.map(s => {
      const customer = db.customers.find(c => c.id === s.customer_id);
      const user = db.users.find(u => u.id === s.user_id);
      const items = db.sale_items.filter(si => si.sale_id === s.id).map(si => {
        const watch = db.watches.find(w => w.id === si.watch_id);
        return { ...si, watch };
      });
      return { ...s, customer, user, items };
    }).sort((a, b) => b.id.localeCompare(a.id));
  },

  getSale: (id) => {
    const db = loadDB();
    const sale = db.sales.find(s => String(s.id).toLowerCase() === String(id).toLowerCase());
    if (!sale) throw new Error('Invoice not found.');
    const customer = db.customers.find(c => c.id === sale.customer_id) || { name: 'Walk-in Customer', phone: '9999999999' };
    const user = db.users.find(u => u.id === sale.user_id) || { name: 'Owner Admin' };
    const items = db.sale_items.filter(si => String(si.sale_id).toLowerCase() === String(sale.id).toLowerCase()).map(si => {
      const watch = db.watches.find(w => w.id === si.watch_id) || { brand: 'Showroom Watch', model: si.watch_id, selling_price: si.price_sold };
      return { ...si, watch };
    });
    return { ...sale, customer, user, items };
  },

  addSale: (data, userId = 3) => {
    const db = loadDB();
    const now = new Date();
    const settings = db.settings;
    
    const getLocalDateStr = (d = new Date()) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const todayStr = getLocalDateStr(now);

    // Customer resolution logic
    let customer = null;
    if (data.customer_id) {
      customer = db.customers.find(c => String(c.id) === String(data.customer_id));
    }
    if (!customer && data.customer_phone) {
      const cleanP = String(data.customer_phone).replace(/\D/g, '');
      if (cleanP) {
        customer = db.customers.find(c => String(c.phone).replace(/\D/g, '').includes(cleanP));
      }
    }
    if (!customer) {
      customer = db.customers.find(c => c.id === 1) || db.customers[0] || { id: 1, name: data.customer_name || 'Walk-in Customer', phone: data.customer_phone || '9999999999', points_balance: 0 };
    }

    const finalCustName = data.customer_name || customer.name;
    const finalCustPhone = data.customer_phone || customer.phone;
    if (customer && data.customer_name && customer.name === 'Walk-in Customer') {
      customer.name = data.customer_name;
      customer.phone = finalCustPhone;
    }

    // Unique non-colliding invoice ID generation
    const prefix = data.invoice_type === 'gst' ? 'WS-GST-2627-' : 'WS-RETL-2627-';
    let maxNum = 0;
    db.sales.forEach(s => {
      const match = String(s.id).match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const invoiceId = `${prefix}${String(maxNum + 1).padStart(4, '0')}`;

    let subtotal = 0;
    let totalItemDiscounts = 0;
    let totalGst = 0;
    const itemsData = [];

    // First pass: collect watch items, calculate subtotal and item-level discounts
    const preparedItems = [];
    for (const itemInput of data.items) {
      let watch = db.watches.find(w => w.id === itemInput.watch_id || w.id.toLowerCase() === (itemInput.watch_id || '').toLowerCase());
      if (!watch) {
        watch = {
          id: itemInput.watch_id,
          brand: itemInput.brand || 'Showroom Watch',
          model: itemInput.model || itemInput.watch_id,
          category: 'Wrist Watch',
          gender: 'Unisex',
          strap_type: 'Leather',
          dial_color: 'Black',
          movement_type: 'Quartz',
          mrp: itemInput.selling_price || 1000,
          cost_price: (itemInput.selling_price || 1000) * 0.7,
          selling_price: itemInput.selling_price || 1000,
          discount_percent: 0,
          additional_scheme: 0,
          gst_rate: itemInput.gst_rate || 18,
          hsn_code: '9102',
          supplier_name: 'Direct Showroom',
          purchase_date: todayStr,
          invoice_number: 'DIRECT',
          status: 'sold',
          image_urls: []
        };
        db.watches.push(watch);
      } else {
        watch.status = 'sold';
      }

      const itemDisc = Number(itemInput.discount_amount || 0);
      subtotal += watch.selling_price;
      totalItemDiscounts += itemDisc;
      preparedItems.push({ watch, itemDisc });
    }

    // Bill-level discount (flat amount or percentage)
    const billDiscFlat = Number(data.bill_discount_amount || 0);
    const billDiscPercent = Number(data.bill_discount_percent || 0);
    let billDiscAmount = billDiscFlat;
    if (billDiscPercent > 0) {
      billDiscAmount = ((subtotal - totalItemDiscounts) * billDiscPercent) / 100;
    }

    // Reward points redemption
    const redeemPoints = Math.min(Number(data.redeem_points || 0), customer.points_balance || 0);
    const pointsValue = redeemPoints * (settings.loyalty_redeem_rate || 1);

    // Manual Round Off / Adjustment
    const roundOffAmount = Number(data.round_off_amount || 0);

    const totalDiscount = totalItemDiscounts + billDiscAmount + pointsValue;
    const taxableBase = Math.max(0, subtotal - totalDiscount + roundOffAmount);

    // Second pass: Calculate GST per item based on allocated taxable base
    const totalInitialItemNet = preparedItems.reduce((acc, pi) => acc + (pi.watch.selling_price - pi.itemDisc), 0);
    for (const pi of preparedItems) {
      const { watch, itemDisc } = pi;
      const itemInitialNet = watch.selling_price - itemDisc;
      const allocatedItemBase = totalInitialItemNet > 0 ? (itemInitialNet * (taxableBase / totalInitialItemNet)) : (taxableBase / (preparedItems.length || 1));
      const gstAmt = data.invoice_type === 'gst' ? (allocatedItemBase * ((watch.gst_rate || 18) / 100)) : 0;

      itemsData.push({
        id: db.sale_items.length + itemsData.length + 1,
        sale_id: invoiceId,
        watch_id: watch.id,
        price_sold: watch.selling_price,
        discount_amount: itemDisc,
        cost_price: watch.cost_price,
        gst_rate: watch.gst_rate,
        gst_amount: gstAmt
      });

      totalGst += gstAmt;
    }

    const netAmount = data.invoice_type === 'gst' ? (taxableBase + totalGst) : taxableBase;

    // Credit sale tracking
    const isCreditSale = data.is_credit_sale || false;
    if (isCreditSale && netAmount > 0) {
      customer.outstanding_dues = (customer.outstanding_dues || 0) + netAmount;
    }

    if (redeemPoints > 0) {
      customer.points_balance -= redeemPoints;
      db.loyalty_ledgers.push({
        id: db.loyalty_ledgers.length + 1,
        customer_id: customer.id,
        points_earned: 0,
        points_redeemed: redeemPoints,
        transaction_type: 'redemption',
        reference_id: invoiceId,
        remarks: `Points redeemed on invoice ${invoiceId}`,
        created_at: todayStr
      });
    }

    const earnRate = settings.loyalty_earn_rate || 1;
    const pointsEarned = Math.floor(netAmount / 100 * earnRate);
    if (pointsEarned > 0) {
      customer.points_balance = (customer.points_balance || 0) + pointsEarned;
      db.loyalty_ledgers.push({
        id: db.loyalty_ledgers.length + 1,
        customer_id: customer.id,
        points_earned: pointsEarned,
        points_redeemed: 0,
        transaction_type: 'purchase',
        reference_id: invoiceId,
        remarks: `Points earned on invoice ${invoiceId}`,
        created_at: todayStr
      });
    }

    const newSale = {
      id: invoiceId,
      customer_id: customer.id,
      customer_name: finalCustName,
      customer_phone: finalCustPhone,
      user_id: userId,
      invoice_type: data.invoice_type,
      invoice_date: todayStr,
      subtotal,
      discount_amount: totalDiscount,
      bill_discount_amount: billDiscAmount,
      gst_amount: totalGst,
      points_redeemed: redeemPoints,
      points_value: pointsValue,
      round_off_amount: roundOffAmount,
      net_amount: netAmount,
      payment_mode: data.payment_mode,
      is_credit_sale: isCreditSale,
      notes: data.notes || ''
    };

    db.sales.push(newSale);
    db.sale_items.push(...itemsData);
    logActivity(db, userId, 'CREATE', 'Sales', `Invoice ${invoiceId} created — ₹${netAmount.toLocaleString()}`);
    saveDB(db);

    const fullItems = itemsData.map(si => ({
      ...si,
      watch: db.watches.find(w => w.id === si.watch_id) || { brand: 'Showroom Watch', model: si.watch_id, selling_price: si.price_sold }
    }));
    return {
      ...newSale,
      customer: { ...customer, name: finalCustName, phone: finalCustPhone },
      user: db.users.find(u => u.id === userId) || { name: 'Owner Admin' },
      items: fullItems
    };
  },

  // Exchanges
  getExchanges: () => {
    const db = loadDB();
    return db.exchanges.map(ex => {
      const returnedWatch = db.watches.find(w => w.id === ex.returned_watch_id);
      const replacementWatch = db.watches.find(w => w.id === ex.replacement_watch_id);
      const originalSale = db.sales.find(s => s.id === ex.original_sale_id);
      const customer = db.customers.find(c => c.id === (originalSale?.customer_id));
      const user = db.users.find(u => u.id === ex.created_by);
      return { ...ex, returnedWatch, replacementWatch, originalSale, customer, user };
    }).sort((a, b) => b.id - a.id);
  },

  addExchange: (data, userId = 3) => {
    const db = loadDB();
    const settings = db.settings;
    const originalSale = db.sales.find(s => s.id === data.original_sale_id);
    if (!originalSale) throw new Error('Original sale invoice not found.');

    // Exchange window check
    const saleDate = new Date(originalSale.invoice_date);
    const today = new Date();
    const daysDiff = Math.floor((today - saleDate) / (1000 * 60 * 60 * 24));
    const withinWindow = daysDiff <= (settings.exchange_window_days || 7);

    const returnedItem = db.sale_items.find(si => si.sale_id === originalSale.id && si.watch_id === data.returned_watch_id);
    if (!returnedItem) throw new Error('Returned watch not found on this invoice.');

    const replacementWatch = db.watches.find(w => w.id === data.replacement_watch_id);
    if (!replacementWatch || replacementWatch.status !== 'in_stock') {
      throw new Error('Replacement watch is not in stock.');
    }

    const returnedCredit = returnedItem.price_sold - returnedItem.discount_amount;
    const replacementCost = replacementWatch.selling_price;
    const difference = replacementCost - returnedCredit;

    const now = new Date();
    const nowStr = localDateStr(now);
    const year = now.getFullYear();
    const fy = (now.getMonth() + 1) >= 4 ? `${String(year).substring(2)}${String(year + 1).substring(2)}` : `${String(year - 1).substring(2)}${String(year).substring(2)}`;

    let replacementSaleId = null;
    let exchangeType = 'exchange_note';

    if (difference > 0) {
      exchangeType = originalSale.invoice_type === 'gst' ? 'tax_invoice' : 'exchange_note';
      const prefix = originalSale.invoice_type === 'gst'
        ? `${settings.gst_invoice_prefix}-${fy}-`
        : `${settings.nongst_invoice_prefix}-${fy}-`;
      const typeSales = db.sales.filter(s => s.id.startsWith(prefix));
      replacementSaleId = `${prefix}${String(typeSales.length + 1).padStart(4, '0')}`;

      const gstRate = replacementWatch.gst_rate;
      const gstAmt = originalSale.invoice_type === 'gst'
        ? (difference - (difference / (1 + (gstRate / 100))))
        : 0;

      db.sales.push({
        id: replacementSaleId,
        customer_id: originalSale.customer_id,
        user_id: userId,
        invoice_type: originalSale.invoice_type,
        invoice_date: nowStr,
        subtotal: replacementCost,
        discount_amount: returnedCredit,
        bill_discount_amount: 0,
        gst_amount: gstAmt,
        points_redeemed: 0,
        points_value: 0,
        net_amount: difference,
        payment_mode: 'split',
        is_credit_sale: false,
        notes: `Exchange diff — ref: ${originalSale.id}`
      });

      db.sale_items.push({
        id: db.sale_items.length + 1,
        sale_id: replacementSaleId,
        watch_id: replacementWatch.id,
        price_sold: replacementCost,
        discount_amount: returnedCredit,
        cost_price: replacementWatch.cost_price,
        gst_rate: replacementWatch.gst_rate,
        gst_amount: gstAmt
      });
    } else if (difference < 0) {
      exchangeType = 'credit_note';
    }

    const returnedWatch = db.watches.find(w => w.id === data.returned_watch_id);
    returnedWatch.status = 'exchanged_returned';
    replacementWatch.status = 'sold';

    const newExchange = {
      id: db.exchanges.length + 1,
      original_sale_id: originalSale.id,
      returned_watch_id: returnedWatch.id,
      replacement_sale_id: replacementSaleId,
      replacement_watch_id: replacementWatch.id,
      difference_amount: difference,
      exchange_type: exchangeType,
      exchange_date: nowStr,
      within_exchange_window: withinWindow,
      days_since_sale: daysDiff,
      created_by: userId,
      status: 'pending_review',
      remarks: data.remarks || ''
    };
    db.exchanges.push(newExchange);

    // Reverse loyalty points from original sale proportionally
    const customer = db.customers.find(c => c.id === originalSale.customer_id);
    const earnRate = settings.loyalty_earn_rate || 1;
    const reversedPoints = Math.floor(returnedCredit / 100 * earnRate);
    if (reversedPoints > 0 && customer.points_balance >= reversedPoints) {
      customer.points_balance -= reversedPoints;
      db.loyalty_ledgers.push({
        id: db.loyalty_ledgers.length + 1,
        customer_id: customer.id,
        points_earned: 0,
        points_redeemed: reversedPoints,
        transaction_type: 'refund',
        reference_id: originalSale.id,
        remarks: 'Points reversed — exchange return',
        created_at: nowStr
      });
    }

    if (difference > 0) {
      const newPoints = Math.floor(difference / 100 * earnRate);
      if (newPoints > 0) {
        customer.points_balance += newPoints;
        db.loyalty_ledgers.push({
          id: db.loyalty_ledgers.length + 1,
          customer_id: customer.id,
          points_earned: newPoints,
          points_redeemed: 0,
          transaction_type: 'purchase',
          reference_id: replacementSaleId,
          remarks: 'Points on exchange top-up',
          created_at: nowStr
        });
      }
    }

    logActivity(db, userId, 'CREATE', 'Exchange', `Exchange created — returned ${returnedWatch.id}, replaced ${replacementWatch.id}`);
    saveDB(db);
    return newExchange;
  },

  approveExchangeReview: (exchangeId, status, userId = 1) => {
    const db = loadDB();
    const exchange = db.exchanges.find(ex => ex.id === Number(exchangeId));
    if (!exchange) throw new Error('Exchange log not found.');
    exchange.status = status;
    const returnedWatch = db.watches.find(w => w.id === exchange.returned_watch_id);
    returnedWatch.status = status === 'resellable' ? 'in_stock' : 'refurbishing';
    logActivity(db, userId, 'UPDATE', 'Exchange', `Exchange ${exchangeId} marked as ${status}`);
    saveDB(db);
    return exchange;
  },

  // Services
  getServiceJobs: (search = '', status = '') => {
    const db = loadDB();
    const settings = db.settings;
    let jobs = db.service_jobs;
    if (status) jobs = jobs.filter(j => j.status === status);
    if (search) {
      const lower = search.toLowerCase();
      jobs = jobs.filter(j => {
        const customer = db.customers.find(c => c.id === j.customer_id);
        return j.id.toLowerCase().includes(lower) ||
          customer?.name.toLowerCase().includes(lower) ||
          customer?.phone.includes(lower) ||
          (j.watch_id && j.watch_id.toLowerCase().includes(lower));
      });
    }

    const now = new Date();
    return jobs.map(j => {
      const customer = db.customers.find(c => c.id === j.customer_id);
      const watch = j.watch_id ? db.watches.find(w => w.id === j.watch_id) : null;
      const user = db.users.find(u => u.id === j.created_by);

      // In-warranty check: if watch was sold here, check against warranty period
      let inWarranty = false;
      if (watch) {
        const saleItem = db.sale_items.find(si => si.watch_id === watch.id);
        if (saleItem) {
          const sale = db.sales.find(s => s.id === saleItem.sale_id);
          if (sale) {
            const saleDate = new Date(sale.invoice_date);
            const warrantyMonths = settings.warranty_period_months || 12;
            const warrantyExpiry = new Date(saleDate);
            warrantyExpiry.setMonth(warrantyExpiry.getMonth() + warrantyMonths);
            inWarranty = now <= warrantyExpiry;
          }
        }
      }

      return { ...j, customer, watch, user, in_warranty: inWarranty };
    }).sort((a, b) => b.id.localeCompare(a.id));
  },

  addServiceJob: (data, userId = 3) => {
    const db = loadDB();
    const jobCardId = 'JC-' + String(db.service_jobs.length + 1).padStart(4, '0');

    const newJob = {
      id: jobCardId,
      customer_id: Number(data.customer_id),
      watch_id: data.watch_id || null,
      watch_details: data.watch_details || null,
      issue_reported: data.issue_reported,
      drop_off_condition: data.drop_off_condition || '',
      estimated_cost: Number(data.estimated_cost || 0),
      actual_cost: null,
      expected_delivery_date: data.expected_delivery_date || null,
      actual_delivery_date: null,
      status: 'received',
      terms_accepted: true,
      billing_invoice_id: null,
      created_by: userId,
      in_warranty: false
    };

    db.service_jobs.push(newJob);
    logActivity(db, userId, 'CREATE', 'Service', `Job Card ${jobCardId} created`);
    saveDB(db);
    return newJob;
  },

  updateServiceJobStatus: (id, status, actualCost = null, userId = 3) => {
    const db = loadDB();
    const job = db.service_jobs.find(j => j.id === id);
    if (!job) throw new Error('Job Card not found.');
    job.status = status;
    if (actualCost !== null) job.actual_cost = Number(actualCost);
    if (status === 'delivered') {
      job.actual_delivery_date = localDateStr();
    }
    logActivity(db, userId, 'UPDATE', 'Service', `Job ${id} status → ${status}`);
    saveDB(db);
    return job;
  },

  // Dashboard Stats
  getDashboardStats: (role = 'sales') => {
    const db = loadDB();
    const todayStr = localDateStr();
    const monthPrefix = todayStr.slice(0, 7);
    
    // Safely match sales created today (slice(0, 10) prevents failure if ISO timestamp is stored)
    const allValidSales = (db.sales || []).filter(s => !s.is_returned);
    const todaySales = allValidSales.filter(s => s.invoice_date && s.invoice_date.slice(0, 10) === todayStr);
    const monthSales = allValidSales.filter(s => s.invoice_date && s.invoice_date.slice(0, 7) === monthPrefix);

    const todaySalesCount = todaySales.length;
    const todaySalesSum = todaySales.reduce((acc, s) => acc + Number(s.net_amount || 0), 0);

    const monthSalesCount = monthSales.length;
    const monthSalesSum = monthSales.reduce((acc, s) => acc + Number(s.net_amount || 0), 0);

    const totalSalesCount = allValidSales.length;
    const totalSalesSum = allValidSales.reduce((acc, s) => acc + Number(s.net_amount || 0), 0);

    // Active repair jobs statuses: received, in_repair, ready (excludes delivered and cancelled)
    const activeStatuses = ['received', 'in_repair', 'ready'];
    const jobsActive = db.service_jobs.filter(j => activeStatuses.includes(j.status)).length;
    const jobsDueToday = db.service_jobs.filter(j => j.expected_delivery_date && j.expected_delivery_date.slice(0, 10) === todayStr && activeStatuses.includes(j.status)).length;
    const jobsOverdue = db.service_jobs.filter(j => j.expected_delivery_date && j.expected_delivery_date.slice(0, 10) < todayStr && activeStatuses.includes(j.status)).length;
    const jobsReady = db.service_jobs.filter(j => j.status === 'ready').length;

    // Supplier pending payments
    const pendingSuppliers = db.purchases.filter(p => p.payment_status === 'pending');
    const pendingPaymentsCount = pendingSuppliers.length;
    const pendingPaymentsSum = pendingSuppliers.reduce((acc, p) => acc + Number(p.total_amount || 0), 0);

    // Outstanding customer dues
    const outstandingDuesTotal = db.customers.reduce((acc, c) => acc + Number(c.outstanding_dues || 0), 0);
    const outstandingDuesCount = db.customers.filter(c => Number(c.outstanding_dues || 0) > 0).length;

    let profitSnapshot = null;
    let monthProfitSnapshot = null;
    let totalProfitSnapshot = null;
    if (role === 'admin' || role === 'manager') {
      const calcProfit = (salesList) => {
        let p = 0;
        salesList.forEach(s => {
          const items = db.sale_items.filter(si => si.sale_id === s.id);
          const totalCost = items.reduce((acc, si) => acc + Number(si.cost_price || 0), 0);
          const gstTax = (s.invoice_type === 'gst' && s.gst_amount) ? Number(s.gst_amount) : 0;
          const netRevenueExclGst = Number(s.net_amount || 0) - gstTax;
          p += (netRevenueExclGst - totalCost);
        });
        return Math.round(p * 100) / 100;
      };
      profitSnapshot = calcProfit(todaySales);
      monthProfitSnapshot = calcProfit(monthSales);
      totalProfitSnapshot = calcProfit(allValidSales);
    }

    // Low stock: < 3 units in stock per model
    const stockCounts = {};
    db.watches.filter(w => w.status === 'in_stock').forEach(w => {
      const key = `${w.brand} — ${w.model}`;
      stockCounts[key] = (stockCounts[key] || 0) + 1;
    });
    const lowStockAlerts = Object.keys(stockCounts)
      .map(key => ({ model: key, count: stockCounts[key] }))
      .filter(item => item.count < 3);

    // Today's birthdays
    const todayMD = todayStr.slice(5); // MM-DD
    const birthdaysToday = db.customers.filter(c => {
      if (!c.dob) return false;
      return c.dob.slice(5) === todayMD;
    }).map(c => ({ id: c.id, name: c.name, phone: c.phone, dob: c.dob }));

    return {
      today_sales_count: todaySalesCount,
      today_sales_sum: todaySalesSum,
      month_sales_count: monthSalesCount,
      month_sales_sum: monthSalesSum,
      total_sales_count: totalSalesCount,
      total_sales_sum: totalSalesSum,
      low_stock_alerts: lowStockAlerts,
      jobs_due_today: jobsDueToday,
      jobs_overdue: jobsOverdue,
      jobs_ready: jobsReady,
      jobs_active: jobsActive,
      pending_supplier_payments_count: pendingPaymentsCount,
      pending_supplier_payments_sum: pendingPaymentsSum,
      outstanding_dues_total: outstandingDuesTotal,
      outstanding_dues_count: outstandingDuesCount,
      birthdays_today: birthdaysToday,
      profit_snapshot: profitSnapshot,
      month_profit_snapshot: monthProfitSnapshot,
      total_profit_snapshot: totalProfitSnapshot
    };
  },

  // Reports
  getStockValuation: () => {
    const db = loadDB();
    const available = db.watches.filter(w => w.status === 'in_stock');
    const totalCostValuation = available.reduce((acc, w) => acc + w.cost_price, 0);
    const totalMrpValuation = available.reduce((acc, w) => acc + w.mrp, 0);
    const brandStats = {};
    available.forEach(w => {
      if (!brandStats[w.brand]) brandStats[w.brand] = { count: 0, cost_value: 0, mrp_value: 0 };
      brandStats[w.brand].count++;
      brandStats[w.brand].cost_value += w.cost_price;
      brandStats[w.brand].mrp_value += w.mrp;
    });
    return {
      total_in_stock_count: available.length,
      total_cost_valuation: totalCostValuation,
      total_mrp_valuation: totalMrpValuation,
      breakdown_by_brand: Object.keys(brandStats).map(brand => ({ brand, ...brandStats[brand] }))
    };
  },

  getSalesReport: (startDate = null, endDate = null) => {
    const db = loadDB();
    let sales = db.sales;
    if (startDate) sales = sales.filter(s => s.invoice_date >= startDate);
    if (endDate) sales = sales.filter(s => s.invoice_date <= endDate);
    return sales.map(s => {
      const customer = db.customers.find(c => c.id === s.customer_id);
      const user = db.users.find(u => u.id === s.user_id);
      const items = db.sale_items.filter(si => si.sale_id === s.id).map(si => {
        const watch = db.watches.find(w => w.id === si.watch_id);
        return { ...si, watch };
      });
      return { ...s, customer, user, items };
    }).sort((a, b) => b.invoice_date.localeCompare(a.invoice_date));
  },

  getProfitReport: (startDate = null, endDate = null) => {
    const db = loadDB();
    let sales = db.sales;
    if (startDate) sales = sales.filter(s => s.invoice_date >= startDate);
    if (endDate) sales = sales.filter(s => s.invoice_date <= endDate);
    return sales.map(s => {
      const customer = db.customers.find(c => c.id === s.customer_id);
      const items = db.sale_items.filter(si => si.sale_id === s.id).map(si => {
        const watch = db.watches.find(w => w.id === si.watch_id);
        const itemProfit = (si.price_sold - si.discount_amount) - si.cost_price;
        return { ...si, watch, item_profit: itemProfit };
      });
      const totalProfit = items.reduce((acc, si) => acc + si.item_profit, 0) - (s.bill_discount_amount || 0);
      return { ...s, customer, items, total_profit: totalProfit };
    }).sort((a, b) => b.invoice_date.localeCompare(a.invoice_date));
  },

  getExchangeReport: () => {
    const db = loadDB();
    return db.exchanges.map(ex => {
      const customer = db.customers.find(c => {
        const sale = db.sales.find(s => s.id === ex.original_sale_id);
        return sale && c.id === sale.customer_id;
      });
      const returnedWatch = db.watches.find(w => w.id === ex.returned_watch_id);
      const replacementWatch = db.watches.find(w => w.id === ex.replacement_watch_id);
      return { ...ex, customer, returnedWatch, replacementWatch };
    });
  },

  getLoyaltyReport: () => {
    const db = loadDB();
    return db.loyalty_ledgers.map(l => {
      const customer = db.customers.find(c => c.id === l.customer_id);
      return { ...l, customer };
    }).sort((a, b) => b.id - a.id);
  },

  getPendingServiceReport: () => {
    const db = loadDB();
    const today = new Date();
    return db.service_jobs
      .filter(j => j.status !== 'delivered')
      .map(j => {
        const customer = db.customers.find(c => c.id === j.customer_id);
        const isOverdue = j.expected_delivery_date && new Date(j.expected_delivery_date) < today;
        return { ...j, customer, is_overdue: isOverdue };
      }).sort((a, b) => b.id.localeCompare(a.id));
  },

  getSupplierDuesReport: () => {
    const db = loadDB();
    return db.purchases
      .filter(p => p.payment_status === 'pending')
      .map(p => {
        const watches = db.watches.filter(w => w.purchase_id === p.id);
        return { ...p, watches };
      });
  },

  getGstReport: (month, year) => {
    const db = loadDB();
    return db.sales
      .filter(s => {
        if (s.invoice_type !== 'gst') return false;
        const d = new Date(s.invoice_date);
        return d.getMonth() + 1 === Number(month) && d.getFullYear() === Number(year);
      })
      .map(s => {
        const customer = db.customers.find(c => c.id === s.customer_id);
        const items = db.sale_items.filter(si => si.sale_id === s.id).map(si => {
          const watch = db.watches.find(w => w.id === si.watch_id);
          return { ...si, watch };
        });
        return { ...s, customer, items };
      });
  },

  getPurchaseLedger: () => {
    const db = loadDB();
    const rows = [];
    db.purchases.forEach(p => {
      const watches = db.watches.filter(w => w.purchase_id === p.id);
      watches.forEach(w => {
        rows.push({
          purchase_id: p.id,
          supplier_name: p.supplier_name,
          purchase_date: p.purchase_date,
          invoice_number: p.invoice_number,
          payment_status: p.payment_status,
          watch_id: w.id,
          brand: w.brand,
          model: w.model,
          mrp: w.mrp,
          discount_percent: w.discount_percent,
          cost_price: w.cost_price,
          selling_price: w.selling_price,
          gst_rate: w.gst_rate,
          watch_status: w.status
        });
      });
    });
    return rows;
  },

  // ═══════════════════════════════════════════════
  // SALES RETURNS
  // ═══════════════════════════════════════════════
  getSalesReturns: () => {
    const db = loadDB();
    return db.sales_returns.map(r => {
      const customer = db.customers.find(c => c.id === r.customer_id);
      const watch = db.watches.find(w => w.id === r.watch_id);
      const originalSale = db.sales.find(s => s.id === r.original_sale_id);
      return { ...r, customer, watch, originalSale };
    }).sort((a, b) => b.id - a.id);
  },

  addSalesReturn: (data, userId = 3) => {
    const db = loadDB();
    const settings = db.settings;
    const originalSale = db.sales.find(s => s.id === data.original_sale_id);
    if (!originalSale) throw new Error('Original invoice not found.');

    const saleItem = db.sale_items.find(si => si.sale_id === originalSale.id && si.watch_id === data.watch_id);
    if (!saleItem) throw new Error('Watch not found on this invoice.');
    if (saleItem.is_returned) throw new Error('This item has already been returned.');

    // Mark item returned
    saleItem.is_returned = true;
    saleItem.returned_at = new Date().toISOString();

    // Return watch to exchanged_returned status for review
    const watch = db.watches.find(w => w.id === data.watch_id);
    if (watch) watch.status = 'exchanged_returned';

    // Reverse loyalty points
    const earnRate = settings.loyalty_earn_rate || 1;
    const reversedPoints = Math.floor(data.refund_amount / 100 * earnRate);
    const customer = db.customers.find(c => c.id === data.customer_id);

    if (data.refund_mode === 'store_credit' && customer) {
      customer.outstanding_dues = Math.max(0, (customer.outstanding_dues || 0) - data.refund_amount);
    } else if (data.refund_mode === 'loyalty_points' && customer) {
      const pointsToAdd = Math.floor(data.refund_amount);
      customer.points_balance += pointsToAdd;
      db.loyalty_ledgers.push({
        id: db.loyalty_ledgers.length + 1,
        customer_id: customer.id,
        points_earned: pointsToAdd,
        points_redeemed: 0,
        transaction_type: 'refund',
        reference_id: originalSale.id,
        remarks: 'Refund converted to loyalty points',
        created_at: localDateStr()
      });
    }

    // Reverse original points earned
    if (reversedPoints > 0 && customer && customer.points_balance >= reversedPoints) {
      customer.points_balance -= reversedPoints;
      db.loyalty_ledgers.push({
        id: db.loyalty_ledgers.length + 1,
        customer_id: customer.id,
        points_earned: 0,
        points_redeemed: reversedPoints,
        transaction_type: 'refund',
        reference_id: originalSale.id,
        remarks: 'Points reversed on return',
        created_at: new Date().toISOString().split('T')[0]
      });
    }

    const newReturn = {
      id: db.sales_returns.length + 1,
      original_sale_id: data.original_sale_id,
      watch_id: data.watch_id,
      customer_id: data.customer_id,
      return_date: localDateStr(),
      original_price: saleItem.price_sold - saleItem.discount_amount,
      refund_amount: data.refund_amount,
      refund_mode: data.refund_mode,
      points_reversed: reversedPoints,
      reason: data.reason,
      processed_by: userId
    };

    db.sales_returns.push(newReturn);
    logActivity(db, userId, 'CREATE', 'Returns', `Return processed for invoice ${data.original_sale_id} — Watch ${data.watch_id}`);
    saveDB(db);
    return newReturn;
  },

  // ═══════════════════════════════════════════════
  // WARRANTY CARDS
  // ═══════════════════════════════════════════════
  getWarrantyCards: (search = '', statusFilter = 'all') => {
    const db = loadDB();
    const today = localDateStr();
    let cards = db.warranty_cards.map(w => {
      const customer = db.customers.find(c => c.id === w.customer_id);
      const watch = db.watches.find(wt => wt.id === w.watch_id);
      const sale = db.sales.find(s => s.id === w.sale_id);
      const exp = new Date(w.expiry_date);
      const now = new Date();
      const daysLeft = Math.floor((exp - now) / (1000 * 60 * 60 * 24));
      return { ...w, customer, watch, sale, days_left: daysLeft };
    });

    if (search) {
      const lower = search.toLowerCase();
      cards = cards.filter(w =>
        w.customer?.name.toLowerCase().includes(lower) ||
        w.customer?.phone.includes(lower) ||
        w.watch_id.toLowerCase().includes(lower) ||
        w.sale_id.toLowerCase().includes(lower)
      );
    }

    if (statusFilter === 'active') cards = cards.filter(w => w.is_active && w.expiry_date >= today);
    else if (statusFilter === 'expiring') cards = cards.filter(w => w.is_active && w.days_left >= 0 && w.days_left <= 30);
    else if (statusFilter === 'expired') cards = cards.filter(w => !w.is_active || w.expiry_date < today);

    return cards.sort((a, b) => b.id - a.id);
  },

  // ═══════════════════════════════════════════════
  // STOCK ADJUSTMENT LOG
  // ═══════════════════════════════════════════════
  getStockAdjustmentLogs: () => {
    const db = loadDB();
    return db.stock_adjustments.map(log => {
      const user = db.users.find(u => u.id === log.adjusted_by);
      const watch = db.watches.find(w => w.id === log.watch_id);
      return { ...log, adjusted_by_user: user, watch };
    }).sort((a, b) => b.id - a.id);
  },

  // Override adjustStock with enhanced version that logs adjustment
  adjustStockWithLog: (watchId, newStatus, reason, remarks, userId = 1) => {
    const db = loadDB();
    const watch = db.watches.find(w => w.id === watchId);
    if (!watch) throw new Error('Watch not found.');
    const fromStatus = watch.status;
    watch.status = newStatus;

    db.stock_adjustments.push({
      id: db.stock_adjustments.length + 1,
      watch_id: watchId,
      from_status: fromStatus,
      to_status: newStatus,
      reason,
      remarks,
      adjusted_by: userId,
      created_at: new Date().toISOString()
    });

    logActivity(db, userId, 'ADJUST', 'Inventory', `Watch ${watchId}: ${fromStatus} → ${newStatus} (${reason})`);
    saveDB(db);
    return watch;
  },

  // ═══════════════════════════════════════════════
  // SERVICE BILLING (invoice from completed job)
  // ═══════════════════════════════════════════════
  addServiceBill: (jobId, actualCost, paymentMode = 'cash', userId = 3) => {
    const db = loadDB();
    const settings = db.settings;
    const job = db.service_jobs.find(j => j.id === jobId);
    if (!job) throw new Error('Job Card not found.');
    if (job.billing_invoice_id) throw new Error('This job already has a service bill generated.');

    const customer = db.customers.find(c => c.id === job.customer_id);
    if (!customer) throw new Error('Customer not found.');

    const now = new Date();
    const year = now.getFullYear();
    const fy = (now.getMonth() + 1) >= 4 ? `${String(year).substring(2)}${String(year + 1).substring(2)}` : `${String(year - 1).substring(2)}${String(year).substring(2)}`;

    // Service bills use non-gst numbering
    const prefix = `${settings.nongst_invoice_prefix}-${fy}-`;
    const typeSales = db.sales.filter(s => s.id.startsWith(prefix));
    const invoiceId = `${prefix}${String(typeSales.length + 1).padStart(4, '0')}`;

    const netAmount = Number(actualCost || 0);

    const newSale = {
      id: invoiceId,
      customer_id: customer.id,
      user_id: userId,
      invoice_type: 'non-gst',
      invoice_date: localDateStr(now),
      subtotal: netAmount,
      discount_amount: 0,
      bill_discount_amount: 0,
      gst_amount: 0,
      points_redeemed: 0,
      points_value: 0,
      net_amount: netAmount,
      payment_mode: paymentMode,
      is_credit_sale: false,
      notes: `Service bill for Job Card ${jobId}`
    };

    db.sales.push(newSale);
    job.billing_invoice_id = invoiceId;
    job.actual_cost = netAmount;
    job.status = 'delivered';
    job.actual_delivery_date = localDateStr(now);

    // Points for service payment
    const earnRate = settings.loyalty_earn_rate || 1;
    const pointsEarned = Math.floor(netAmount / 100 * earnRate);
    if (pointsEarned > 0) {
      customer.points_balance += pointsEarned;
      db.loyalty_ledgers.push({
        id: db.loyalty_ledgers.length + 1,
        customer_id: customer.id,
        points_earned: pointsEarned,
        points_redeemed: 0,
        transaction_type: 'purchase',
        reference_id: invoiceId,
        remarks: `Points on service bill ${invoiceId}`,
        created_at: now.toISOString().split('T')[0]
      });
    }

    logActivity(db, userId, 'CREATE', 'Service', `Service bill ${invoiceId} generated for Job ${jobId}`);
    saveDB(db);
    return { ...newSale, job };
  },

  // ═══════════════════════════════════════════════
  // IMAGE UPLOAD (base64 to watch record)
  // ═══════════════════════════════════════════════
  uploadWatchImages: (watchId, base64Array, userId = 1) => {
    const db = loadDB();
    const watch = db.watches.find(w => w.id === watchId);
    if (!watch) throw new Error('Watch not found.');
    watch.image_urls = [...(watch.image_urls || []), ...base64Array];
    logActivity(db, userId, 'UPDATE', 'Inventory', `Images uploaded for watch ${watchId}`);
    saveDB(db);
    return watch;
  },

  removeWatchImage: (watchId, index, userId = 1) => {
    const db = loadDB();
    const watch = db.watches.find(w => w.id === watchId);
    if (!watch) throw new Error('Watch not found.');
    watch.image_urls = (watch.image_urls || []).filter((_, i) => i !== index);
    logActivity(db, userId, 'UPDATE', 'Inventory', `Image removed from watch ${watchId}`);
    saveDB(db);
    return watch;
  },

  // ═══════════════════════════════════════════════
  // ATTENDANCE & PAYROLL MOCK IMPLEMENTATIONS
  // ═══════════════════════════════════════════════
  // Helper to calculate hours between in_time and out_time (HH:MM format)
  getAttendance: (date) => {
    const db = loadDB();
    const targetDate = date || localDateStr();
    
    const calculateHours = (inTime, outTime) => {
      if (!inTime || !outTime) return 0;
      const [inH, inM] = inTime.split(':').map(Number);
      const [outH, outM] = outTime.split(':').map(Number);
      if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return 0;
      let inMinutes = inH * 60 + inM;
      let outMinutes = outH * 60 + outM;
      if (outMinutes < inMinutes) outMinutes += 24 * 60;
      return Number(((outMinutes - inMinutes) / 60).toFixed(1));
    };

    return db.users.map(u => {
      const rec = (db.attendance || []).find(a => a.user_id === u.id && a.date === targetDate);
      const inTime = rec?.in_time || '09:30';
      const outTime = rec?.out_time || '20:30';
      const status = rec ? rec.status : 'present';
      const hours = status === 'present' || status === 'half_day' ? calculateHours(inTime, outTime) : 0;

      return {
        user_id: u.id,
        user_name: u.name,
        user_role: u.role,
        status,
        in_time: inTime,
        out_time: outTime,
        hours_worked: hours,
        notes: rec ? rec.notes || '' : ''
      };
    });
  },

  saveAttendance: (date, records) => {
    const db = loadDB();
    if (!db.attendance) db.attendance = [];
    const targetDate = date || new Date().toISOString().split('T')[0];

    const calculateHours = (inTime, outTime) => {
      if (!inTime || !outTime) return 0;
      const [inH, inM] = inTime.split(':').map(Number);
      const [outH, outM] = outTime.split(':').map(Number);
      if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return 0;
      let inMinutes = inH * 60 + inM;
      let outMinutes = outH * 60 + outM;
      if (outMinutes < inMinutes) outMinutes += 24 * 60;
      return Number(((outMinutes - inMinutes) / 60).toFixed(1));
    };

    records.forEach(r => {
      const idx = db.attendance.findIndex(a => a.user_id === r.user_id && a.date === targetDate);
      const inTime = r.in_time || '09:30';
      const outTime = r.out_time || '20:30';
      const hours = r.status === 'present' || r.status === 'half_day' ? calculateHours(inTime, outTime) : 0;

      const itemData = {
        user_id: r.user_id,
        date: targetDate,
        status: r.status,
        in_time: inTime,
        out_time: outTime,
        hours_worked: hours,
        notes: r.notes || ''
      };

      if (idx >= 0) {
        db.attendance[idx] = { ...db.attendance[idx], ...itemData };
      } else {
        db.attendance.push({
          id: db.attendance.length + 1,
          ...itemData
        });
      }
    });
    saveDB(db);
    return { success: true };
  },

  getMonthlyAttendanceMatrix: (month, year) => {
    const db = loadDB();
    const m = Number(month);
    const y = Number(year);
    const daysInMonth = new Date(y, m, 0).getDate();
    const attendance = db.attendance || [];

    const calculateHours = (inTime, outTime) => {
      if (!inTime || !outTime) return 0;
      const [inH, inM] = inTime.split(':').map(Number);
      const [outH, outM] = outTime.split(':').map(Number);
      if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return 0;
      let inMinutes = inH * 60 + inM;
      let outMinutes = outH * 60 + outM;
      if (outMinutes < inMinutes) outMinutes += 24 * 60;
      return Number(((outMinutes - inMinutes) / 60).toFixed(1));
    };

    const employees = db.users.map(u => {
      const days = {};
      let present = 0, cl = 0, ml = 0, halfDay = 0, absent = 0, leave = 0, totalHours = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const rec = attendance.find(a => a.user_id === u.id && a.date === dateStr);
        if (rec) {
          const inTime = rec.in_time || '09:30';
          const outTime = rec.out_time || '20:30';
          const h = rec.hours_worked !== undefined ? rec.hours_worked : (rec.status === 'present' ? calculateHours(inTime, outTime) : rec.status === 'half_day' ? 5.5 : 0);

          days[day] = { 
            status: rec.status, 
            in_time: inTime,
            out_time: outTime,
            hours: h,
            notes: rec.notes || '' 
          };

          if (rec.status === 'present') present++;
          else if (rec.status === 'cl') cl++;
          else if (rec.status === 'ml') ml++;
          else if (rec.status === 'half_day') halfDay++;
          else if (rec.status === 'absent') absent++;
          else if (rec.status === 'leave') leave++;

          totalHours += Number(h || 0);
        }
      }

      const payableDays = present + cl + ml + (halfDay * 0.5);

      return {
        user_id: u.id,
        user_name: u.name,
        user_role: u.role,
        days,
        summary: {
          present,
          cl,
          ml,
          half_day: halfDay,
          absent,
          leave,
          payable_days: payableDays,
          total_hours: Number(totalHours.toFixed(1))
        }
      };
    });

    return {
      month: m,
      year: y,
      days_in_month: daysInMonth,
      employees
    };
  },

  saveSingleAttendance: ({ user_id, date, status, in_time, out_time, notes }) => {
    const db = loadDB();
    if (!db.attendance) db.attendance = [];
    const idx = db.attendance.findIndex(a => a.user_id === Number(user_id) && a.date === date);

    const calculateHours = (inTime, outTime) => {
      if (!inTime || !outTime) return 0;
      const [inH, inM] = inTime.split(':').map(Number);
      const [outH, outM] = outTime.split(':').map(Number);
      if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return 0;
      let inMinutes = inH * 60 + inM;
      let outMinutes = outH * 60 + outM;
      if (outMinutes < inMinutes) outMinutes += 24 * 60;
      return Number(((outMinutes - inMinutes) / 60).toFixed(1));
    };

    const inTime = in_time || '09:30';
    const outTime = out_time || '20:30';
    const hours = status === 'present' || status === 'half_day' ? calculateHours(inTime, outTime) : 0;

    const itemData = {
      user_id: Number(user_id),
      date,
      status,
      in_time: inTime,
      out_time: outTime,
      hours_worked: hours,
      notes: notes || ''
    };

    if (idx >= 0) {
      db.attendance[idx] = { ...db.attendance[idx], ...itemData };
    } else {
      db.attendance.push({
        id: db.attendance.length + 1,
        ...itemData
      });
    }
    saveDB(db);
    return { success: true };
  },

  getPayroll: (month, year) => {
    const db = loadDB();
    const m = Number(month);
    const y = Number(year);
    const daysInMonth = new Date(y, m, 0).getDate();
    const attendance = db.attendance || [];
    const payroll = db.payroll || [];

    const defaultSalaries = { admin: 50000, manager: 30000, sales: 18000 };

    const calculateHours = (inTime, outTime) => {
      if (!inTime || !outTime) return 0;
      const [inH, inM] = inTime.split(':').map(Number);
      const [outH, outM] = outTime.split(':').map(Number);
      if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return 0;
      let inMinutes = inH * 60 + inM;
      let outMinutes = outH * 60 + outM;
      if (outMinutes < inMinutes) outMinutes += 24 * 60;
      return Number(((outMinutes - inMinutes) / 60).toFixed(1));
    };

    return db.users.map(u => {
      const baseSalary = (u.base_salary !== undefined && u.base_salary !== null && u.base_salary !== '')
        ? Number(u.base_salary)
        : (defaultSalaries[u.role] || 15000);
      let presentDays = 0, clDays = 0, mlDays = 0, halfDays = 0, absentDays = 0, leaveDays = 0, recordedCount = 0, totalHours = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const rec = attendance.find(a => a.user_id === u.id && a.date === dateStr);
        if (rec) {
          recordedCount++;
          const inTime = rec.in_time || '09:30';
          const outTime = rec.out_time || '20:30';
          const h = rec.hours_worked !== undefined ? rec.hours_worked : (rec.status === 'present' ? calculateHours(inTime, outTime) : rec.status === 'half_day' ? 5.5 : 0);
          totalHours += Number(h || 0);

          if (rec.status === 'present') presentDays++;
          else if (rec.status === 'cl') clDays++;
          else if (rec.status === 'ml') mlDays++;
          else if (rec.status === 'half_day') halfDays++;
          else if (rec.status === 'absent') absentDays++;
          else if (rec.status === 'leave') leaveDays++;
        }
      }

      const unrecordedDays = daysInMonth - recordedCount;
      const payableDays = presentDays + clDays + mlDays + (halfDays * 0.5);
      const dailyRate = baseSalary / daysInMonth;
      const netSalary = Math.round(dailyRate * payableDays);

      const payRecord = payroll.find(p => p.user_id === u.id && p.month === m && p.year === y);

      return {
        user_id: u.id,
        user_name: u.name,
        user_role: u.role,
        base_salary: baseSalary,
        present_days: presentDays,
        cl_days: clDays,
        ml_days: mlDays,
        half_days: halfDays,
        absent_days: absentDays,
        leave_days: leaveDays,
        unrecorded_days: unrecordedDays,
        total_days: daysInMonth,
        total_hours: Number(totalHours.toFixed(1)),
        net_salary: netSalary,
        status: payRecord ? payRecord.status : 'unpaid',
        attendance_incomplete: unrecordedDays > 0
      };
    });
  },

  paySalary: (data) => {
    const db = loadDB();
    if (!db.payroll) db.payroll = [];
    const idx = db.payroll.findIndex(p => p.user_id === Number(data.user_id) && p.month === Number(data.month) && p.year === Number(data.year));
    const payObj = {
      id: idx >= 0 ? db.payroll[idx].id : db.payroll.length + 1,
      user_id: Number(data.user_id),
      month: Number(data.month),
      year: Number(data.year),
      base_salary: Number(data.base_salary),
      net_salary: Number(data.net_salary),
      status: 'paid',
      paid_at: new Date().toISOString()
    };
    if (idx >= 0) db.payroll[idx] = payObj;
    else db.payroll.push(payObj);
    saveDB(db);
    return payObj;
  }
};

