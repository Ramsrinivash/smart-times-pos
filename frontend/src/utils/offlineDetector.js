// Smart Times POS — Offline / Online Detector + Auto-Sync Trigger
import { syncQueue } from './syncQueue';
import { api } from '../services/api';

const listeners = new Set();
let isOnline = navigator.onLine;

const broadcast = (online) => {
  isOnline = online;
  listeners.forEach((fn) => fn(online));
};

window.addEventListener('online', async () => {
  console.log('[Connectivity] 🟢 Back online — processing sync queue...');
  broadcast(true);
  const result = await syncQueue.process(api);
  if (result.processed > 0) {
    console.log(`[Connectivity] Synced ${result.processed} offline action(s)`);
  }
});

window.addEventListener('offline', () => {
  console.log('[Connectivity] 🔴 Gone offline');
  broadcast(false);
});

export const offlineDetector = {
  /** Returns current online status */
  isOnline: () => isOnline,

  /** Subscribe to online/offline changes */
  onChange: (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
