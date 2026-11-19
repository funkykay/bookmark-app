import { de, legalDe } from './de';
import type { Messages } from './de';
import { en, legalEn } from './en';

const catalogs = { de, en };
export type Language = keyof typeof catalogs;
const defaultLanguage: Language = 'en';
let language: Language = defaultLanguage;

export function languageForLocale(tag: string): Language {
  try {
    return new Intl.Locale(tag).language === 'de' ? 'de' : defaultLanguage;
  } catch {
    return defaultLanguage;
  }
}

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && Object.hasOwn(catalogs, value);
}

export function currentLanguage(): Language {
  return language;
}

export function messages(): Messages {
  return catalogs[language];
}

export function legalMessages() {
  return language === 'de' ? legalDe : legalEn;
}

export function applyLanguage(next: Language): void {
  language = next;
  document.documentElement.lang = next;
  const catalog: Messages & Partial<typeof legalDe> = __LEGAL_PAGES__
    ? { ...messages(), ...legalMessages() }
    : messages();
  for (const attribute of ['textContent', 'placeholder', 'aria-label', 'aria-valuetext', 'title']) {
    const binding = attribute === 'textContent' ? 'data-i18n' : `data-i18n-${attribute}`;
    for (const node of document.querySelectorAll(`[${binding}]`)) {
      const key = node.getAttribute(binding) as keyof typeof catalog;
      const text = catalog[key];
      if (typeof text !== 'string') throw new Error(`Invalid translation key: ${key}`);
      if (attribute === 'textContent') node.textContent = text;
      else node.setAttribute(attribute, text);
    }
  }
}
