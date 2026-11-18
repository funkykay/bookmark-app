export interface Bookmark {
  id: string;
  name: string;
  url: string;
  creation: string;
  updated: string;
}

export const maxNameLength = 100;
const formatVersion = 2;

export function createId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
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

function parseBookmark(input: unknown): Bookmark {
  if (typeof input !== 'object' || input === null) throw new Error('Ungültiges Lesezeichen');
  if (!('id' in input) || typeof input.id !== 'string' || !/^[a-f0-9]{32}$/.test(input.id)) {
    throw new Error('Ungültige Lesezeichen-ID');
  }
  if (!('name' in input) || typeof input.name !== 'string' || !input.name
    || input.name !== input.name.trim() || input.name.length > maxNameLength) {
    throw new Error('Ungültiger Lesezeichenname');
  }
  if (!('url' in input) || typeof input.url !== 'string' || normalizeUrl(input.url) !== input.url) {
    throw new Error('Ungültige Lesezeichen-URL');
  }
  if (!('creation' in input) || !isTimestamp(input.creation)
    || !('updated' in input) || !isTimestamp(input.updated)) {
    throw new Error('Ungültiger Lesezeichen-Zeitstempel');
  }
  const { id, name, url, creation, updated } = input;
  return { id, name, url, creation, updated };
}

export function serializeBookmarks(bookmarks: readonly Bookmark[]): string {
  return JSON.stringify({ version: formatVersion, bookmarks }, null, 2);
}

export function parseBookmarks(text: string): Bookmark[] {
  const data: unknown = JSON.parse(text);
  if (typeof data !== 'object' || data === null || !('version' in data) || data.version !== formatVersion
    || !('bookmarks' in data) || !Array.isArray(data.bookmarks)) {
    throw new Error('Ungültiges Lesezeichenformat');
  }
  const ids = new Set<string>();
  return data.bookmarks.map((input: unknown) => {
    const bookmark = parseBookmark(input);
    if (ids.has(bookmark.id)) throw new Error('Doppelte Lesezeichen-ID');
    ids.add(bookmark.id);
    return bookmark;
  });
}
