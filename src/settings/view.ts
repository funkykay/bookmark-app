import { messages } from '../i18n';
import { mergeLibrary, parseLibrary } from '../bookmarks/model';
import type { Library } from '../bookmarks/model';
import type { BookmarkStore } from '../bookmarks/store';
import { element } from '../dom';
import type { PinControls } from '../pin/view';
import { storage } from '../storage';
import type { View } from '../views';
import { initAppearance } from './appearance';

interface Options {
  store: BookmarkStore;
  clearLanguage: () => boolean;
  pin: Pick<PinControls, 'enabled' | 'toggleProtection' | 'changePin' | 'clearSettings'>;
  notify: (message: string) => void;
}

function filenameTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const day = [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-');
  const time = [date.getHours(), date.getMinutes(), date.getSeconds()].map(pad).join('-');
  return `${day}_${time}`;
}

export function initSettings({ store, pin, notify, clearLanguage }: Options): View {
  const clearAppearance = initAppearance(notify);
  const pinSwitch = element('pinSwitch', 'button');
  const changeButton = element('changePinButton', 'button');

  const importFile = element('importFile', 'input');
  const purgeButton = element('purgeButton', 'button');
  const purgeHint = element('purgeHint', 'p');
  let purgeVersion = 0;

  function exportBookmarks(): void {
    const exportedAt = new Date();
    let lastChange: string | null;
    let output: string;
    try {
      lastChange = storage.lastChange();
      output = store.exportBackup();
    } catch {
      notify(messages().loadFailed);
      return;
    }
    const objectUrl = URL.createObjectURL(new Blob([output], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = messages().backupFilename(filenameTimestamp(exportedAt));
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
    try {
      storage.recordExport(exportedAt, lastChange);
    } catch {
      notify(messages().saveFailed);
    }
  }

  async function importBookmarks(): Promise<void> {
    const file = importFile.files?.[0];
    importFile.value = '';
    if (!file) return;

    const version = purgeVersion;
    let entries: Library;
    try {
      entries = parseLibrary(JSON.parse(await file.text()));
    } catch {
      notify(messages().importFailed);
      return;
    }
    if (version !== purgeVersion) return;
    const merged = mergeLibrary(store.data, entries);
    const added = merged.bookmarks.length - store.data.bookmarks.length;
    const addedLabels = merged.labels.length - store.data.labels.length;
    if (!added && !addedLabels) {
      notify(messages().nothingToImport);
      return;
    }
    if (store.save(merged)) notify(messages().imported(added, addedLabels));
  }

  function purgeData(): void {
    if (!storage.hasCurrentBackup() || !window.confirm(messages().confirmPurge)) return;
    // Another tab may have saved changes while the confirmation was open.
    if (!storage.hasCurrentBackup()) return;
    purgeVersion++;
    if (!store.clear() || !pin.clearSettings() || !clearAppearance() || !clearLanguage()) return;
    try {
      storage.clearBackupHistory();
    } catch {
      notify(messages().saveFailed);
      return;
    }
    render();
    notify(messages().purged);
  }

  function updatePurgeButton(): void {
    purgeButton.disabled = !storage.hasCurrentBackup();
    purgeHint.hidden = !purgeButton.disabled;
  }

  function render(): void {
    updatePurgeButton();
    pinSwitch.setAttribute('aria-checked', String(pin.enabled));
    changeButton.hidden = !pin.enabled;
  }

  pinSwitch.disabled = !crypto.subtle;
  element('pinUnavailable', 'p').hidden = !pinSwitch.disabled;
  pinSwitch.addEventListener('click', pin.toggleProtection);
  changeButton.addEventListener('click', pin.changePin);

  element('exportButton', 'button').addEventListener('click', exportBookmarks);
  element('importButton', 'button').addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', importBookmarks);
  purgeButton.addEventListener('click', purgeData);
  storage.onBackupChange(updatePurgeButton);

  return {
    path: '/settings',
    root: element('settingsView', 'main'),
    render,
  };
}
