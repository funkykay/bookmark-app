type StorageKey = 'bookmarks' | 'pin' | 'language' | 'appearance';

export interface AppStorage {
  read(key: StorageKey): string | null;
  write(key: StorageKey, value: string): void;
  remove(key: StorageKey): void;
  onExternalChange(key: StorageKey, listener: () => void): void;
}

const localStorageKeys: Record<StorageKey, string> = {
  bookmarks: 'donni-bookmark-lesezeichen',
  pin: 'donni-bookmark-pin',
  language: 'donni-bookmark-language',
  appearance: 'donni-bookmark-darstellung',
};

export const storage: AppStorage = {
  read(key) {
    return localStorage.getItem(localStorageKeys[key]);
  },
  write(key, value) {
    localStorage.setItem(localStorageKeys[key], value);
  },
  remove(key) {
    localStorage.removeItem(localStorageKeys[key]);
  },
  onExternalChange(key, listener) {
    window.addEventListener('storage', event => {
      if (event.key === localStorageKeys[key] || event.key === null) listener();
    });
  },
};
