import { element } from '../dom';
import { applyLanguage, isLanguage, languageForLocale, messages } from '../i18n';
import { storage } from '../storage';

export function initLanguage(notify: (message: string) => void) {
  const select = element('languageSelect', 'select');
  function restoreLanguage(): void {
    let preference: string | null = null;
    try {
      preference = storage.read('language');
    } catch {
      // The language can still be changed for the current session.
    }
    const language = isLanguage(preference) ? preference : languageForLocale(navigator.language);
    select.value = language;
    applyLanguage(language);
  }
  storage.onReset(restoreLanguage);
  restoreLanguage();

  select.addEventListener('change', async () => {
    const next = select.value;
    if (!isLanguage(next)) return;
    applyLanguage(next);
    try {
      await storage.withLibraryLock(() => storage.write('language', next));
    } catch {
      notify(messages().languageSession);
    }
  });
}
