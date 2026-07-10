# Smart Times POS — Watch Showroom Management System

A full-stack watch showroom management system with:
- **Frontend**: React + Vite (dark theme, responsive)
- **Backend**: Laravel 11 REST API + MySQL
- **Auth**: Laravel Sanctum token-based

## Modules
- 📊 Dashboard with KPI metrics
- 📦 Inventory Management
- 🛒 Point of Sale (POS)
- 🔄 Exchanges & Returns
- 🔧 Service & Repair Job Cards
- 👥 Customer CRM + Loyalty Points
- 🛡️ Warranty Cards
- 📈 Reports (GST, Stock, Profit)
- ⚙️ Settings + Staff Management

## Setup

### Backend (Laravel)
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

### Frontend (React/Vite)
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Environment Variables

### Frontend `.env`
```
VITE_API_BASE_URL=http://localhost:8000/api
VITE_USE_MOCK=false
```

### Backend `.env`
```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=watch_showroom
DB_USERNAME=root
DB_PASSWORD=your_password
```

## Deployment
- **Frontend** → Vercel
- **Backend** → Railway
- **Database** → Railway MySQL
