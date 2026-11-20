import { createBookmarkCard } from './card';
import type { Bookmark, Label } from './model';

export function createBookmarkList(list: HTMLUListElement, onEdit: (id: string) => void) {
  const cards = new Map<string, ReturnType<typeof createBookmarkCard>>();

  return {
    // Filtered-out cards can be reused until the bookmark leaves the library.
    retain(bookmarks: readonly Bookmark[]) {
      const ids = new Set(bookmarks.map(bookmark => bookmark.id));
      for (const id of cards.keys()) {
        if (!ids.has(id)) cards.delete(id);
      }
    },

    render(visible: readonly Bookmark[], labels: ReadonlyMap<string, Label>) {
      const nodes = visible.map(bookmark => {
        let card = cards.get(bookmark.id);
        if (!card) {
          card = createBookmarkCard(bookmark.id, onEdit);
          cards.set(bookmark.id, card);
        }
        card.update(bookmark, labels);
        return card.element;
      });

      // Remove nonmatches first so their surviving neighbours stay in place.
      const wanted = new Set<Element>(nodes);
      for (const child of Array.from(list.children)) {
        if (!wanted.has(child)) child.remove();
      }
      let cursor = list.firstElementChild;
      for (const node of nodes) {
        if (node === cursor) cursor = node.nextElementSibling;
        else list.insertBefore(node, cursor);
      }
    },
  };
}
