import { createBookmarkCard } from '../bookmarks/card';
import type { BookmarkStore } from '../bookmarks/store';
import { element } from '../dom';
import type { View } from '../views';

interface DragState {
  item: HTMLLIElement;
  ghost: HTMLLIElement;
  pointerId: number;
  y: number;
  offsetY: number;
}

export function initReorder(store: BookmarkStore): View {
  const list = element('reorderList', 'ul');
  const empty = element('reorderEmpty', 'p');
  const announcer = element('reorderAnnouncer', 'span');
  let drag: DragState | null = null;
  let frame: number | undefined;

  function render(): void {
    clearDrag();
    const cards = store.items.map((bookmark) => {
      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'drag-handle';
      action.title = 'Ziehen oder mit Pfeiltasten verschieben';
      action.setAttribute('aria-label', `${bookmark.name} verschieben. Ziehen oder Pfeiltasten nutzen.`);
      action.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v16M15 4v16" stroke-dasharray="1 4" stroke-width="3.5"/></svg>';
      const card = createBookmarkCard(bookmark, document.createElement('div'), action);
      card.classList.add('reordering');
      return card;
    });
    list.replaceChildren(...cards);
    empty.hidden = cards.length > 0;
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

  function clearDrag(): void {
    if (!drag) return;
    const { ghost } = drag;
    drag = null;
    if (frame !== undefined) window.cancelAnimationFrame(frame);
    frame = undefined;
    window.removeEventListener('pointermove', moveDrag);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', cancelDrag);
    ghost.remove();
  }

  function endDrag(event: PointerEvent): void {
    if (event.pointerId !== drag?.pointerId) return;
    clearDrag();

    const byId = new Map(store.items.map((bookmark) => [bookmark.id, bookmark]));
    const next = Array.from(list.querySelectorAll<HTMLLIElement>('li[data-bookmark-id]'))
      .map((item) => byId.get(item.dataset.bookmarkId ?? ''))
      .filter((bookmark) => bookmark !== undefined);
    if (next.length !== store.items.length || next.every((bookmark, index) => bookmark === store.items[index]) || !store.save(next)) {
      render();
    }
  }

  function cancelDrag(event: PointerEvent): void {
    if (event.pointerId === drag?.pointerId) render();
  }

  function findDraggedCard(target: EventTarget | null): HTMLLIElement | null {
    if (!(target instanceof Element)) return null;
    return target.closest('.drag-handle')?.closest<HTMLLIElement>('li[data-bookmark-id]') ?? null;
  }

  function startDrag(event: PointerEvent): void {
    if (drag || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
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
    if (drag || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    const item = findDraggedCard(event.target);
    if (!item) return;
    event.preventDefault();

    const index = store.items.findIndex(({ id }) => id === item.dataset.bookmarkId);
    const nextIndex = index + (event.key === 'ArrowUp' ? -1 : 1);
    const moved = store.items[index];
    if (!moved || nextIndex < 0 || nextIndex >= store.items.length) return;
    const next = store.items.slice();
    next.splice(index, 1);
    next.splice(nextIndex, 0, moved);
    if (!store.save(next)) return;
    list.children[nextIndex]?.querySelector('button')?.focus();
    announcer.textContent = `${moved.name}, Position ${nextIndex + 1} von ${next.length}`;
  }

  list.addEventListener('pointerdown', startDrag);
  list.addEventListener('keydown', keyboardReorder);
  return {
    root: element('reorderView', 'main'),
    render,
    leave() {
      clearDrag();
      announcer.textContent = '';
    },
  };
}
