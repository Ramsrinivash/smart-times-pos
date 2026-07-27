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
    { id: 1, name: 'Owner Admin', email: 'admin@smarttimes.in', password: 'admin123', role: 'admin', created_at: '2026-07-01' },
    { id: 2, name: 'Store Manager', email: 'manager@smarttimes.in', password: 'manager123', role: 'manager', created_at: '2026-07-01' },
    { id: 3, name: 'Sales Counter', email: 'sales@smarttimes.in', password: 'sales123', role: 'sales', created_at: '2026-07-01' }
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
  loyalty_ledgers: []
};

export const loadDB = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultDB));
    return JSON.parse(JSON.stringify(defaultDB));
  }
  const db = JSON.parse(data);
  // Auto-reset legacy dummy mock data if detected
  if (db.watches && db.watches.some(w => w.id === 'RLX-SUB-90812')) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultDB));
    return JSON.parse(JSON.stringify(defaultDB));
  }
  // Auto-apply current correct store info
  if (db.settings) {
    db.settings.store_name = defaultDB.settings.store_name;
    db.settings.tagline = defaultDB.settings.tagline;
    db.settings.gstin = defaultDB.settings.gstin;
    db.settings.address = defaultDB.settings.address;
    db.settings.phone = defaultDB.settings.phone;
    db.settings.email = defaultDB.settings.email;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }
  return db;
};

const saveDB = (db) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
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

  // Authentication
  login: (email, password) => {
    const db = loadDB();
    const user = db.users.find(u => u.email === email && u.password === password);
    if (!user) throw new Error('Invalid email or password.');
    logActivity(db, user.id, 'LOGIN', 'Auth', `User ${user.name} logged in`);
    saveDB(db);
    return {
      access_token: 'mock-jwt-token-xyz',
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    };
  },

  // User Management (Admin only)
  getUsers: () => {
    const db = loadDB();
    return db.users.map(u => ({ ...u, password: undefined }));
  },

  addUser: (data, adminId) => {
    const db = loadDB();
    const existing = db.users.find(u => u.email === data.email);
    if (existing) throw new Error('A user with this email already exists.');
    const newUser = {
      id: db.users.length + 1,
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
      created_at: new Date().toISOString().split('T')[0]
    };
    db.users.push(newUser);
    logActivity(db, adminId, 'CREATE', 'Users', `Created user ${data.name} (${data.role})`);
    saveDB(db);
    return { ...newUser, password: undefined };
  },

  updateUser: (userId, data, adminId) => {
    const db = loadDB();
    const idx = db.users.findIndex(u => u.id === Number(userId));
    if (idx === -1) throw new Error('User not found.');
    db.users[idx] = { ...db.users[idx], ...data };
    logActivity(db, adminId || userId, 'UPDATE', 'Users', `Updated credentials/role for user ${db.users[idx].name}`);
    saveDB(db);
    return { ...db.users[idx], password: undefined };
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
    const existing = db.customers.find(c => c.phone === data.phone);
    if (existing) throw new Error('Customer with this phone number already exists.');
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
    const sale = db.sales.find(s => s.id === id);
    if (!sale) throw new Error('Invoice not found.');
    const customer = db.customers.find(c => c.id === sale.customer_id);
    const user = db.users.find(u => u.id === sale.user_id);
    const items = db.sale_items.filter(si => si.sale_id === sale.id).map(si => {
      const watch = db.watches.find(w => w.id === si.watch_id);
      return { ...si, watch };
    });
    return { ...sale, customer, user, items };
  },

  addSale: (data, userId = 3) => {
    const db = loadDB();
    const now = new Date();
    const settings = db.settings;
    const customer = db.customers.find(c => c.id === Number(data.customer_id));
    if (!customer) throw new Error('Customer profile not found.');

    const invoiceId = String(db.sales.length + 1).padStart(4, '0');

    let subtotal = 0;
    let totalItemDiscounts = 0;
    let totalGst = 0;
    const itemsData = [];

    for (const itemInput of data.items) {
      const watch = db.watches.find(w => w.id === itemInput.watch_id);
      if (!watch || watch.status !== 'in_stock') {
        throw new Error(`Watch "${itemInput.watch_id}" is not available in stock.`);
      }

      const itemDisc = Number(itemInput.discount_amount || 0);
      const netItemPrice = watch.selling_price - itemDisc;
      const gstAmt = data.invoice_type === 'gst'
        ? (netItemPrice - (netItemPrice / (1 + (watch.gst_rate / 100))))
        : 0;

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

      subtotal += watch.selling_price;
      totalItemDiscounts += itemDisc;
      totalGst += gstAmt;
      watch.status = 'sold';
    }

    // Bill-level discount (flat amount or percentage)
    const billDiscFlat = Number(data.bill_discount_amount || 0);
    const billDiscPercent = Number(data.bill_discount_percent || 0);
    let billDiscAmount = billDiscFlat;
    if (billDiscPercent > 0) {
      billDiscAmount = ((subtotal - totalItemDiscounts) * billDiscPercent) / 100;
    }

    // Reward points redemption
    const redeemPoints = Math.min(Number(data.redeem_points || 0), customer.points_balance);
    const pointsValue = redeemPoints * (settings.loyalty_redeem_rate || 1);

    const totalDiscount = totalItemDiscounts + billDiscAmount + pointsValue;
    const netAmount = Math.max(0, subtotal - totalDiscount);

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
        created_at: now.toISOString().split('T')[0]
      });
    }

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
        remarks: `Points earned on invoice ${invoiceId}`,
        created_at: now.toISOString().split('T')[0]
      });
    }

    const newSale = {
      id: invoiceId,
      customer_id: customer.id,
      user_id: userId,
      invoice_type: data.invoice_type,
      invoice_date: now.toISOString().split('T')[0],
      subtotal,
      discount_amount: totalItemDiscounts,
      bill_discount_amount: billDiscAmount,
      gst_amount: totalGst,
      points_redeemed: redeemPoints,
      points_value: pointsValue,
      net_amount: netAmount,
      payment_mode: data.payment_mode,
      is_credit_sale: isCreditSale,
      notes: data.notes || ''
    };

    db.sales.push(newSale);
    db.sale_items.push(...itemsData);
    logActivity(db, userId, 'CREATE', 'Sales', `Invoice ${invoiceId} created — ₹${netAmount.toLocaleString()}`);
    saveDB(db);

    return { ...newSale, items: itemsData };
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
    const nowStr = now.toISOString().split('T')[0];
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
      job.actual_delivery_date = new Date().toISOString().split('T')[0];
    }
    logActivity(db, userId, 'UPDATE', 'Service', `Job ${id} status → ${status}`);
    saveDB(db);
    return job;
  },

  // Dashboard Stats
  getDashboardStats: (role = 'sales') => {
    const db = loadDB();
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySales = db.sales.filter(s => s.invoice_date === todayStr);

    const todaySalesCount = todaySales.length;
    const todaySalesSum = todaySales.reduce((acc, s) => acc + s.net_amount, 0);

    // Low stock: < 3 units in stock per model (matches backend threshold)
    const stockCounts = {};
    db.watches.filter(w => w.status === 'in_stock').forEach(w => {
      const key = `${w.brand} — ${w.model}`;
      stockCounts[key] = (stockCounts[key] || 0) + 1;
    });
    const lowStockAlerts = Object.keys(stockCounts)
      .map(key => ({ model: key, count: stockCounts[key] }))
      .filter(item => item.count < 3);

    const today = new Date(todayStr);
    const jobsDueToday = db.service_jobs.filter(j => j.expected_delivery_date === todayStr && j.status !== 'delivered').length;
    const jobsOverdue = db.service_jobs.filter(j => j.expected_delivery_date && new Date(j.expected_delivery_date) < today && j.status !== 'delivered').length;
    const jobsReady = db.service_jobs.filter(j => j.status === 'ready').length;

    const pendingSuppliers = db.purchases.filter(p => p.payment_status === 'pending');
    const pendingPaymentsCount = pendingSuppliers.length;
    const pendingPaymentsSum = pendingSuppliers.reduce((acc, p) => acc + p.total_amount, 0);

    // Outstanding customer dues
    const outstandingDuesTotal = db.customers.reduce((acc, c) => acc + (c.outstanding_dues || 0), 0);
    const outstandingDuesCount = db.customers.filter(c => (c.outstanding_dues || 0) > 0).length;

    let profitSnapshot = null;
    if (role === 'admin' || role === 'manager') {
      let profit = 0;
      todaySales.forEach(s => {
        // net_amount already reflects all discounts; cost is summed from sale_items
        const items = db.sale_items.filter(si => si.sale_id === s.id);
        const totalCost = items.reduce((acc, si) => acc + (si.cost_price || 0), 0);
        profit += (s.net_amount - totalCost);
      });
      profitSnapshot = profit;
    }

    // Today's birthdays
    const todayMD = todayStr.slice(5); // MM-DD
    const birthdaysToday = db.customers.filter(c => {
      if (!c.dob) return false;
      return c.dob.slice(5) === todayMD;
    }).map(c => ({ id: c.id, name: c.name, phone: c.phone, dob: c.dob }));

    return {
      today_sales_count: todaySalesCount,
      today_sales_sum: todaySalesSum,
      low_stock_alerts: lowStockAlerts,
      jobs_due_today: jobsDueToday,
      jobs_overdue: jobsOverdue,
      jobs_ready: jobsReady,
      pending_supplier_payments_count: pendingPaymentsCount,
      pending_supplier_payments_sum: pendingPaymentsSum,
      outstanding_dues_total: outstandingDuesTotal,
      outstanding_dues_count: outstandingDuesCount,
      birthdays_today: birthdaysToday,
      profit_snapshot: profitSnapshot
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
        created_at: new Date().toISOString().split('T')[0]
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
      return_date: new Date().toISOString().split('T')[0],
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
    const today = new Date().toISOString().split('T')[0];
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
      invoice_date: now.toISOString().split('T')[0],
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
    job.actual_delivery_date = now.toISOString().split('T')[0];

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
  }
};

