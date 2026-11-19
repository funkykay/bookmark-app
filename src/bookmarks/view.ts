import { currentLanguage, messages } from '../i18n';
import { element } from '../dom';
import type { View } from '../views';
import type { PinControls } from '../pin/view';
import { createBookmarkCard } from './card';
import { createId, labelKey, maxNameLength, normalizeUrl } from './model';
import { sortedLabels } from '../labels/display';
import { initLabelPicker } from '../labels/picker';
import type { Bookmark, Label } from './model';
import type { BookmarkStore } from './store';

interface Options {
  store: BookmarkStore;
  pin: Pick<PinControls, 'enabled' | 'lock'>;
}

export function initBookmarks({ store, pin }: Options): View {
  const list = element('list', 'ul');
  const search = element('search', 'input');
  const labelFilter = element('labelFilter', 'select');
  const picker = initLabelPicker();
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
  let labels = new Map<string, Label>();

  function render(): void {
    lockButton.hidden = !pin.enabled;
    const previousFilter = labelFilter.value;
    labels = new Map(store.data.labels.map(label => [label.id, label]));
    const used = new Set(store.data.bookmarks.flatMap(bookmark => bookmark.labelIds));
    const sorted = sortedLabels(store.data.labels.filter(label => used.has(label.id)));
    labelFilter.replaceChildren(new Option(messages().allLabels, ''), ...sorted.map(label => new Option(label.name, label.id)));
    labelFilter.value = used.has(previousFilter) ? previousFilter : '';
    labelFilter.hidden = sorted.length === 0;
    renderList();
  }

  function renderList(): void {
    const query = search.value.trim().toLocaleLowerCase(currentLanguage());
    const selected = labelFilter.value;
    const shown = store.data.bookmarks.filter(({ name, url, labelIds }) =>
      (!selected || labelIds.includes(selected))
      && `${name} ${url}`.toLocaleLowerCase(currentLanguage()).includes(query));
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

    const searching = Boolean(store.data.bookmarks.length && query);
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
    return createBookmarkCard(bookmark, labels, document.createElement('a'), action, updatedDate);
  }

  function openEditor(bookmark?: Bookmark): void {
    closeMenu();
    editingId = bookmark?.id ?? null;
    editorTitle.textContent = bookmark ? messages().editBookmark : messages().addBookmark;
    nameInput.value = bookmark?.name ?? '';
    urlInput.value = bookmark?.url ?? '';
    const ids = bookmark?.labelIds ?? [labelFilter.value];
    picker.reset(store.data.labels, ids.map(id => labels.get(id)).filter(label => label !== undefined));
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

    const byName = new Map(store.data.labels.map(label => [labelKey(label.name), label]));
    const chosen = picker.read().map(label => labels.get(label.id) ?? byName.get(labelKey(label.name)) ?? label);
    const labelIds = chosen.map(label => label.id);
    const fresh = chosen.filter(label => !labels.has(label.id));
    const now = new Date().toISOString();
    const next = editingId
      ? store.data.bookmarks.map((bookmark) => {
        if (bookmark.id !== editingId) return bookmark;
        const sameLabels = labelIds.length === bookmark.labelIds.length && labelIds.every((id, i) => id === bookmark.labelIds[i]);
        if (bookmark.name === name && bookmark.url === url && sameLabels) return bookmark;
        return { ...bookmark, name, url, labelIds, updated: now };
      })
      : [{ id: createId(), name, url, labelIds, creation: now, updated: now }, ...store.data.bookmarks];
    if (store.save({ bookmarks: next, labels: [...store.data.labels, ...fresh] })) editor.close();
  }

  function deleteBookmark(): void {
    const bookmark = store.data.bookmarks.find(({ id }) => id === editingId);
    if (!bookmark || !window.confirm(messages().deleteNamed(bookmark.name))) return;
    if (store.save({ ...store.data, bookmarks: store.data.bookmarks.filter(({ id }) => id !== bookmark.id) })) editor.close();
  }

  lockButton.addEventListener('click', pin.lock);
  element('editorForm', 'form').addEventListener('submit', saveEditor);
  element('cancelButton', 'button').addEventListener('click', () => editor.close());
  editor.addEventListener('click', (event) => { if (event.target === editor) editor.close(); });
  deleteButton.addEventListener('click', deleteBookmark);
  addButton.addEventListener('click', () => openEditor());
  emptyAdd.addEventListener('click', () => openEditor());
  search.addEventListener('input', renderList);
  labelFilter.addEventListener('change', renderList);
  sortOrder.addEventListener('change', renderList);

  return {
    root: element('bookmarksView', 'main'),
    render,
    leave() {
      closeMenu();
      if (editor.open) editor.close();
    },
  };
}
