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

// Permanently remove all mock/fallback database storage so only real cloud database is used
try {
  localStorage.removeItem('watch_showroom_db');
  localStorage.removeItem('watch_showroom_db_backup');
} catch (e) {}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
