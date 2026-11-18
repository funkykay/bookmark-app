import { element } from '../dom';
import { createId, hostname, loadBookmarks, maxNameLength, normalizeUrl, parseImport, saveBookmarks } from './model';
import type { Bookmark } from './model';

const tiles = [
  ['#e8efff', '#4265c9'], ['#e3f3ee', '#20846d'], ['#ffecdf', '#b66a31'],
  ['#f0e8fa', '#8252aa'], ['#fce7ec', '#bd526f'], ['#e6f1f7', '#417e9d'],
] as const;

interface DragState {
  item: HTMLLIElement;
  ghost: HTMLLIElement;
  pointerId: number;
  y: number;
  offsetY: number;
}

interface Options {
  closeMenu: () => void;
  notify: (message: string) => void;
}

export function initBookmarks({ closeMenu, notify }: Options): () => void {
  const list = element('list', 'ul');
  const search = element('search', 'input');
  const searchBar = element('searchBar', 'div');
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
  const reorderButton = element('reorderButton', 'button');
  const doneButton = element('doneReorderButton', 'button');
  const announcer = element('reorderAnnouncer', 'span');
  const importFile = element('importFile', 'input');

  let bookmarks: Bookmark[] = [];
  let editingId: string | null = null;
  let reordering = false;
  let drag: DragState | null = null;
  let frame: number | undefined;

  function render(): void {
    const query = reordering ? '' : search.value.trim().toLocaleLowerCase('de');
    const shown = bookmarks.filter(({ name, url }) => `${name} ${url}`.toLocaleLowerCase('de').includes(query));
    const fragment = document.createDocumentFragment();
    for (const bookmark of shown) fragment.append(createCard(bookmark));
    list.replaceChildren(fragment);

    const searching = Boolean(bookmarks.length && query);
    empty.hidden = shown.length > 0;
    emptyText.textContent = searching ? 'Keine Treffer' : 'Noch keine Lesezeichen';
    emptyAdd.hidden = reordering || searching;
  }

  function createCard(bookmark: Bookmark): HTMLLIElement {
    const { id, name, url } = bookmark;
    const domain = hostname(url);
    const card = document.createElement('li');
    card.className = reordering ? 'bookmark reordering' : 'bookmark';
    card.dataset.bookmarkId = id;

    const content = document.createElement(reordering ? 'div' : 'a');
    content.className = 'bookmark-content';
    if (content instanceof HTMLAnchorElement) {
      content.href = url;
      content.title = url;
      content.setAttribute('aria-label', `${name} öffnen`);
    }

    const glyph = document.createElement('span');
    glyph.className = 'glyph';
    glyph.textContent = (name.charAt(0) || '?').toLocaleUpperCase('de');
    const colorIndex = [...domain].reduce((sum, char) => sum + char.charCodeAt(0), 0) % tiles.length;
    const [background, foreground] = tiles[colorIndex] ?? tiles[0];
    glyph.style.setProperty('--tile-bg', background);
    glyph.style.setProperty('--tile-fg', foreground);

    const detail = document.createElement('span');
    detail.className = 'bookmark-title';
    const title = document.createElement('span');
    title.className = 'name';
    title.textContent = name;
    const subtitle = document.createElement('span');
    subtitle.className = 'domain';
    subtitle.textContent = domain;
    detail.append(title, subtitle);
    content.append(glyph, detail);

    const action = document.createElement('button');
    action.type = 'button';
    if (reordering) {
      action.className = 'drag-handle';
      action.title = 'Ziehen oder mit Pfeiltasten verschieben';
      action.setAttribute('aria-label', `${name} verschieben. Ziehen oder Pfeiltasten nutzen.`);
      action.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v16M15 4v16" stroke-dasharray="1 4" stroke-width="3.5"/></svg>';
    } else {
      action.className = 'edit';
      action.setAttribute('aria-label', `${name} bearbeiten`);
      action.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
      action.addEventListener('click', () => openEditor(bookmark));
    }
    card.append(content, action);
    return card;
  }

  function commit(next: Bookmark[]): boolean {
    try {
      saveBookmarks(next);
    } catch {
      notify('Speichern nicht möglich. Bitte die Browser-Einstellungen prüfen.');
      return false;
    }
    bookmarks = next;
    render();
    return true;
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
      ? bookmarks.map((bookmark) => bookmark.id === editingId ? { ...bookmark, name, url } : bookmark)
      : [{ id: createId(), name, url }, ...bookmarks];
    if (commit(next)) editor.close();
  }

  function deleteBookmark(): void {
    const bookmark = bookmarks.find(({ id }) => id === editingId);
    if (!bookmark || !window.confirm(`„${bookmark.name}“ löschen?`)) return;
    if (commit(bookmarks.filter(({ id }) => id !== bookmark.id))) editor.close();
  }

  function exportBookmarks(): void {
    closeMenu();
    const output = JSON.stringify({ bookmarks: bookmarks.map(({ name, url }) => ({ name, url })) }, null, 2);
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
    const urls = new Set(bookmarks.map(({ url }) => url));
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
    finishDrag(true);
    if (commit([...fresh, ...bookmarks])) notify(`${fresh.length} Lesezeichen importiert`);
  }

  function setReordering(enabled: boolean): void {
    finishDrag(true);
    reordering = enabled;
    closeMenu();
    searchBar.hidden = enabled;
    addButton.hidden = enabled;
    doneButton.hidden = !enabled;
    reorderButton.textContent = enabled ? 'Reihenfolge fertig' : 'Reihenfolge ändern';
    render();
    (enabled ? doneButton : addButton).focus();
  }

  function placeDraggedItem(y: number): void {
    if (!drag) return;
    const { item } = drag;
    const before = Array.from(list.children).find((sibling) => {
      if (sibling === item) return false;
      const rect = sibling.getBoundingClientRect();
      return y < rect.top + rect.height / 2;
    });
    if (before) list.insertBefore(item, before);
    else list.append(item);
  }

  function animateDrag(): void {
    if (!drag) return;
    const edge = 86;
    const bottom = window.innerHeight - edge;
    const speed = drag.y < edge ? -Math.min(18, (edge - drag.y) / 4)
      : drag.y > bottom ? Math.min(18, (drag.y - bottom) / 4) : 0;
    if (speed) {
      window.scrollBy(0, speed);
      placeDraggedItem(drag.y);
    }
    frame = window.requestAnimationFrame(animateDrag);
  }

  function moveDrag(event: PointerEvent): void {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (event.cancelable) event.preventDefault();
    drag.y = event.clientY;
    drag.ghost.style.top = `${event.clientY - drag.offsetY}px`;
    placeDraggedItem(event.clientY);
  }

  function finishDrag(cancelled: boolean): void {
    if (!drag) return;
    const { ghost } = drag;
    drag = null;
    if (frame !== undefined) window.cancelAnimationFrame(frame);
    frame = undefined;
    window.removeEventListener('pointermove', moveDrag);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', cancelDrag);
    ghost.remove();

    const byId = new Map(bookmarks.map((bookmark) => [bookmark.id, bookmark]));
    const next = Array.from(list.querySelectorAll<HTMLLIElement>('li[data-bookmark-id]'))
      .map((item) => byId.get(item.dataset.bookmarkId ?? ''))
      .filter((bookmark) => bookmark !== undefined);
    if (cancelled || next.length !== bookmarks.length || next.every((bookmark, index) => bookmark === bookmarks[index]) || !commit(next)) {
      render();
    }
  }

  function endDrag(event: PointerEvent): void {
    if (event.pointerId === drag?.pointerId) finishDrag(false);
  }

  function cancelDrag(event: PointerEvent): void {
    if (event.pointerId === drag?.pointerId) finishDrag(true);
  }

  function findDraggedCard(target: EventTarget | null): HTMLLIElement | null {
    if (!(target instanceof Element)) return null;
    return target.closest('.drag-handle')?.closest<HTMLLIElement>('li[data-bookmark-id]') ?? null;
  }

  function startDrag(event: PointerEvent): void {
    if (!reordering || drag || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const item = findDraggedCard(event.target);
    if (!item) return;
    event.preventDefault();

    const rect = item.getBoundingClientRect();
    const ghost = item.cloneNode(true) as HTMLLIElement;
    ghost.classList.add('drag-ghost');
    ghost.inert = true;
    ghost.style.width = `${rect.width}px`;
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    document.body.append(ghost);
    item.classList.add('drag-placeholder');
    drag = { item, ghost, pointerId: event.pointerId, y: event.clientY, offsetY: event.clientY - rect.top };
    window.addEventListener('pointermove', moveDrag, { passive: false });
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', cancelDrag);
    frame = window.requestAnimationFrame(animateDrag);
  }

  function keyboardReorder(event: KeyboardEvent): void {
    if (!reordering || drag || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    const item = findDraggedCard(event.target);
    if (!item) return;
    event.preventDefault();

    const index = bookmarks.findIndex(({ id }) => id === item.dataset.bookmarkId);
    const nextIndex = index + (event.key === 'ArrowUp' ? -1 : 1);
    const moved = bookmarks[index];
    if (!moved || nextIndex < 0 || nextIndex >= bookmarks.length) return;
    const next = bookmarks.slice();
    next.splice(index, 1);
    next.splice(nextIndex, 0, moved);
    if (!commit(next)) return;
    list.children[nextIndex]?.querySelector('button')?.focus();
    announcer.textContent = `${moved.name}, Position ${nextIndex + 1} von ${next.length}`;
  }

  element('editorForm', 'form').addEventListener('submit', saveEditor);
  element('cancelButton', 'button').addEventListener('click', () => editor.close());
  editor.addEventListener('click', (event) => { if (event.target === editor) editor.close(); });
  deleteButton.addEventListener('click', deleteBookmark);
  addButton.addEventListener('click', () => openEditor());
  emptyAdd.addEventListener('click', () => openEditor());
  search.addEventListener('input', render);
  reorderButton.addEventListener('click', () => setReordering(!reordering));
  doneButton.addEventListener('click', () => setReordering(false));
  list.addEventListener('pointerdown', startDrag);
  list.addEventListener('keydown', keyboardReorder);
  element('exportButton', 'button').addEventListener('click', exportBookmarks);
  element('importButton', 'button').addEventListener('click', () => { closeMenu(); importFile.click(); });
  importFile.addEventListener('change', () => { void importBookmarks(); });

  try {
    bookmarks = loadBookmarks();
  } catch {
    notify('Lokale Speicherung ist in diesem Modus gesperrt.');
  }
  render();

  return () => {
    finishDrag(true);
    if (editor.open) editor.close();
  };
}
