import { currentLanguage, messages } from '../i18n';
import { element } from '../dom';
import type { View } from '../views';
import type { PinControls } from '../pin/view';
import { filterBookmarks } from './filter';
import { createBookmarkList } from './list';
import { deleteBookmark, saveBookmark } from './operations';
import { createLibraryEditor } from './editor';
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
  const list = createBookmarkList(element('list', 'ul'), id => {
    const bookmark = store.data.bookmarks.find(item => item.id === id);
    if (bookmark) openEditor(bookmark);
  });
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

  const form = element('editorForm', 'form');
  const draft = createLibraryEditor<Bookmark>(store, editor, form, error);
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
    list.retain(store.data.bookmarks);
    labels = new Map(store.data.labels.map(label => [label.id, label]));
    const used = new Set(store.data.bookmarks.flatMap(bookmark => bookmark.labelIds));
    const sorted = sortedLabels(store.data.labels.filter(label => used.has(label.id)));
    labelTiles.replaceChildren(filterTile(), ...sorted.map(filterTile));
    labelFilter.hidden = sorted.length === 0;
    selectLabel(used.has(selectedLabelId) && labels.has(selectedLabelId) ? selectedLabelId : '');
  }

  function renderList(): void {
    const { bookmarks } = store.data;
    const shown = filterBookmarks(bookmarks, search.value, selectedLabelId, currentLanguage());
    list.render(shown, labels);

    resetSearch.disabled = !search.value && !selectedLabelId;
    const searching = Boolean(bookmarks.length && search.value.trim());
    empty.hidden = shown.length > 0;
    emptyText.textContent = searching ? messages().noResults : messages().noBookmarks;
    emptyAdd.hidden = searching;
  }

  function openEditor(bookmark?: Bookmark): void {
    closeMenu();
    closeLabelTiles();
    draft.begin(bookmark);
    editorTitle.textContent = bookmark ? messages().editBookmark : messages().addBookmark;
    nameInput.value = bookmark?.name ?? '';
    urlInput.value = bookmark?.url ?? '';
    const ids = bookmark?.labelIds ?? [selectedLabelId];
    picker.reset(store.data.labels, ids.map(id => labels.get(id)).filter(label => label !== undefined));
    deleteButton.hidden = !bookmark;
    editor.showModal();
    nameInput.focus();
  }

  function saveEditor(event: SubmitEvent): void {
    event.preventDefault();
    const input = { name: nameInput.value, url: urlInput.value, labels: picker.read() };
    void draft.submit((library, original) => saveBookmark(library, input, original), undefined, issue => {
      if (issue === 'missingName') nameInput.focus();
      if (issue === 'invalidUrl') urlInput.focus();
    });
  }

  function confirmDelete(): void {
    const bookmark = draft.original;
    if (bookmark && window.confirm(messages().deleteNamed(bookmark.name))) {
      void draft.submit(library => deleteBookmark(library, bookmark));
    }
  }

  lockButton.addEventListener('click', pin.lock);
  desktopLock.addEventListener('click', pin.lock);
  form.addEventListener('submit', saveEditor);
  element('cancelButton', 'button').addEventListener('click', () => editor.close());
  editor.addEventListener('click', (event) => { if (event.target === editor) editor.close(); });
  deleteButton.addEventListener('click', confirmDelete);
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
