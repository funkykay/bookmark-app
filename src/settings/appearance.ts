import { element } from '../dom';

const storageKey = 'donni-darstellung-v1';

export function initAppearance(notify: (message: string) => void) {
  const form = element('appearanceForm', 'form');
  const mode = form.elements.namedItem('mode') as RadioNodeList;
  const palette = form.elements.namedItem('palette') as RadioNodeList;
  const browserColor = element('themeColor', 'meta');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  function apply() {
    const dark = mode.value === 'dark' || (mode.value === 'system' && systemDark.matches);
    document.documentElement.dataset.mode = dark ? 'dark' : 'light';
    document.documentElement.dataset.palette = palette.value;
    browserColor.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  }

  function restore() {
    form.reset();
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
      if (typeof saved?.mode === 'string') mode.value = saved.mode;
      if (typeof saved?.palette === 'string') palette.value = saved.palette;
    } catch {
      // Keep the form defaults when storage is unavailable or unreadable.
    }
    apply();
  }

  form.addEventListener('change', () => {
    apply();
    try {
      localStorage.setItem(storageKey, JSON.stringify({ mode: mode.value, palette: palette.value }));
    } catch {
      notify('Darstellung nur für diese Sitzung übernommen.');
    }
  });
  systemDark.addEventListener('change', apply);
  window.addEventListener('storage', event => {
    if (event.key === storageKey || event.key === null) restore();
  });
  restore();

  return function clearAppearance(): boolean {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      notify('Darstellung konnte nicht zurückgesetzt werden.');
      return false;
    }
    form.reset();
    apply();
    return true;
  };
}
