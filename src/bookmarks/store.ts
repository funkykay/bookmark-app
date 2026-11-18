import { loadBookmarks, saveBookmarks } from './model';
import type { Bookmark } from './model';

export function createBookmarkStore(notify: (message: string) => void, onChange: () => void) {
  let items: Bookmark[] = [];
  try {
    items = loadBookmarks();
  } catch {
    notify('Lokale Speicherung ist in diesem Modus gesperrt.');
  }

  return {
    get items(): readonly Bookmark[] { return items; },
    save(next: Bookmark[]): boolean {
      try {
        saveBookmarks(next);
      } catch {
        notify('Speichern nicht möglich. Bitte die Browser-Einstellungen prüfen.');
        return false;
      }
      items = next;
      onChange();
      return true;
    },
  };
}

export type BookmarkStore = ReturnType<typeof createBookmarkStore>;
