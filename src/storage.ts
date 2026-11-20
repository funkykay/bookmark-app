type StorageKey = 'bookmarks' | 'pin' | 'language' | 'appearance';

export interface AppStorage {
  withLibraryLock<T>(operation: () => T): Promise<T>;
  read(key: StorageKey): string | null;
  write(key: StorageKey, value: string): void;
  remove(key: StorageKey): void;
  onExternalChange(key: StorageKey, listener: () => void): void;
  lastChange(): string | null;
  recordExport(exportedAt: Date, lastChange: string | null): void;
  hasCurrentBackup(): boolean;
  hasPendingReset(): boolean;
  resetApp(emptyLibrary?: string): Promise<boolean>;
  onReset(listener: () => void): void;
  onBackupChange(listener: () => void): void;
}

const localStorageKeys: Record<StorageKey, string> = {
  bookmarks: 'donni-bookmark-lesezeichen',
  pin: 'donni-bookmark-pin',
  language: 'donni-bookmark-language',
  appearance: 'donni-bookmark-darstellung',
};

const lastChangeKey = 'donni-bookmark-last-change';
const lastExportKey = 'donni-bookmark-last-export';
const pendingResetKey = 'donni-bookmark-pending-reset';
const storageEvents = new EventTarget();

function requireWritableStorage(): void {
  if (localStorage.getItem(pendingResetKey) !== null) throw new Error('Reset in progress');
}

function setItem(key: string, value: string | null): void {
  if (value === null) localStorage.removeItem(key);
  else localStorage.setItem(key, value);
}

function update(key: StorageKey, value: string | null): void {
  requireWritableStorage();
  const item = localStorageKeys[key];
  const previous = localStorage.getItem(item);
  if (previous === value) return;

  setItem(item, value);
  try {
    // Keep successive changes distinct even within a millisecond or after a clock adjustment.
    const lastChange = Date.parse(localStorage.getItem(lastChangeKey) ?? '');
    const changedAt = new Date(Math.max(Date.now(), (lastChange || 0) + 1));
    localStorage.setItem(lastChangeKey, changedAt.toISOString());
  } catch (error) {
    if (localStorage.getItem(item) === value) setItem(item, previous);
    throw error;
  }
  storageEvents.dispatchEvent(new Event('change'));
}

// On plain HTTP Web Locks are unavailable. A read/write IndexedDB transaction
// provides the same exclusive section while the synchronous operation runs.
function withLibraryLock<T>(operation: () => T): Promise<T> {
  const lockName = localStorageKeys.bookmarks;
  if (navigator.locks) return navigator.locks.request(lockName, operation);
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(lockName + '-lock', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('lock');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const transaction = db.transaction('lock', 'readwrite');
      let result: T;
      transaction.oncomplete = () => { db.close(); resolve(result); };
      transaction.onabort = () => { db.close(); reject(transaction.error); };
      transaction.objectStore('lock').get(0).onsuccess = () => {
        try {
          result = operation();
        } catch (error) {
          transaction.abort();
          reject(error);
        }
      };
    };
  });
}

export const storage: AppStorage = {
  withLibraryLock,
  read(key) {
    return localStorage.getItem(localStorageKeys[key]);
  },
  write(key, value) {
    update(key, value);
  },
  remove(key) {
    update(key, null);
  },
  onExternalChange(key, listener) {
    window.addEventListener('storage', event => {
      if (event.storageArea === localStorage && (event.key === localStorageKeys[key] || event.key === null)) listener();
    });
  },
  lastChange() {
    return localStorage.getItem(lastChangeKey);
  },
  recordExport(exportedAt, lastChange) {
    requireWritableStorage();
    localStorage.setItem(lastExportKey, JSON.stringify({ exportedAt: exportedAt.toISOString(), lastChange }));
    storageEvents.dispatchEvent(new Event('change'));
  },
  hasCurrentBackup() {
    try {
      const backup = JSON.parse(localStorage.getItem(lastExportKey) ?? 'null');
      return typeof backup?.exportedAt === 'string' && Number.isFinite(Date.parse(backup.exportedAt))
        && backup.lastChange === this.lastChange();
    } catch {
      return false;
    }
  },
  hasPendingReset() {
    try {
      return localStorage.getItem(pendingResetKey) !== null;
    } catch {
      return false;
    }
  },
  resetApp(emptyLibrary) {
    return this.withLibraryLock(() => {
      let target = localStorage.getItem(pendingResetKey);
      if (target === null) {
        if (emptyLibrary === undefined || !this.hasCurrentBackup()) return false;
        // Persist the confirmed target, including its new generation, before deleting anything.
        localStorage.setItem(pendingResetKey, emptyLibrary);
        target = emptyLibrary;
      }
      try {
        localStorage.setItem(localStorageKeys.bookmarks, target);
        localStorage.removeItem(localStorageKeys.appearance);
        localStorage.removeItem(localStorageKeys.language);
        localStorage.removeItem(localStorageKeys.pin);
        localStorage.removeItem(lastExportKey);
        localStorage.removeItem(lastChangeKey);
        localStorage.removeItem(pendingResetKey);
      } finally {
        storageEvents.dispatchEvent(new Event('change'));
      }
      storageEvents.dispatchEvent(new Event('reset'));
      return true;
    });
  },
  onReset(listener) {
    storageEvents.addEventListener('reset', listener);
    window.addEventListener('storage', event => {
      if (event.storageArea === localStorage && event.key === pendingResetKey && event.newValue === null) listener();
    });
  },
  onBackupChange(listener) {
    storageEvents.addEventListener('change', listener);
    window.addEventListener('storage', event => {
      if (event.storageArea !== localStorage) return;
      if (event.key === lastChangeKey || event.key === lastExportKey || event.key === pendingResetKey || event.key === null) listener();
    });
  },
};
