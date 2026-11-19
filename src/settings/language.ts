import { element } from '../dom';
import { applyLanguage, isLanguage, languageForLocale, messages } from '../i18n';
import { storage } from '../storage';

export function initLanguage(notify: (message: string) => void) {
  const select = element('languageSelect', 'select');
  let saved: string | null = null;
  try {
    saved = storage.read('language');
  } catch {
    // The language can still be changed for the current session.
  }
  function restoreLanguage(preference: string | null): void {
    const language = isLanguage(preference) ? preference : languageForLocale(navigator.language);
    select.value = language;
    applyLanguage(language);
  }
  restoreLanguage(saved);

  select.addEventListener('change', () => {
    const next = select.value;
    if (!isLanguage(next)) return;
    applyLanguage(next);
    try {
      storage.write('language', next);
    } catch {
      notify(messages().languageSession);
    }
  });

  return function clearLanguage(): boolean {
    try {
      storage.remove('language');
    } catch {
      notify(messages().languageResetFailed);
      return false;
    }
    restoreLanguage(null);
    return true;
  };
}
