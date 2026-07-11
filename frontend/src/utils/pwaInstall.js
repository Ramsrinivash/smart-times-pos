// Smart Times POS — PWA Install Prompt Manager

let deferredPrompt = null;
const listeners = new Set();

// Capture the browser's install prompt event
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  listeners.forEach((fn) => fn(true));
});

// When app is installed, clear the prompt
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  listeners.forEach((fn) => fn(false));
});

export const pwaInstall = {
  /** Returns true if install is available */
  isAvailable: () => deferredPrompt !== null,

  /** Subscribe to availability changes */
  onAvailabilityChange: (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn); // returns unsubscribe
  },

  /** Trigger the native Chrome install dialog */
  prompt: async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      deferredPrompt = null;
      listeners.forEach((fn) => fn(false));
    }
    return outcome === 'accepted';
  },

  /** Check if already running as installed PWA */
  isInstalled: () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true,
};
