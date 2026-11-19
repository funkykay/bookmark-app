import { messages } from '../i18n';
import { parseLibrary, serializeLibrary } from './model';
import type { Library } from './model';

const storageKey = 'donni-bookmark-lesezeichen';

export function createBookmarkStore(notify: (message: string) => void, onChange: () => void) {
  let data: Library = { bookmarks: [], labels: [] };
  let loadFailed = false;
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) {
      const saved = JSON.parse(stored);
      data = parseLibrary(saved);
      if (saved.version === 2) {
        try {
          localStorage.setItem(storageKey, serializeLibrary(data));
        } catch {
          notify(messages().saveFailed);
        }
      }
    }
  } catch {
    loadFailed = true;
    notify(messages().loadFailed);
  }

  function persist(next: Library): boolean {
    try {
      if (next.bookmarks.length || next.labels.length) localStorage.setItem(storageKey, serializeLibrary(next));
      else localStorage.removeItem(storageKey);
    } catch {
      notify(messages().saveFailed);
      return false;
    }
    data = next;
    loadFailed = false;
    onChange();
    return true;
  }

  return {
    get data(): Library { return data; },
    save(next: Library): boolean {
      if (loadFailed) {
        notify(messages().loadFailed);
        return false;
      }
      return persist(next);
    },
    clear() { return persist({ bookmarks: [], labels: [] }); },
  };
}

export type BookmarkStore = ReturnType<typeof createBookmarkStore>;
