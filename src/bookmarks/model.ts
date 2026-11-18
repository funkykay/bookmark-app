export interface Bookmark {
  id: string;
  name: string;
  url: string;
  creation: string;
  updated: string;
}

const storageKey = 'donni-lesezeichen-v1';
export const maxNameLength = 100;

export function createId(): string {
  return crypto.randomUUID?.() ?? crypto.getRandomValues(new Uint32Array(4)).join('-');
}

export function normalizeUrl(input: string): string | null {
  const text = input.trim();
  if (!text) return null;

  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname ? url.href : null;
  } catch {
    return null;
  }
}

export function hostname(url: string): string {
  return new URL(url).hostname.replace(/^www\./i, '');
}

function isTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

function parseEntry(input: unknown): Bookmark | null {
  if (typeof input !== 'object' || input === null || !('url' in input) || typeof input.url !== 'string') return null;
  if (!('creation' in input) || !isTimestamp(input.creation)) return null;
  if (!('updated' in input) || !isTimestamp(input.updated)) return null;

  const url = normalizeUrl(input.url);
  if (!url) return null;

  const name = 'name' in input && typeof input.name === 'string' ? input.name.trim().slice(0, maxNameLength) : '';
  const id = 'id' in input && typeof input.id === 'string' && input.id ? input.id : createId();
  return { id, name: name || hostname(url), url, creation: input.creation, updated: input.updated };
}

function parseEntries(input: unknown[]): Bookmark[] {
  return input.map(parseEntry).filter((entry) => entry !== null);
}

export function loadBookmarks(): Bookmark[] {
  const stored = localStorage.getItem(storageKey);
  if (stored === null) return [];

  let data: unknown;
  try {
    data = JSON.parse(stored);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  const ids = new Set<string>();
  return parseEntries(data).map((entry) => {
    const id = ids.has(entry.id) ? createId() : entry.id;
    ids.add(id);
    return { ...entry, id };
  });
}

export function saveBookmarks(bookmarks: readonly Bookmark[]): void {
  if (bookmarks.length) localStorage.setItem(storageKey, JSON.stringify(bookmarks));
  else localStorage.removeItem(storageKey);
}

export function parseImport(text: string): Bookmark[] {
  const data: unknown = JSON.parse(text);
  if (typeof data !== 'object' || data === null || !('bookmarks' in data) || !Array.isArray(data.bookmarks)) {
    throw new Error('Ungültiges Lesezeichenformat');
  }
  const entries = data.bookmarks;

  const bookmarks = parseEntries(entries);
  if (entries.length && !bookmarks.length) throw new Error('Keine gültigen Lesezeichen in der Datei');
  return bookmarks;
}
