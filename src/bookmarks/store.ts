import { messages } from '../i18n';
import { parseBookmarks, serializeBookmarks } from './model';
import type { Bookmark } from './model';

const storageKey = 'donni-lesezeichen-v2';

export function createBookmarkStore(notify: (message: string) => void, onChange: () => void) {
  let items: Bookmark[] = [];
  let loadFailed = false;
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) items = parseBookmarks(stored);
  } catch {
    loadFailed = true;
    notify(messages().loadFailed);
  }

  function persist(next: Bookmark[]): boolean {
    try {
      if (next.length) localStorage.setItem(storageKey, serializeBookmarks(next));
      else localStorage.removeItem(storageKey);
    } catch {
      notify(messages().saveFailed);
      return false;
    }
    items = next;
    loadFailed = false;
    onChange();
    return true;
  }

  return {
    get items(): readonly Bookmark[] { return items; },
    save(next: Bookmark[]): boolean {
      if (loadFailed) {
        notify(messages().loadFailed);
        return false;
      }
      return persist(next);
    },
    clear() { return persist([]); },
  };
}

export type BookmarkStore = ReturnType<typeof createBookmarkStore>;
