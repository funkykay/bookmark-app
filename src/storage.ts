type StorageKey = 'bookmarks' | 'pin' | 'language' | 'appearance';

export interface AppStorage {
  read(key: StorageKey): string | null;
  write(key: StorageKey, value: string): void;
  remove(key: StorageKey): void;
  onExternalChange(key: StorageKey, listener: () => void): void;
  lastChange(): string | null;
  recordExport(exportedAt: Date, lastChange: string | null): void;
  hasCurrentBackup(): boolean;
  clearBackupHistory(): void;
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
const backupEvents = new EventTarget();

function setItem(key: string, value: string | null): void {
  if (value === null) localStorage.removeItem(key);
  else localStorage.setItem(key, value);
}

function update(key: StorageKey, value: string | null): void {
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
  backupEvents.dispatchEvent(new Event('change'));
}

export const storage: AppStorage = {
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
      if (event.key === localStorageKeys[key] || event.key === null) listener();
    });
  },
  lastChange() {
    return localStorage.getItem(lastChangeKey);
  },
  recordExport(exportedAt, lastChange) {
    localStorage.setItem(lastExportKey, JSON.stringify({ exportedAt: exportedAt.toISOString(), lastChange }));
    backupEvents.dispatchEvent(new Event('change'));
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
  clearBackupHistory() {
    localStorage.removeItem(lastExportKey);
    localStorage.removeItem(lastChangeKey);
    backupEvents.dispatchEvent(new Event('change'));
  },
  onBackupChange(listener) {
    backupEvents.addEventListener('change', listener);
    window.addEventListener('storage', event => {
      if (event.storageArea !== localStorage) return;
      if (event.key === lastChangeKey || event.key === lastExportKey || event.key === null) listener();
    });
  },
};
