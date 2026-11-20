import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBookmarkStore } from '../.local/test-build/bookmarks/store.js';
import { saveBookmark } from '../.local/test-build/bookmarks/operations.js';
import { storage } from '../.local/test-build/storage.js';

const prefix = 'donni-bookmark-';

// Interrupt each persistent step once, then reopen the store on the same browser data.
for (const [operation, key] of [
  ['set', 'pending-reset'], ['set', 'lesezeichen'],
  ...['darstellung', 'language', 'pin', 'last-export', 'last-change', 'pending-reset'].map(key => ['remove', key]),
]) {
  test(`reset recovers after ${operation} ${key} fails`, async t => {
    const data = new Map([['unrelated', 'keep']]);
    let interrupt = false;
    function write(action, name, value) {
      if (interrupt && action === operation && name === prefix + key) {
        interrupt = false;
        throw new Error('Storage unavailable');
      }
      if (action === 'set') data.set(name, value);
      else data.delete(name);
    }
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem: name => data.get(name) ?? null,
      setItem: (name, value) => write('set', name, value),
      removeItem: name => write('remove', name),
    } });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
      else delete globalThis.localStorage;
    });

    const adapter = { ...storage, withLibraryLock: async fn => fn(), onExternalChange() {} };
    const open = (report = assert.fail) => createBookmarkStore(report, () => {}, adapter);
    const original = saveBookmark({ bookmarks: [], labels: [] }, {
      name: 'Calendar', url: 'example.org', labels: [{ name: 'Work' }],
    }).library;
    adapter.write('bookmarks', JSON.stringify({ version: 3, ...original }));
    for (const setting of ['pin', 'language', 'appearance']) adapter.write(setting, 'saved');
    const issues = [];
    const store = open(issue => issues.push(issue));
    assert.equal(await store.reset(), false);
    adapter.recordExport(new Date(), adapter.lastChange());
    const initial = new Map(data);
    assert.equal(await store.reset('resume'), false);
    assert.deepEqual(data, initial);

    interrupt = true;
    assert.equal(await store.reset(), false);
    assert.deepEqual(issues, ['resetFailed']);
    const reopened = open();
    if (operation === 'set' && key === 'pending-reset') {
      assert.deepEqual(data, initial);
      assert.equal(await reopened.reset(), true);
    } else {
      assert.equal(adapter.hasPendingReset(), true);
      assert.throws(() => adapter.write('language', 'en'));
      assert.throws(() => adapter.recordExport(new Date(), adapter.lastChange()));
      const result = await reopened.importBackup(reopened.generation,
        saveBookmark(reopened.data, { name: 'Queued', url: 'example.net', labels: [] }).library);
      assert.deepEqual(result, { ok: false, issue: 'saveFailed' });
      const target = data.get(prefix + 'pending-reset');
      assert.equal(await reopened.reset('resume'), true);
      assert.equal(adapter.read('bookmarks'), target);
    }
    assert.ok(reopened.generation);
    assert.deepEqual(reopened.data, { bookmarks: [], labels: [] });
    assert.deepEqual([...data.keys()].sort(), [prefix + 'lesezeichen', 'unrelated']);
    assert.equal(adapter.hasCurrentBackup(), false);
    adapter.write('language', 'de');
    adapter.recordExport(new Date(), adapter.lastChange());
    assert.equal(await reopened.reset('resume'), false);
    assert.equal(adapter.read('language'), 'de');
  });
}
