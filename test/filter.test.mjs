import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterBookmarks } from '../.local/test-build/bookmarks/filter.js';

const bookmarks = [
  { id: 'a', name: 'API Guide', url: 'https://docs.example.org/', labelIds: ['work', 'read'] },
  { id: 'b', name: 'Examples', url: 'https://example.org/API', labelIds: ['read'] },
  { id: 'c', name: 'Notes', url: 'https://notes.example.org/', labelIds: [] },
];

test('blank search keeps the library order and can still filter by label', () => {
  assert.deepEqual(filterBookmarks(bookmarks, '  ', '', 'de'), bookmarks);
  assert.deepEqual(filterBookmarks(bookmarks, '', 'read', 'de'), bookmarks.slice(0, 2));
  assert.deepEqual(filterBookmarks([], '', '', 'de'), []);
});

test('search matches name or URL and intersects with the selected label', () => {
  assert.deepEqual(filterBookmarks(bookmarks, ' aPi ', '', 'en'), bookmarks.slice(0, 2));
  assert.deepEqual(filterBookmarks(bookmarks, 'API', 'work', 'de'), [bookmarks[0]]);
  assert.deepEqual(filterBookmarks(bookmarks, 'notes', 'read', 'de'), []);
  assert.deepEqual(filterBookmarks(bookmarks, 'work', '', 'de'), []);
});

test('case folding uses the supplied locale', () => {
  assert.deepEqual(filterBookmarks(bookmarks, 'apı', '', 'tr'), bookmarks.slice(0, 2));
  assert.deepEqual(filterBookmarks(bookmarks, 'apı', '', 'en'), []);
});
