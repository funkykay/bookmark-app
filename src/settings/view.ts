import { createId, parseImport } from '../bookmarks/model';
import type { Bookmark } from '../bookmarks/model';
import type { BookmarkStore } from '../bookmarks/store';
import { element } from '../dom';
import type { PinControls } from '../pin/view';
import type { View } from '../views';

interface Options {
  store: BookmarkStore;
  pin: Pick<PinControls, 'enabled' | 'toggleProtection' | 'changePin' | 'clearSettings'>;
  notify: (message: string) => void;
}

export function initSettings({ store, pin, notify }: Options): View {
  const pinSwitch = element('pinSwitch', 'button');
  const changeButton = element('changePinButton', 'button');

  const importFile = element('importFile', 'input');
  let purgeVersion = 0;

  function exportBookmarks(): void {
    const output = JSON.stringify({ bookmarks: store.items.map(({ name, url }) => ({ name, url })) }, null, 2);
    const objectUrl = URL.createObjectURL(new Blob([output], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = 'lesezeichen-backup.json';
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
      notify('Datei konnte nicht importiert werden.');
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
      notify('Keine neuen Lesezeichen');
      return;
    }
    if (store.save([...fresh, ...store.items])) notify(`${fresh.length} Lesezeichen importiert`);
  }

  function purgeData(): void {
    if (!window.confirm('Alle Lesezeichen und PIN-Einstellungen in diesem Browser endgültig löschen?')) return;
    purgeVersion++;
    if (!store.save([]) || !pin.clearSettings()) return;
    render();
    notify('Alle App-Daten wurden gelöscht.');
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
