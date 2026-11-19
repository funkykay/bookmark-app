import { messages } from '../i18n';
import { element } from '../dom';
import { initLayout } from './layout';
import { storage } from '../storage';

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
      const saved = JSON.parse(storage.read('appearance') ?? 'null');
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
      storage.write('appearance', JSON.stringify({ mode: mode.value, palette: palette.value, mobileWidth: mobileWidth.valueAsNumber }));
    } catch {
      notify(messages().appearanceSession);
    }
  });
  systemDark.addEventListener('change', apply);
  storage.onExternalChange('appearance', restore);
  restore();

  return function clearAppearance(): boolean {
    try {
      storage.remove('appearance');
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
