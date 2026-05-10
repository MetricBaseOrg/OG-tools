// User preferences persisted in localStorage.

const KEY = 'og-tools:prefs';

const DEFAULTS = {
  unitSystem: 'field', // 'field' | 'si'
  sigFigs: 4,          // 2..6
  theme: 'auto',       // 'light' | 'dark' | 'auto'
};

let cache = null;

function read() {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache;
}

export function getPrefs() {
  return { ...read() };
}

export function setPrefs(patch) {
  const next = { ...read(), ...patch };
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* quota / private mode */ }
  return { ...next };
}

export function resetPrefs() {
  cache = { ...DEFAULTS };
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  return { ...cache };
}

// Format a number using the user's configured significant figures.
// Strips trailing zeros from the fractional part for readability.
export function formatNumber(value, sigFigs = read().sigFigs) {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  if (!Number.isFinite(value)) return value > 0 ? '∞' : '-∞';
  if (value === 0) return '0';
  const abs = Math.abs(value);
  // Use exponential for very small / very large; otherwise toPrecision then tidy.
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e7)) {
    return value.toExponential(Math.max(0, sigFigs - 1));
  }
  const s = value.toPrecision(sigFigs);
  if (s.indexOf('.') === -1) return s;
  return s.replace(/\.?0+$/, '');
}

// Apply theme to <html data-theme=...>
export function applyTheme(theme = read().theme) {
  const root = document.documentElement;
  if (theme === 'auto') {
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = prefersDark ? 'dark' : 'light';
  } else {
    root.dataset.theme = theme;
  }
}
