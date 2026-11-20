import { createId, isLabelColor, isLabelName, labelKey, maxNameLength, newLabel, normalizeUrl } from './model.js';
import type { Bookmark, Label, Library } from './model.js';

export type LibraryIssue = 'missingName' | 'invalidUrl' | 'labelTaken' | 'invalidLabel' | 'libraryConflict';

export class LibraryError extends Error {
  readonly issue: LibraryIssue;

  constructor(issue: LibraryIssue) {
    super(issue);
    this.issue = issue;
  }
}

export interface Change<T> {
  library: Library;
  value: T;
}

export interface BookmarkInput {
  name: string;
  url: string;
  labels: readonly ({ id: string } | { name: string })[];
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

function checkBookmark(library: Library, original: Bookmark): void {
  const current = library.bookmarks.find(item => item.id === original.id);
  if (!current || current.name !== original.name || current.url !== original.url
    || current.creation !== original.creation || current.updated !== original.updated
    || !sameIds(current.labelIds, original.labelIds)) throw new LibraryError('libraryConflict');
}

function checkLabel(library: Library, original: Label): void {
  const current = library.labels.find(item => item.id === original.id);
  if (!current || current.name !== original.name || current.color !== original.color) throw new LibraryError('libraryConflict');
}

function labelName(input: string): string {
  const name = input.trim();
  if (!name) throw new LibraryError('missingName');
  if (!isLabelName(name)) throw new LibraryError('invalidLabel');
  return name;
}

export function saveBookmark(library: Library, input: BookmarkInput, original?: Bookmark): Change<Bookmark> {
  if (original) checkBookmark(library, original);
  const name = input.name.trim().slice(0, maxNameLength);
  if (!name) throw new LibraryError('missingName');
  const url = normalizeUrl(input.url);
  if (!url) throw new LibraryError('invalidUrl');

  const labels = [...library.labels];
  const assigned = new Set<string>();
  for (const choice of input.labels) {
    if ('id' in choice) {
      if (!labels.some(label => label.id === choice.id)) throw new LibraryError('libraryConflict');
      assigned.add(choice.id);
    } else {
      const name = labelName(choice.name);
      const key = labelKey(name);
      let label = labels.find(item => labelKey(item.name) === key);
      if (!label) {
        label = newLabel(name);
        labels.push(label);
      }
      assigned.add(label.id);
    }
  }
  const labelIds = [...assigned];
  if (original && original.name === name && original.url === url && sameIds(original.labelIds, labelIds)) {
    return { library, value: original };
  }
  const now = new Date().toISOString();
  const bookmark = { id: original?.id ?? createId(), creation: original?.creation ?? now, name, url, labelIds, updated: now };
  const bookmarks = original
    ? library.bookmarks.map(item => item.id === original.id ? bookmark : item)
    : [bookmark, ...library.bookmarks];
  return { library: { bookmarks, labels }, value: bookmark };
}

export function deleteBookmark(library: Library, original: Bookmark): Change<void> {
  checkBookmark(library, original);
  return { library: { ...library, bookmarks: library.bookmarks.filter(item => item.id !== original.id) }, value: undefined };
}

export function saveLabel(library: Library, input: Pick<Label, 'name' | 'color'>, original?: Label): Change<Label> {
  if (original) checkLabel(library, original);
  const name = labelName(input.name);
  if (!isLabelColor(input.color)) throw new LibraryError('invalidLabel');
  const key = labelKey(name);
  if (library.labels.some(item => item.id !== original?.id && labelKey(item.name) === key)) throw new LibraryError('labelTaken');
  if (original?.name === name && original.color === input.color) return { library, value: original };
  const label = { id: original?.id ?? createId(), name, color: input.color };
  const labels = original
    ? library.labels.map(item => item.id === original.id ? label : item)
    : [...library.labels, label];
  return { library: { ...library, labels }, value: label };
}

export function deleteLabel(library: Library, original: Label): Change<void> {
  checkLabel(library, original);
  const updated = new Date().toISOString();
  const labels = library.labels.filter(item => item.id !== original.id);
  const bookmarks = library.bookmarks.map(item => item.labelIds.includes(original.id)
    ? { ...item, labelIds: item.labelIds.filter(id => id !== original.id), updated }
    : item);
  return { library: { labels, bookmarks }, value: undefined };
}
