import { messages } from '../i18n';
import { createId, parseImport } from '../bookmarks/model';
import type { Bookmark } from '../bookmarks/model';
import type { BookmarkStore } from '../bookmarks/store';
import { element } from '../dom';
import type { PinControls } from '../pin/view';
import type { View } from '../views';
import { initAppearance } from './appearance';

interface Options {
  store: BookmarkStore;
  clearLanguage: () => boolean;
  pin: Pick<PinControls, 'enabled' | 'toggleProtection' | 'changePin' | 'clearSettings'>;
  notify: (message: string) => void;
}

export function initSettings({ store, pin, notify, clearLanguage }: Options): View {
  const clearAppearance = initAppearance(notify);
  const pinSwitch = element('pinSwitch', 'button');
  const changeButton = element('changePinButton', 'button');

  const importFile = element('importFile', 'input');
  let purgeVersion = 0;

  function exportBookmarks(): void {
    const bookmarks = store.items.map(({ name, url, creation, updated }) => ({ name, url, creation, updated }));
    const output = JSON.stringify({ bookmarks }, null, 2);
    const objectUrl = URL.createObjectURL(new Blob([output], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = messages().backupFilename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
  }

  async function importBookmarks(): Promise<void> {
    const file = importFile.files?.[0];
    importFile.value = '';
    if (!file) return;

    const version = purgeVersion;
    let entries: Bookmark[];
    try {
      entries = parseImport(await file.text());
    } catch {
      notify(messages().importFailed);
      return;
    }
    if (version !== purgeVersion) return;
    const urls = new Set(store.items.map(({ url }) => url));
    const fresh: Bookmark[] = [];
    for (const entry of entries) {
      if (urls.has(entry.url)) continue;
      urls.add(entry.url);
      fresh.push({ ...entry, id: createId() });
    }
    if (!fresh.length) {
      notify(messages().noNewBookmarks);
      return;
    }
    if (store.save([...fresh, ...store.items])) notify(messages().imported(fresh.length));
  }

  function purgeData(): void {
    if (!window.confirm(messages().confirmPurge)) return;
    purgeVersion++;
    if (!store.save([]) || !pin.clearSettings() || !clearAppearance() || !clearLanguage()) return;
    render();
    notify(messages().purged);
  }

  function render(): void {
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
  element('purgeButton', 'button').addEventListener('click', purgeData);

  return {
    root: element('settingsView', 'main'),
    render,
  };
}
