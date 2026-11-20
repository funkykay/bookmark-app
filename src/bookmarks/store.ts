import { createId, mergeLibrary, parseLibrary, serializeLibrary } from './model.js';
import type { Library } from './model.js';
import { LibraryError } from './operations.js';
import type { Change, LibraryIssue } from './operations.js';
import { storage } from '../storage.js';

export type WriteIssue = LibraryIssue | 'saveFailed' | 'loadFailed' | 'resetFailed';
export type WriteResult<T> = { ok: true; value: T } | { ok: false; issue: WriteIssue };

export function createBookmarkStore(report: (issue: WriteIssue) => void, onChange: () => void, adapter = storage) {
  let data: Library = { bookmarks: [], labels: [] };
  let generation: string | undefined;
  let raw: string | null | undefined;

  function load(): void {
    const stored = adapter.read('bookmarks');
    if (stored === raw) return;
    const saved = stored === null ? null : JSON.parse(stored);
    data = stored === null ? { bookmarks: [], labels: [] } : parseLibrary(saved);
    generation = typeof saved?.generation === 'string' ? saved.generation : undefined;
    raw = stored;
  }

  function persist(next: Library): void {
    const stored = serializeLibrary(next, generation);
    adapter.write('bookmarks', stored);
    raw = stored;
    data = next;
  }

  try {
    load();
  } catch {
    report('loadFailed');
  }

  function refresh(): void {
    const before = data;
    try {
      load();
    } catch {
      report('loadFailed');
    }
    if (before !== data) onChange();
  }
  adapter.onExternalChange('bookmarks', refresh);

  async function change<T>(expectedGeneration: string | undefined, operation: (latest: Library) => Change<T>): Promise<WriteResult<T>> {
    try {
      return await adapter.withLibraryLock((): WriteResult<T> => {
        const before = data;
        try {
          try {
            load();
          } catch {
            return { ok: false, issue: 'loadFailed' };
          }
          if (expectedGeneration !== generation) throw new LibraryError('libraryConflict');
          const { library, value } = operation(data);
          if (library !== data) persist(library);
          return { ok: true, value };
        } finally {
          if (before !== data) onChange();
        }
      });
    } catch (error) {
      return { ok: false, issue: error instanceof LibraryError ? error.issue : 'saveFailed' };
    }
  }

  return {
    get data(): Library { return data; },
    // Editors and imports capture this when they start. A reset invalidates them even if the library was empty.
    get generation() { return generation; },
    change,
    exportBackup(): string {
      const stored = adapter.read('bookmarks');
      return serializeLibrary(stored === null ? { bookmarks: [], labels: [] } : parseLibrary(JSON.parse(stored)));
    },
    importBackup(expectedGeneration: string | undefined, incoming: Library) {
      return change(expectedGeneration, latest => {
        const merged = mergeLibrary(latest, incoming);
        const bookmarks = merged.bookmarks.length - latest.bookmarks.length;
        const labels = merged.labels.length - latest.labels.length;
        return { library: bookmarks || labels ? merged : latest, value: { bookmarks, labels } };
      });
    },
    async reset(mode: 'start' | 'resume' = 'start'): Promise<boolean> {
      try {
        const target = mode === 'start' ? serializeLibrary({ bookmarks: [], labels: [] }, createId()) : undefined;
        return await adapter.resetApp(target);
      } catch {
        report('resetFailed');
        return false;
      } finally {
        refresh();
      }
    },
  };
}

export type BookmarkStore = ReturnType<typeof createBookmarkStore>;
