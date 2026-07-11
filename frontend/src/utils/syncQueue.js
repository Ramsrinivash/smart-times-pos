// Smart Times POS — Offline Sync Queue
// Stores pending API actions in localStorage and replays them when online

const QUEUE_KEY = 'smarttimes_sync_queue';

/** Load queue from localStorage */
const loadQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
};

/** Save queue to localStorage */
const saveQueue = (queue) => {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

/** Notify all listeners */
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn(loadQueue()));

export const syncQueue = {
  /** Add a pending action to the queue */
  add: (action, payload) => {
    const queue = loadQueue();
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      action,       // e.g. 'addSale', 'addServiceJob', 'addPurchase'
      payload,
      createdAt: new Date().toISOString(),
      retries: 0,
    };
    queue.push(entry);
    saveQueue(queue);
    notify();
    console.log(`[SyncQueue] Queued offline action: ${action}`, payload);
    return entry;
  },

  /** Get all pending items */
  getAll: () => loadQueue(),

  /** Count of pending items */
  count: () => loadQueue().length,

  /** Remove a successfully synced item by id */
  remove: (id) => {
    const queue = loadQueue().filter((e) => e.id !== id);
    saveQueue(queue);
    notify();
  },

  /** Subscribe to queue changes */
  onChange: (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Process queue: replay each queued call via the provided api object */
  process: async (api) => {
    if (!navigator.onLine) return { processed: 0, failed: 0 };
    const queue = loadQueue();
    if (queue.length === 0) return { processed: 0, failed: 0 };

    let processed = 0;
    let failed = 0;
    const remaining = [];

    for (const entry of queue) {
      try {
        if (typeof api[entry.action] !== 'function') {
          console.warn(`[SyncQueue] Unknown action: ${entry.action}, skipping`);
          remaining.push(entry);
          continue;
        }
        await api[entry.action](entry.payload);
        processed++;
        console.log(`[SyncQueue] ✅ Synced: ${entry.action} (id: ${entry.id})`);
      } catch (err) {
        console.warn(`[SyncQueue] ❌ Failed: ${entry.action}`, err);
        entry.retries = (entry.retries || 0) + 1;
        entry.lastError = err?.message || 'Unknown error';
        if (entry.retries < 5) {
          remaining.push(entry); // retry up to 5 times
        } else {
          console.error(`[SyncQueue] Dropped after 5 retries: ${entry.action}`);
        }
        failed++;
      }
    }

    saveQueue(remaining);
    notify();
    return { processed, failed };
  },
};
