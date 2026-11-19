import { currentLanguage, messages } from '../i18n';
import { element } from '../dom';
import type { View } from '../views';
import type { PinControls } from '../pin/view';
import { createBookmarkCard } from './card';
import { createId, maxNameLength, normalizeUrl } from './model';
import type { Bookmark } from './model';
import type { BookmarkStore } from './store';

interface Options {
  store: BookmarkStore;
  pin: Pick<PinControls, 'enabled' | 'lock'>;
}

export function initBookmarks({ store, pin }: Options): View {
  const list = element('list', 'ul');
  const search = element('search', 'input');
  const sortOrder = element('sortOrder', 'select');
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
    const query = search.value.trim().toLocaleLowerCase(currentLanguage());
    const shown = store.items.filter(({ name, url }) => `${name} ${url}`.toLocaleLowerCase(currentLanguage()).includes(query));
    const byUpdated = sortOrder.value === 'updated';
    if (byUpdated) {
      shown.sort((a, b) => Date.parse(b.updated) - Date.parse(a.updated));
    }
    sortOrder.title = sortOrder.selectedOptions[0]?.textContent ?? '';
    const fragment = document.createDocumentFragment();
    const dates = byUpdated
      ? new Intl.DateTimeFormat(currentLanguage(), { dateStyle: 'medium', timeStyle: 'short' })
      : undefined;
    for (const bookmark of shown) {
      fragment.append(createCard(bookmark, dates?.format(Date.parse(bookmark.updated))));
    }
    list.replaceChildren(fragment);

    const searching = Boolean(store.items.length && query);
    empty.hidden = shown.length > 0;
    emptyText.textContent = searching ? messages().noResults : messages().noBookmarks;
    emptyAdd.hidden = searching;
  }

  function createCard(bookmark: Bookmark, updatedDate?: string): HTMLLIElement {
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'edit';
    action.setAttribute('aria-label', messages().editNamed(bookmark.name));
    action.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
    action.addEventListener('click', () => openEditor(bookmark));
    return createBookmarkCard(bookmark, document.createElement('a'), action, updatedDate);
  }

  function openEditor(bookmark?: Bookmark): void {
    closeMenu();
    editingId = bookmark?.id ?? null;
    editorTitle.textContent = bookmark ? messages().editBookmark : messages().addBookmark;
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
      error.textContent = messages().missingName;
      nameInput.focus();
      return;
    }
    if (!url) {
      error.textContent = messages().invalidUrl;
      urlInput.focus();
      return;
    }

    const now = new Date().toISOString();
    const next = editingId
      ? store.items.map((bookmark) => {
        if (bookmark.id !== editingId || (bookmark.name === name && bookmark.url === url)) return bookmark;
        return { ...bookmark, name, url, updated: now };
      })
      : [{ id: createId(), name, url, creation: now, updated: now }, ...store.items];
    if (store.save(next)) editor.close();
  }

  function deleteBookmark(): void {
    const bookmark = store.items.find(({ id }) => id === editingId);
    if (!bookmark || !window.confirm(messages().deleteNamed(bookmark.name))) return;
    if (store.save(store.items.filter(({ id }) => id !== bookmark.id))) editor.close();
  }

  lockButton.addEventListener('click', pin.lock);
  element('editorForm', 'form').addEventListener('submit', saveEditor);
  element('cancelButton', 'button').addEventListener('click', () => editor.close());
  editor.addEventListener('click', (event) => { if (event.target === editor) editor.close(); });
  deleteButton.addEventListener('click', deleteBookmark);
  addButton.addEventListener('click', () => openEditor());
  emptyAdd.addEventListener('click', () => openEditor());
  search.addEventListener('input', render);
  sortOrder.addEventListener('change', render);

  return {
    root: element('bookmarksView', 'main'),
    render,
    leave() {
      closeMenu();
      if (editor.open) editor.close();
    },
  };
}
