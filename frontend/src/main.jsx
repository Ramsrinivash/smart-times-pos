import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Auto-purge stale Service Worker caches to guarantee immediate deployment updates
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (let registration of registrations) {
      registration.unregister();
    }
  });
}

if ('caches' in window) {
  caches.keys().then(names => {
    for (let name of names) {
      caches.delete(name);
    }
  });
}

// Versioned database cleanup: Ensure old dummy test data (sample watches/customers) is permanently purged
const CURRENT_DB_VERSION = 'v4_clean_production_slate';
try {
  const storedVersion = localStorage.getItem('watch_db_schema_version');
  if (storedVersion !== CURRENT_DB_VERSION) {
    const rawDB = localStorage.getItem('watch_showroom_db');
    if (rawDB) {
      const parsed = JSON.parse(rawDB);
      // Clean out sample dummy watches and sample customers if they were from old demo mock
      if (Array.isArray(parsed.watches) && parsed.watches.some(w => w.id && w.id.startsWith('WT-TTN-'))) {
        parsed.watches = [];
        parsed.purchases = [];
        parsed.customers = [];
        parsed.sales = [];
        parsed.sale_items = [];
        parsed.service_jobs = [];
        localStorage.setItem('watch_showroom_db', JSON.stringify(parsed));
        localStorage.setItem('watch_showroom_db_backup', JSON.stringify(parsed));
      }
    }
    localStorage.setItem('watch_db_schema_version', CURRENT_DB_VERSION);
  }
} catch (e) {
  console.warn('Storage purge check failed:', e);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
