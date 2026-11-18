import { messages } from '../i18n';
import { loadBookmarks, saveBookmarks } from './model';
import type { Bookmark } from './model';

export function createBookmarkStore(notify: (message: string) => void, onChange: () => void) {
  let items: Bookmark[] = [];
  try {
    items = loadBookmarks();
  } catch {
    notify(messages().storageBlocked);
  }

  return {
    get items(): readonly Bookmark[] { return items; },
    save(next: Bookmark[]): boolean {
      try {
        saveBookmarks(next);
      } catch {
        notify(messages().saveFailed);
        return false;
      }
      items = next;
      onChange();
      return true;
    },
  };
}

export type BookmarkStore = ReturnType<typeof createBookmarkStore>;
