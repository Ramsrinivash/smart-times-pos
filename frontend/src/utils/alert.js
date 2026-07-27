import Swal from 'sweetalert2';

// centralize custom options that match our dark/gold premium design
const swalConfig = {
  background: 'var(--surface-color, #141419)',
  color: 'var(--text-primary, #f3f4f6)',
  confirmButtonColor: 'var(--primary-gold, #d4af37)',
  cancelButtonColor: 'var(--border-color, #2b2b35)',
  buttonsStyling: false,
  customClass: {
    popup: 'swal2-custom-popup',
    title: 'swal2-custom-title',
    htmlContainer: 'swal2-custom-html',
    confirmButton: 'btn btn-primary swal-btn-margin',
    cancelButton: 'btn btn-secondary swal-btn-margin',
    denyButton: 'btn btn-danger swal-btn-margin'
  }
};

// Add helper styles directly to DOM if not already present
if (typeof document !== 'undefined') {
  const styleId = 'swal-custom-theme-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      .swal2-custom-popup {
        border: 1px solid var(--border-color, #2b2b35) !important;
        border-radius: var(--radius-lg, 16px) !important;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5) !important;
        font-family: var(--font-body, 'Inter', sans-serif) !important;
      }
      .swal2-custom-title {
        font-family: var(--font-title, 'Outfit', sans-serif) !important;
        font-weight: 700 !important;
        color: var(--text-primary, #f3f4f6) !important;
      }
      .swal2-custom-html {
        color: var(--text-secondary, #9ca3af) !important;
      }
      .swal-btn-margin {
        margin: 0.5rem !important;
      }
      /* Custom SweetAlert icon colors to match theme */
      .swal2-icon.swal2-success {
        border-color: var(--success, #10b981) !important;
      }
      .swal2-icon.swal2-success [class^='swal2-success-line'] {
        background-color: var(--success, #10b981) !important;
      }
      .swal2-icon.swal2-success .swal2-success-ring {
        border: 4px solid rgba(16, 185, 129, 0.2) !important;
      }
      .swal2-icon.swal2-error {
        border-color: var(--error, #ef4444) !important;
      }
      .swal2-icon.swal2-error [class^='swal2-x-mark-line'] {
        background-color: var(--error, #ef4444) !important;
      }
      .swal2-icon.swal2-warning {
        border-color: var(--warning, #f59e0b) !important;
        color: var(--warning, #f59e0b) !important;
      }
      .swal2-icon.swal2-info {
        border-color: var(--info, #3b82f6) !important;
        color: var(--info, #3b82f6) !important;
      }
      .swal2-timer-progress-bar {
        background: var(--primary-gold, #d4af37) !important;
      }
    `;
    document.head.appendChild(style);
  }
}

export const alertService = {
  success: (title, text = '') => {
    return Swal.fire({
      ...swalConfig,
      title,
      text,
      icon: 'success'
    });
  },
  error: (title, text = '') => {
    return Swal.fire({
      ...swalConfig,
      title,
      text,
      icon: 'error'
    });
  },
  warning: (title, text = '') => {
    return Swal.fire({
      ...swalConfig,
      title,
      text,
      icon: 'warning'
    });
  },
  info: (title, text = '') => {
    return Swal.fire({
      ...swalConfig,
      title,
      text,
      icon: 'info'
    });
  },
  confirm: async (title, text = '', confirmText = 'Confirm', cancelText = 'Cancel') => {
    const result = await Swal.fire({
      ...swalConfig,
      title,
      text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText
    });
    return result.isConfirmed;
  },
  toast: (title, icon = 'success') => {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: 'var(--surface-color, #141419)',
      color: 'var(--text-primary, #f3f4f6)',
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });
    return Toast.fire({
      icon,
      title
    });
  }
};
