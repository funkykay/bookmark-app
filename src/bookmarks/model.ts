export interface Bookmark {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly labelIds: readonly string[];
  readonly creation: string;
  readonly updated: string;
}

export interface Label {
  readonly id: string;
  readonly name: string;
  readonly color: string;
}

export interface Library {
  readonly bookmarks: readonly Bookmark[];
  readonly labels: readonly Label[];
}

export const maxNameLength = 100;
export const maxLabelLength = 40;
export const defaultLabelColor = '#738399';

export function labelKey(name: string): string {
  return name.trim().normalize('NFC').toLowerCase();
}

export function newLabel(name: string): Label {
  return { id: createId(), name: name.trim(), color: defaultLabelColor };
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);
}

function isName(value: unknown, limit: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= limit && value === value.trim();
}

export function isLabelName(value: unknown): value is string {
  return isName(value, maxLabelLength) && !/[\r\n]/.test(value);
}

export function isLabelColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

function parseLabel(input: unknown): Label {
  if (!isRecord(input) || !isId(input.id) || !isLabelName(input.name)
    || !isLabelColor(input.color)) {
    throw new Error('Ungültiges Label');
  }
  return { id: input.id, name: input.name, color: input.color };
}

export function serializeLibrary({ bookmarks, labels }: Library, generation?: string): string {
  return JSON.stringify({ version: 3, generation, labels, bookmarks }, null, 2);
}

export function parseLibrary(data: unknown): Library {
  if (!isRecord(data) || data.version !== 3 || !Array.isArray(data.bookmarks)) {
    throw new Error('Ungültiges Lesezeichenformat');
  }
  if (!Array.isArray(data.labels)) throw new Error('Fehlende Labels');
  const labels: Label[] = data.labels.map(parseLabel);
  const labelIds = new Set(labels.map(label => label.id));
  const names = new Set(labels.map(label => labelKey(label.name)));
  if (labels.length !== labelIds.size || labels.length !== names.size) throw new Error('Doppeltes Label');

  const ids = new Set<string>();
  const bookmarks = data.bookmarks.map((input: unknown): Bookmark => {
    if (!isRecord(input) || !isId(input.id) || ids.has(input.id) || !isName(input.name, maxNameLength)
      || typeof input.url !== 'string' || normalizeUrl(input.url) !== input.url
      || !isTimestamp(input.creation) || !isTimestamp(input.updated)) throw new Error('Ungültiges Lesezeichen');
    ids.add(input.id);
    const { id, name, url, creation, updated } = input;
    const refs = input.labelIds;
    if (!Array.isArray(refs) || !refs.every(ref => isId(ref) && labelIds.has(ref))
      || new Set(refs).size !== refs.length) throw new Error('Ungültige Label-Zuordnung');
    return { id, name, url, creation, updated, labelIds: refs };
  });
  return { bookmarks, labels };
}

export function mergeLibrary(local: Library, incoming: Library): Library {
  const labels = [...local.labels];
  const byId = new Map(local.labels.map(label => [label.id, label]));
  const byName = new Map(local.labels.map(label => [labelKey(label.name), label]));
  const mappedIds = new Map<string, string>();
  for (const label of incoming.labels) {
    const existing = byId.get(label.id) ?? byName.get(labelKey(label.name));
    mappedIds.set(label.id, existing?.id ?? label.id);
    if (!existing) labels.push(label);
  }
  const known = new Set(local.bookmarks.map(bookmark => bookmark.id));
  const fresh = incoming.bookmarks.filter(bookmark => !known.has(bookmark.id)).map(bookmark => ({
    ...bookmark,
    labelIds: [...new Set(bookmark.labelIds.map(id => mappedIds.get(id)!))],
  }));
  return { labels, bookmarks: [...fresh, ...local.bookmarks] };
}
