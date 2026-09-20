# Smart Times POS — Watch Showroom Management System

A comprehensive, full-stack watch showroom and retail management system designed to handle point of sale, inventory tracking, customer relationships, service job cards, and financial reporting.

## 🚀 Tech Stack
- **Frontend**: React + Vite (Custom responsive design with dark theme capabilities)
- **Backend**: Laravel 11 REST API
- **Database**: MySQL
- **Authentication**: Laravel Sanctum (Token-based)

---

## 🧩 Modules in Detail

The system is built modularly to cover every aspect of a modern watch retail and service business:

### 1. 📊 Dashboard
- **KPI Metrics**: Real-time overview of daily, monthly, and yearly sales, active service jobs, and low stock alerts.
- **Activity Log**: Tracks staff and manager actions (e.g., deleted invoices, stock adjustments) for administrative review.
- **Dues Tracking**: Quick view of customers with outstanding balances.

### 2. 🛒 Point of Sale (POS)
- **Flexible Billing**: Supports both Retail (Non-GST) and GST invoices.
- **Multi-Payment Modes**: Split payments, Cash, Card, and UPI.
- **Credit Sales**: Ability to mark an invoice as a "Debt / Credit Sale" against a customer's profile.
- **Discounts & Loyalty**: Apply flat or percentage discounts, and redeem customer loyalty points during checkout.

### 3. 📦 Inventory Management
- **Stock Tracking**: Maintain records of watch stock with details like Brand, Model, Category, Strap Type, and HSN Code.
- **Purchases**: Log inbound purchases from suppliers, tracking cost price vs. selling price.
- **Stock Adjustments**: Manual stock auditing capabilities (e.g., marking items as damaged, lost, or reserved).

### 4. 👥 Customer CRM & Loyalty
- **Profiles**: Comprehensive customer profiles tracking their purchase history, service history, and outstanding dues.
- **Loyalty Program**: Auto-calculates and accumulates loyalty points on purchases.
- **Debt Settlement**: Track and clear customer outstanding dues.

### 5. 🔄 Exchanges & Returns
- **Seamless Returns**: Process returns by fetching previous invoices and adding the watch back into stock (or marking as damaged).
- **Exchange Billing**: Adjust the value of a returned watch against a new purchase in a single transaction.

### 6. 🔧 Service & Repair
- **Job Cards**: Create detailed service tickets for repairs, tracking issue descriptions, estimated costs, and expected delivery dates.
- **Status Tracking**: Move jobs through statuses (Pending, In Progress, Ready, Delivered).

### 7. 🛡️ Warranty Management
- **Digital Cards**: Automatically generate warranty cards linked to specific serial numbers or sales invoices.
- **Tracking**: Easy lookup of warranty validity for customer walk-ins.

### 8. 📈 Reports
- **GST Reports**: Separate Input (Purchases) and Output (Sales) tax reports properly filtered by month and year.
- **Profit/Loss**: Analyze profit margins based on cost price vs. selling price over custom date ranges.
- **Stock Valuation**: Detailed breakdown of inventory value at cost and MRP.

### 9. ⚙️ Settings & Staff Management
- **Role-Based Access**: Granular permissions for Admin (Full Access), Manager (Financials/Inventory), and Staff (Basic POS & Service).
- **Store Configuration**: Manage store details, invoice prefixes, and GST settings.

---

## 💻 Local Setup

### 1. Backend (Laravel)
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

### 2. Frontend (React/Vite)
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

---

## 🔐 Environment Variables

### Frontend `.env`
```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_NAME="Smart Times POS"
```

### Backend `.env`
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=watch_showroom
DB_USERNAME=root
DB_PASSWORD=your_password
```

---

## ☁️ Deployment Pipeline
- **Frontend**: Deploys to cloud hosting via GitHub Actions (React Build).
- **Backend**: Auto-deploys via GitHub Actions (SSH + Rsync) to production Linux VPS.
- **Database**: Production MySQL database hosted on VPS.

---

## 📄 License
This project is proprietary and confidential. Unauthorized copying, distribution, or modification of this software, via any medium, is strictly prohibited unless explicitly authorized by the project owners.
