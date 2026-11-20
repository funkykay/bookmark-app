import { currentLanguage, messages } from '../i18n';
import { element } from '../dom';
import type { View } from '../views';
import type { PinControls } from '../pin/view';
import { createBookmarkCard } from './card';
import { createId, labelKey, maxNameLength, normalizeUrl } from './model';
import { labelBadge, sortedLabels } from '../labels/display';
import { initLabelPicker } from '../labels/picker';
import type { Bookmark, Label } from './model';
import type { BookmarkStore } from './store';

interface Options {
  store: BookmarkStore;
  pin: Pick<PinControls, 'enabled' | 'lock'>;
}

export function initBookmarks({ store, pin }: Options): View {
  const root = element('bookmarksView', 'main');
  const list = element('list', 'ul');
  const search = element('search', 'input');
  const resetSearch = element('resetSearch', 'button');
  const labelFilter = element('labelFilter', 'button');
  const labelFilterName = element('labelFilterName', 'span');
  const labelTiles = element('labelTiles', 'div');
  const picker = initLabelPicker();
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
  const desktopLock = element('desktopLock', 'button');
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
  let selectedLabelId = '';

  function closeLabelTiles(): void {
    labelTiles.hidden = true;
    labelFilter.setAttribute('aria-expanded', 'false');
  }

  function selectLabel(id: string): void {
    selectedLabelId = id;
    labelFilterName.textContent = labels.get(id)?.name ?? messages().labels;
    labelFilter.classList.toggle('active', Boolean(id));
    closeLabelTiles();
    renderList();
  }

  function filterTile(label?: Label): HTMLButtonElement {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.value = label?.id ?? '';
    tile.append(label ? labelBadge(label) : messages().allLabels);
    tile.addEventListener('click', () => {
      selectLabel(tile.value);
      labelFilter.focus();
    });
    return tile;
  }

  function render(): void {
    lockButton.hidden = !pin.enabled;
    desktopLock.hidden = !pin.enabled;
    labels = new Map(store.data.labels.map(label => [label.id, label]));
    const used = new Set(store.data.bookmarks.flatMap(bookmark => bookmark.labelIds));
    const sorted = sortedLabels(store.data.labels.filter(label => used.has(label.id)));
    labelTiles.replaceChildren(filterTile(), ...sorted.map(filterTile));
    labelFilter.hidden = sorted.length === 0;
    selectLabel(used.has(selectedLabelId) && labels.has(selectedLabelId) ? selectedLabelId : '');
  }

  function renderList(): void {
    const query = search.value.trim().toLocaleLowerCase(currentLanguage());
    resetSearch.disabled = !search.value && !selectedLabelId;
    const shown = store.data.bookmarks.filter(({ name, url, labelIds }) =>
      (!selectedLabelId || labelIds.includes(selectedLabelId))
      && `${name} ${url}`.toLocaleLowerCase(currentLanguage()).includes(query));
    const fragment = document.createDocumentFragment();
    for (const bookmark of shown) {
      fragment.append(createBookmarkCard(bookmark, labels, openEditor));
    }
    list.replaceChildren(fragment);

    const searching = Boolean(store.data.bookmarks.length && query);
    empty.hidden = shown.length > 0;
    emptyText.textContent = searching ? messages().noResults : messages().noBookmarks;
    emptyAdd.hidden = searching;
  }

  function openEditor(bookmark?: Bookmark): void {
    closeMenu();
    closeLabelTiles();
    editingId = bookmark?.id ?? null;
    editorTitle.textContent = bookmark ? messages().editBookmark : messages().addBookmark;
    nameInput.value = bookmark?.name ?? '';
    urlInput.value = bookmark?.url ?? '';
    const ids = bookmark?.labelIds ?? [selectedLabelId];
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
  desktopLock.addEventListener('click', pin.lock);
  element('editorForm', 'form').addEventListener('submit', saveEditor);
  element('cancelButton', 'button').addEventListener('click', () => editor.close());
  editor.addEventListener('click', (event) => { if (event.target === editor) editor.close(); });
  deleteButton.addEventListener('click', deleteBookmark);
  addButton.addEventListener('click', () => openEditor());
  element('desktopAdd', 'button').addEventListener('click', () => openEditor());
  emptyAdd.addEventListener('click', () => openEditor());
  search.addEventListener('input', renderList);
  resetSearch.addEventListener('click', () => {
    search.value = '';
    selectLabel('');
    search.focus();
  });
  document.addEventListener('keydown', (event) => {
    if (root.hidden || document.documentElement.dataset.layout !== 'desktop' || editor.open || !menu.hidden) return;
    if (event.defaultPrevented || event.isComposing || event.metaKey) return;
    if ((event.ctrlKey || event.altKey) && !event.getModifierState('AltGraph')) return;
    if (event.key === ' ' || (event.key !== 'Dead' && [...event.key].length !== 1)) return;
    if (event.target instanceof HTMLElement &&
        (event.target.isContentEditable || event.target.closest('input, textarea, select'))) return;

    // Focus before the browser inserts the character so typing uses the normal input event.
    search.focus();
  });
  labelFilter.addEventListener('click', () => {
    if (!labelTiles.hidden) {
      closeLabelTiles();
      return;
    }
    labelTiles.hidden = false;
    labelFilter.setAttribute('aria-expanded', 'true');
    for (const tile of labelTiles.querySelectorAll('button')) {
      const selected = tile.value === selectedLabelId;
      tile.setAttribute('aria-pressed', String(selected));
      if (selected) tile.focus();
    }
  });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !labelTiles.hidden) {
      closeLabelTiles();
      labelFilter.focus();
    }
  });

  return {
    path: '/bookmarks',
    root,
    render,
    leave() {
      closeMenu();
      closeLabelTiles();
      if (editor.open) editor.close();
    },
  };
}
