import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseLibrary } from '../.local/test-build/bookmarks/model.js';
import { deleteBookmark, deleteLabel, saveBookmark, saveLabel } from '../.local/test-build/bookmarks/operations.js';
import { createBookmarkStore } from '../.local/test-build/bookmarks/store.js';

const empty = () => ({ bookmarks: [], labels: [] });
const bookmark = (name, labels = []) => ({ name, url: 'example.org', labels });
const label = name => ({ name, color: '#334455' });

function sharedStorage(initial = null) {
  let raw = initial;
  let queue = Promise.resolve();
  let backedUp = false;
  const listeners = [];
  const adapter = {
    read: () => raw,
    write(_, value) { raw = value; backedUp = false; },
    remove() { raw = null; backedUp = false; },
    withLibraryLock(operation) {
      const result = queue.then(operation);
      queue = result.catch(() => {});
      return result;
    },
    onExternalChange(_, listener) { listeners.push(listener); },
    hasCurrentBackup: () => backedUp,
    clearBackupHistory() { backedUp = false; },
  };
  return {
    adapter,
    open(onChange = () => {}, report = assert.fail) { return createBookmarkStore(report, onChange, adapter); },
    deliverEvents() { listeners.forEach(listener => listener()); },
    markExported() { backedUp = true; },
  };
}

test('independent writes from two tabs survive before any storage event is delivered', async () => {
  const disk = sharedStorage();
  let refreshes = 0;
  const a = disk.open(() => refreshes++);
  const b = disk.open();
  const results = await Promise.all([a, b].map((tab, i) =>
    tab.change(tab.generation, library => saveBookmark(library, bookmark(String(i), [{ name: 'Work' }])))));
  assert.ok(results.every(result => result.ok));
  const expected = parseLibrary(JSON.parse(b.exportBackup()));
  assert.deepEqual(expected.bookmarks.map(item => item.name), ['1', '0']);
  assert.equal(expected.labels.length, 1);
  assert.equal(a.data.bookmarks.length, 1);
  disk.deliverEvents();
  assert.deepEqual(a.data, expected);
  assert.equal(refreshes, 2);
});

test('stale edits and deletes cannot overwrite a changed or deleted item', async () => {
  const disk = sharedStorage();
  const a = disk.open();
  const original = (await a.change(a.generation, lib => saveBookmark(lib, bookmark('Old')))).value;
  const b = disk.open();
  const changed = (await b.change(b.generation, lib => saveBookmark(lib, bookmark('New'), original))).value;
  const conflict = { ok: false, issue: 'libraryConflict' };
  assert.deepEqual(await a.change(a.generation, lib => saveBookmark(lib, bookmark('Stale'), original)), conflict);
  assert.deepEqual(await a.change(a.generation, lib => deleteBookmark(lib, original)), conflict);
  await b.change(b.generation, lib => deleteBookmark(lib, changed));
  assert.deepEqual(await a.change(a.generation, lib => saveBookmark(lib, bookmark('Revived'), changed)), conflict);
  assert.equal(a.data.bookmarks.length, 0);
});

test('reset invalidates open editors and in-flight imports, even for an empty library', async () => {
  const disk = sharedStorage();
  const a = disk.open();
  const b = disk.open();
  const before = a.generation;
  const incoming = saveBookmark(empty(), bookmark('Old')).library;
  assert.equal(await b.reset(() => assert.fail('reset without current backup')), false);
  disk.markExported();
  assert.equal(await b.reset(() => true), true);
  assert.deepEqual(await a.importBackup(before, incoming), { ok: false, issue: 'libraryConflict' });
  assert.deepEqual(await a.change(before, lib => saveLabel(lib, label('Stale'))), { ok: false, issue: 'libraryConflict' });
  assert.deepEqual(a.data, empty());
  assert.equal(a.generation, b.generation);
  assert.equal((await a.importBackup(a.generation, incoming)).value.bookmarks, 1);
  assert.deepEqual((await b.importBackup(b.generation, incoming)).value, { bookmarks: 0, labels: 0 });
  assert.equal(Object.hasOwn(JSON.parse(b.exportBackup()), 'generation'), false);
});

test('reset rechecks its backup after earlier queued writes have completed', async () => {
  const disk = sharedStorage();
  const a = disk.open();
  const b = disk.open();
  disk.markExported();
  const saved = a.change(a.generation, lib => saveBookmark(lib, bookmark('Keep')));
  const reset = b.reset(() => assert.fail('backup was invalidated'));
  assert.ok((await saved).ok);
  assert.equal(await reset, false);
  assert.equal(JSON.parse(b.exportBackup()).bookmarks.length, 1);
});

test('label rules validate names, preserve IDs and update only affected bookmarks on deletion', () => {
  const initial = saveBookmark(empty(), bookmark(' First ', [{ name: 'Café' }, { name: 'CAFE\u0301' }]));
  const original = initial.library.labels[0];
  assert.equal(initial.value.name, 'First');
  assert.equal(initial.value.url, 'https://example.org/');
  assert.deepEqual(initial.value.labelIds, [original.id]);
  const unchanged = saveBookmark(initial.library, bookmark('First', [{ id: original.id }]), initial.value);
  assert.equal(unchanged.library, initial.library);
  assert.throws(() => saveLabel(initial.library, label('CAFE\u0301')), { issue: 'labelTaken' });
  assert.throws(() => saveLabel(initial.library, label(' ')), { issue: 'missingName' });
  assert.throws(() => saveLabel(initial.library, label('a\nb')), { issue: 'invalidLabel' });
  assert.throws(() => saveBookmark(initial.library, { ...bookmark('Bad'), url: '' }), { issue: 'invalidUrl' });
  const renamed = saveLabel(initial.library, label('Office'), original);
  assert.equal(renamed.value.id, original.id);
  assert.throws(() => deleteLabel(renamed.library, original), { issue: 'libraryConflict' });
  const other = saveBookmark(renamed.library, bookmark('Second'));
  const oldTime = '2000-01-01T00:00:00.000Z';
  const dated = { ...initial.value, updated: oldTime };
  const before = { ...other.library, bookmarks: [other.value, dated] };
  const after = deleteLabel(before, renamed.value).library;
  assert.equal(after.bookmarks[0], other.value);
  assert.deepEqual(after.bookmarks[1].labelIds, []);
  assert.notEqual(after.bookmarks[1].updated, oldTime);
  assert.deepEqual(dated.labelIds, [original.id]);
  assert.throws(() => saveBookmark(after, bookmark('Stale', [{ id: original.id }])), { issue: 'libraryConflict' });
});

test('the import parser and store reject an unsupported format without migrating it', () => {
  const data = { version: 2, labels: [], bookmarks: [] };
  assert.throws(() => parseLibrary(data));
  const raw = JSON.stringify(data);
  const disk = sharedStorage(raw);
  const issues = [];
  disk.open(undefined, issue => issues.push(issue));
  assert.deepEqual(issues, ['loadFailed']);
  assert.equal(disk.adapter.read('bookmarks'), raw);
});

test('a failed write or unreadable external change preserves the saved data', async () => {
  const disk = sharedStorage();
  const a = disk.open();
  const write = disk.adapter.write;
  disk.adapter.write = () => { throw Error('quota'); };
  assert.deepEqual(await a.change(a.generation, lib => saveBookmark(lib, bookmark('Retry'))),
    { ok: false, issue: 'saveFailed' });
  assert.deepEqual(a.data, empty());
  disk.adapter.write = write;
  assert.ok((await a.change(a.generation, lib => saveBookmark(lib, bookmark('Retry')))).ok);
  disk.adapter.write('bookmarks', 'broken');
  assert.deepEqual(await a.change(a.generation, lib => saveLabel(lib, label('Keep original'))),
    { ok: false, issue: 'loadFailed' });
  assert.equal(disk.adapter.read('bookmarks'), 'broken');
});
