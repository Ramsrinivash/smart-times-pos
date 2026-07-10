-- Smart Times Watch Showroom — Full Database Setup
-- Run this in MySQL Workbench or via CLI

CREATE DATABASE IF NOT EXISTS watch_showroom CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE watch_showroom;

-- =============================================
-- SETTINGS
-- =============================================
CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  `value` TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================
-- USERS
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','manager','sales') NOT NULL DEFAULT 'sales',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================
-- PERSONAL ACCESS TOKENS (Laravel Sanctum)
-- =============================================
CREATE TABLE IF NOT EXISTS personal_access_tokens (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  tokenable_type VARCHAR(255) NOT NULL,
  tokenable_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  abilities TEXT,
  last_used_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tokenable (tokenable_type, tokenable_id)
);

-- =============================================
-- ACTIVITY LOGS
-- =============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(50) NOT NULL,
  module VARCHAR(100) NOT NULL,
  details TEXT,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- CUSTOMERS
-- =============================================
CREATE TABLE IF NOT EXISTS customers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  alt_phone VARCHAR(20),
  email VARCHAR(150),
  address TEXT,
  dob DATE,
  anniversary DATE,
  points_balance INT NOT NULL DEFAULT 0,
  tags VARCHAR(50) DEFAULT 'Regular',
  notes TEXT,
  outstanding_dues DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  id_proof VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================
-- PURCHASES (Supplier Bills)
-- =============================================
CREATE TABLE IF NOT EXISTS purchases (
  id INT PRIMARY KEY AUTO_INCREMENT,
  supplier_name VARCHAR(200) NOT NULL,
  purchase_date DATE NOT NULL,
  invoice_number VARCHAR(100),
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  payment_status ENUM('paid','pending','partial') NOT NULL DEFAULT 'paid',
  remarks TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- WATCHES (Inventory — piece-level)
-- =============================================
CREATE TABLE IF NOT EXISTS watches (
  id VARCHAR(100) PRIMARY KEY COMMENT 'Unique Watch Serial / Piece ID',
  purchase_id INT,
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(150) NOT NULL,
  category VARCHAR(80),
  gender ENUM('Men','Women','Unisex','Boys','Girls') DEFAULT 'Unisex',
  strap_type VARCHAR(80),
  dial_color VARCHAR(80),
  movement_type VARCHAR(80),
  mrp DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  selling_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  gst_rate DECIMAL(5,2) NOT NULL DEFAULT 18.00,
  status ENUM('in_stock','sold','exchanged_returned','refurbishing','damaged','display','reserved') NOT NULL DEFAULT 'in_stock',
  image_urls JSON COMMENT 'Array of base64 or file paths',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL
);

-- =============================================
-- STOCK ADJUSTMENT LOG
-- =============================================
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  watch_id VARCHAR(100) NOT NULL,
  from_status VARCHAR(50) NOT NULL,
  to_status VARCHAR(50) NOT NULL,
  reason ENUM('damage','loss','display','internal_use','found','repair_returned','other') NOT NULL,
  remarks TEXT,
  adjusted_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (watch_id) REFERENCES watches(id),
  FOREIGN KEY (adjusted_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- SALES
-- =============================================
CREATE TABLE IF NOT EXISTS sales (
  id VARCHAR(40) PRIMARY KEY COMMENT 'Invoice number e.g. ST-GST-2627-0001',
  customer_id INT NOT NULL,
  user_id INT,
  invoice_type ENUM('gst','non-gst') NOT NULL DEFAULT 'non-gst',
  invoice_date DATE NOT NULL,
  subtotal DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT 'Sum of item-level discounts',
  bill_discount_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT 'Bill-level flat/percent discount',
  gst_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  points_redeemed INT NOT NULL DEFAULT 0,
  points_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  net_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  payment_mode ENUM('cash','card','upi','bank_transfer','split','credit') NOT NULL DEFAULT 'cash',
  is_credit_sale TINYINT(1) NOT NULL DEFAULT 0,
  notes TEXT,
  is_returned TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- SALE ITEMS
-- =============================================
CREATE TABLE IF NOT EXISTS sale_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sale_id VARCHAR(40) NOT NULL,
  watch_id VARCHAR(100) NOT NULL,
  price_sold DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  cost_price DECIMAL(12,2) NOT NULL,
  gst_rate DECIMAL(5,2) NOT NULL DEFAULT 18.00,
  gst_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  is_returned TINYINT(1) NOT NULL DEFAULT 0,
  returned_at TIMESTAMP NULL,
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (watch_id) REFERENCES watches(id)
);

-- =============================================
-- SALES RETURNS
-- =============================================
CREATE TABLE IF NOT EXISTS sales_returns (
  id INT PRIMARY KEY AUTO_INCREMENT,
  original_sale_id VARCHAR(40) NOT NULL,
  watch_id VARCHAR(100) NOT NULL,
  customer_id INT NOT NULL,
  return_date DATE NOT NULL,
  original_price DECIMAL(12,2) NOT NULL,
  refund_amount DECIMAL(12,2) NOT NULL,
  refund_mode ENUM('cash','bank_transfer','store_credit','loyalty_points') NOT NULL DEFAULT 'cash',
  points_reversed INT NOT NULL DEFAULT 0,
  reason TEXT,
  processed_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (original_sale_id) REFERENCES sales(id),
  FOREIGN KEY (watch_id) REFERENCES watches(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- EXCHANGES
-- =============================================
CREATE TABLE IF NOT EXISTS exchanges (
  id INT PRIMARY KEY AUTO_INCREMENT,
  original_sale_id VARCHAR(40) NOT NULL,
  returned_watch_id VARCHAR(100) NOT NULL,
  replacement_sale_id VARCHAR(40),
  replacement_watch_id VARCHAR(100) NOT NULL,
  difference_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  exchange_type ENUM('tax_invoice','credit_note','exchange_note') NOT NULL DEFAULT 'exchange_note',
  exchange_date DATE NOT NULL,
  within_exchange_window TINYINT(1) NOT NULL DEFAULT 1,
  days_since_sale INT NOT NULL DEFAULT 0,
  status ENUM('pending_review','resellable','refurbishing','scrapped') NOT NULL DEFAULT 'pending_review',
  remarks TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (original_sale_id) REFERENCES sales(id),
  FOREIGN KEY (replacement_sale_id) REFERENCES sales(id) ON DELETE SET NULL,
  FOREIGN KEY (returned_watch_id) REFERENCES watches(id),
  FOREIGN KEY (replacement_watch_id) REFERENCES watches(id),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- WARRANTY CARDS
-- =============================================
CREATE TABLE IF NOT EXISTS warranty_cards (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sale_id VARCHAR(40) NOT NULL,
  watch_id VARCHAR(100) NOT NULL,
  customer_id INT NOT NULL,
  sale_date DATE NOT NULL,
  warranty_months INT NOT NULL DEFAULT 12,
  expiry_date DATE NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (watch_id) REFERENCES watches(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- =============================================
-- SERVICE JOBS
-- =============================================
CREATE TABLE IF NOT EXISTS service_jobs (
  id VARCHAR(30) PRIMARY KEY COMMENT 'Job Card number e.g. JC-202607-0001',
  customer_id INT NOT NULL,
  watch_id VARCHAR(100),
  watch_details JSON COMMENT 'For external watches: {brand, model, serial}',
  issue_reported TEXT NOT NULL,
  drop_off_condition TEXT,
  estimated_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  actual_cost DECIMAL(10,2),
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  status ENUM('received','in_repair','ready','delivered','cancelled') NOT NULL DEFAULT 'received',
  in_warranty TINYINT(1) NOT NULL DEFAULT 0,
  billing_invoice_id VARCHAR(40),
  terms_text TEXT COMMENT 'T&C at time of job card creation',
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (watch_id) REFERENCES watches(id) ON DELETE SET NULL,
  FOREIGN KEY (billing_invoice_id) REFERENCES sales(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- LOYALTY LEDGER
-- =============================================
CREATE TABLE IF NOT EXISTS loyalty_ledgers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT NOT NULL,
  points_earned INT NOT NULL DEFAULT 0,
  points_redeemed INT NOT NULL DEFAULT 0,
  transaction_type ENUM('purchase','redemption','refund','exchange','expired','manual') NOT NULL DEFAULT 'purchase',
  reference_id VARCHAR(40) COMMENT 'Invoice ID or Job Card ID',
  remarks TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- SEED DEFAULT DATA
-- =============================================

-- Default Settings
INSERT IGNORE INTO settings (`key`, `value`) VALUES
  ('store_name', 'Smart Times'),
  ('tagline', 'TITAN - SONATA - FASTRACK - TIMEX - LENCO - SMART WATCHES'),
  ('gstin', '33EJBPA4537C1ZW'),
  ('address', '108, Pennagaram Main Road, (Next to R.C. Chruch), DHARMAPURI - 636 701.'),
  ('phone', '97512 85945, 86672 88021'),
  ('email', 'info@smarttimes.in'),
  ('exchange_window_days', '7'),
  ('loyalty_earn_rate', '1'),
  ('loyalty_redeem_rate', '1'),
  ('loyalty_expiry_months', '12'),
  ('warranty_period_months', '12'),
  ('gst_invoice_prefix', 'ST-GST'),
  ('nongst_invoice_prefix', 'ST-RETL'),
  ('job_card_prefix', 'JC'),
  ('job_card_terms', '1. All service charges are estimates. Actual costs might vary up to 15%.\n2. Smart Times is not responsible for watches left unclaimed for more than 90 days.\n3. Warranty on serviced parts is 90 days from delivery date.'),
  ('logo_url', '');

-- Default Users (passwords stored as plaintext for dev — use bcrypt in production)
INSERT IGNORE INTO users (name, email, password, role) VALUES
  ('Owner Admin', 'admin@smarttimes.in', '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
  ('Store Manager', 'manager@smarttimes.in', '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'manager'),
  ('Sales Counter', 'sales@smarttimes.in', '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'sales');

-- Default Customers (Keeping Walk-in Customer profile as it is critical for POS flow)
INSERT IGNORE INTO customers (name, phone, alt_phone, email, address, dob, points_balance, tags, notes, outstanding_dues) VALUES
  ('Walk-in Customer', '9999999999', '', 'walkin@smarttimes.in', 'Counter Sale', NULL, 0, 'Walk-in', 'Default billing account for unregistered walk-ins.', 0.00);

-- Verify
SELECT 'Database setup complete!' AS status;
SELECT COUNT(*) AS users FROM users;
SELECT COUNT(*) AS customers FROM customers;
SELECT COUNT(*) AS watches FROM watches;
SELECT COUNT(*) AS sales FROM sales;
