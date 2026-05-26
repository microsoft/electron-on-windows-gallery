// Common theme management and utility functions
function updateTheme() {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  document.dispatchEvent(new CustomEvent('fluent-theme-change', {
    detail: { theme: isDark ? 'dark' : 'light' }
  }));
}

// Initialize theme
function initializeTheme() {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateTheme);
  updateTheme();
}

// Common keyboard navigation for interactive elements
function initializeKeyboardNavigation() {
  document.addEventListener('keydown', function(e) {
    if ((e.key === 'Enter' || e.key === ' ') && document.activeElement) {
      const element = document.activeElement;
      if (element.classList.contains('header-tile') || 
          element.classList.contains('component-item') ||
          element.classList.contains('fluent-button')) {
        e.preventDefault();
        element.click();
      }
    }
  });
}

// High contrast mode support
function initializeAccessibility() {
  const contrastQuery = window.matchMedia('(forced-colors: active)');
  document.documentElement.classList.toggle('high-contrast', contrastQuery.matches);
  contrastQuery.addEventListener('change', e => 
    document.documentElement.classList.toggle('high-contrast', e.matches)
  );
}

// Lightweight toast/banner for surfacing errors and other transient status
// updates to the user. Bottom-right floating card, Fluent-styled.
//
//   showToast('Failed to extract object', { type: 'error' });
//   showError('Failed to extract object: ' + (err.message ?? err));
//
// type: 'error' (default) | 'warning' | 'info' | 'success'
// duration: ms; 0 or omitted => sticky (manual close). Errors default to
//           sticky, info/success default to 5000.
const TOAST_ICONS = {
  error:   '\uE783', // ErrorBadge12
  warning: '\uE7BA', // Warning
  info:    '\uE946', // Info
  success: '\uE73E', // CheckMark
};
const TOAST_DEFAULT_DURATION = {
  error: 0, warning: 0, info: 5000, success: 4000,
};

function ensureToastContainer() {
  let container = document.getElementById('gallery-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'gallery-toast-container';
    container.className = 'gallery-toast-container';
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', 'Notifications');
    document.body.appendChild(container);
  }
  return container;
}

function showToast(message, opts) {
  const options = opts || {};
  const type = options.type || 'error';
  const duration = options.duration != null
    ? options.duration
    : TOAST_DEFAULT_DURATION[type] || 0;

  const container = ensureToastContainer();
  const toast = document.createElement('div');
  toast.className = 'gallery-toast gallery-toast-' + type;
  toast.setAttribute('role', type === 'error' || type === 'warning' ? 'alert' : 'status');

  const icon = document.createElement('span');
  icon.className = 'gallery-toast-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = TOAST_ICONS[type] || TOAST_ICONS.info;
  toast.appendChild(icon);

  const body = document.createElement('div');
  body.className = 'gallery-toast-body';
  body.textContent = String(message);
  toast.appendChild(body);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'gallery-toast-close';
  close.setAttribute('aria-label', 'Dismiss notification');
  close.textContent = '\u2715';
  close.addEventListener('click', () => dismiss());
  toast.appendChild(close);

  let dismissTimer = null;
  function dismiss() {
    if (toast.dataset.dismissed === '1') return;
    toast.dataset.dismissed = '1';
    if (dismissTimer) { clearTimeout(dismissTimer); dismissTimer = null; }
    toast.classList.add('gallery-toast-leaving');
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 200);
  }

  container.appendChild(toast);
  // Trigger enter animation on next frame.
  requestAnimationFrame(() => toast.classList.add('gallery-toast-entered'));

  if (duration > 0) {
    dismissTimer = setTimeout(dismiss, duration);
  }

  return { dismiss };
}

function showError(message, opts) {
  return showToast(message, Object.assign({ type: 'error' }, opts || {}));
}

// Expose globally so iframe-loaded samples can call `window.showToast(...)`.
window.showToast = showToast;
window.showError = showError;

// Initialize all common functionality
function initializeFluentApp() {
  initializeTheme();
  initializeKeyboardNavigation();
  initializeAccessibility();
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeFluentApp);
