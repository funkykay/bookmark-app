import { element } from '../dom';
import { applyLanguage, isLanguage, languageForLocale, messages } from '../i18n';

const storageKey = 'donni-bookmark-language';

export function initLanguage(notify: (message: string) => void) {
  const select = element('languageSelect', 'select');
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(storageKey);
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
      localStorage.setItem(storageKey, next);
    } catch {
      notify(messages().languageSession);
    }
  });

  return function clearLanguage(): boolean {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      notify(messages().languageResetFailed);
      return false;
    }
    restoreLanguage(null);
    return true;
  };
}
