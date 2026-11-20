import type { Bookmark } from './model.js';

export function filterBookmarks(
  bookmarks: readonly Bookmark[], search: string, labelId: string, locale: string,
): readonly Bookmark[] {
  const query = search.trim().toLocaleLowerCase(locale);
  if (!query && !labelId) return bookmarks;

  return bookmarks.filter(({ name, url, labelIds }) =>
    (!labelId || labelIds.includes(labelId))
    && (!query || `${name} ${url}`.toLocaleLowerCase(locale).includes(query)));
}
