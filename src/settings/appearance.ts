import { messages } from '../i18n';
import { element } from '../dom';
import { initLayout } from './layout';

const storageKey = 'donni-bookmark-darstellung';

export function initAppearance(notify: (message: string) => void) {
  const form = element('appearanceForm', 'form');
  const mode = form.elements.namedItem('mode') as RadioNodeList;
  const palette = form.elements.namedItem('palette') as RadioNodeList;
  const mobileWidth = element('mobileWidth', 'input');
  const setPosition = initLayout(mobileWidth);
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
      setPosition(saved?.mobileWidth);
    } catch {
      setPosition(undefined);
    }
    apply();
  }

  form.addEventListener('change', () => {
    setPosition(mobileWidth.valueAsNumber);
    apply();
    try {
      localStorage.setItem(storageKey, JSON.stringify({ mode: mode.value, palette: palette.value, mobileWidth: mobileWidth.valueAsNumber }));
    } catch {
      notify(messages().appearanceSession);
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
      notify(messages().appearanceResetFailed);
      return false;
    }
    form.reset();
    setPosition(undefined);
    apply();
    return true;
  };
}
