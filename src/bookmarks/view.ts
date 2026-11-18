import { element } from '../dom';
import type { View } from '../views';
import type { PinControls } from '../pin/view';
import { createBookmarkCard } from './card';
import { createId, maxNameLength, normalizeUrl, parseImport } from './model';
import type { Bookmark } from './model';
import type { BookmarkStore } from './store';

interface Options {
  store: BookmarkStore;
  pin: Pick<PinControls, 'enabled' | 'lock'>;
  notify: (message: string) => void;
}

export function initBookmarks({ store, pin, notify }: Options): View {
  const list = element('list', 'ul');
  const search = element('search', 'input');
  const editor = element('editor', 'dialog');
  const editorTitle = element('editorTitle', 'h2');
  const nameInput = element('nameInput', 'input');
  const urlInput = element('urlInput', 'input');
  const error = element('error', 'p');
  const deleteButton = element('deleteButton', 'button');
  const addButton = element('addButton', 'button');
  const empty = element('empty', 'div');
  const emptyText = element('emptyText', 'span');
  const emptyAdd = element('emptyAdd', 'button');
  const importFile = element('importFile', 'input');

  const lockButton = element('lockButton', 'button');
  const menu = element('popup', 'div');
  const menuButton = element('menuButton', 'button');

  function showMenu(open: boolean): void {
    menu.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
  }

  function closeMenu(): void {
    showMenu(false);
  }

  menuButton.addEventListener('click', () => showMenu(menu.hasAttribute('hidden')));
  document.addEventListener('click', (event) => {
    if (event.target instanceof Node && !menu.contains(event.target) && !menuButton.contains(event.target)) {
      closeMenu();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      closeMenu();
      menuButton.focus();
    }
  });

  let editingId: string | null = null;

  function render(): void {
    lockButton.hidden = !pin.enabled;
    const query = search.value.trim().toLocaleLowerCase('de');
    const shown = store.items.filter(({ name, url }) => `${name} ${url}`.toLocaleLowerCase('de').includes(query));
    const fragment = document.createDocumentFragment();
    for (const bookmark of shown) fragment.append(createCard(bookmark));
    list.replaceChildren(fragment);

    const searching = Boolean(store.items.length && query);
    empty.hidden = shown.length > 0;
    emptyText.textContent = searching ? 'Keine Treffer' : 'Noch keine Lesezeichen';
    emptyAdd.hidden = searching;
  }

  function createCard(bookmark: Bookmark): HTMLLIElement {
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'edit';
    action.setAttribute('aria-label', `${bookmark.name} bearbeiten`);
    action.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
    action.addEventListener('click', () => openEditor(bookmark));
    return createBookmarkCard(bookmark, document.createElement('a'), action);
  }

  function openEditor(bookmark?: Bookmark): void {
    closeMenu();
    editingId = bookmark?.id ?? null;
    editorTitle.textContent = bookmark ? 'Lesezeichen bearbeiten' : 'Lesezeichen hinzufügen';
    nameInput.value = bookmark?.name ?? '';
    urlInput.value = bookmark?.url ?? '';
    deleteButton.hidden = !bookmark;
    error.textContent = '';
    editor.showModal();
    nameInput.focus();
  }

  function saveEditor(event: SubmitEvent): void {
    event.preventDefault();
    const name = nameInput.value.trim().slice(0, maxNameLength);
    const url = normalizeUrl(urlInput.value);
    if (!name) {
      error.textContent = 'Bitte einen Namen eingeben.';
      nameInput.focus();
      return;
    }
    if (!url) {
      error.textContent = 'Bitte eine gültige Webadresse eingeben.';
      urlInput.focus();
      return;
    }

    const next = editingId
      ? store.items.map((bookmark) => bookmark.id === editingId ? { ...bookmark, name, url } : bookmark)
      : [{ id: createId(), name, url }, ...store.items];
    if (store.save(next)) editor.close();
  }

  function deleteBookmark(): void {
    const bookmark = store.items.find(({ id }) => id === editingId);
    if (!bookmark || !window.confirm(`„${bookmark.name}“ löschen?`)) return;
    if (store.save(store.items.filter(({ id }) => id !== bookmark.id))) editor.close();
  }

  function exportBookmarks(): void {
    closeMenu();
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

    let entries: Bookmark[];
    try {
      entries = parseImport(await file.text());
    } catch {
      notify('Datei konnte nicht importiert werden.');
      return;
    }
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

  lockButton.addEventListener('click', pin.lock);
  element('editorForm', 'form').addEventListener('submit', saveEditor);
  element('cancelButton', 'button').addEventListener('click', () => editor.close());
  editor.addEventListener('click', (event) => { if (event.target === editor) editor.close(); });
  deleteButton.addEventListener('click', deleteBookmark);
  addButton.addEventListener('click', () => openEditor());
  emptyAdd.addEventListener('click', () => openEditor());
  search.addEventListener('input', render);
  element('exportButton', 'button').addEventListener('click', exportBookmarks);
  element('importButton', 'button').addEventListener('click', () => { closeMenu(); importFile.click(); });
  importFile.addEventListener('change', () => { void importBookmarks(); });

  return {
    root: element('bookmarksView', 'main'),
    render,
    leave() {
      closeMenu();
      if (editor.open) editor.close();
    },
  };
}
