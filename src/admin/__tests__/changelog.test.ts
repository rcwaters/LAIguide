import { describe, it, expect } from 'vitest';
import { createLocalStore } from '../localStore';
import type { ChangelogEntry } from '../types';

function makeEntry(overrides: Partial<ChangelogEntry> = {}): ChangelogEntry {
    return {
        timestamp: '2026-01-15T10:00:00.000Z',
        email: 'user@desc.org',
        action: 'update',
        medKey: 'test_med',
        displayName: 'Test Med',
        ...overrides,
    };
}

describe('localStore — changelog', () => {
    it('getChangelog returns an empty array initially', async () => {
        const store = createLocalStore();
        expect(await store.getChangelog()).toEqual([]);
    });

    it('appendChangelog adds an entry retrievable via getChangelog', async () => {
        const store = createLocalStore();
        const entry = makeEntry();
        await store.appendChangelog(entry);
        const entries = await store.getChangelog();
        expect(entries).toHaveLength(1);
        expect(entries[0]).toEqual(entry);
    });

    it('entries are stored newest-first (unshift order)', async () => {
        const store = createLocalStore();
        const first = makeEntry({ timestamp: '2026-01-01T00:00:00.000Z', displayName: 'First' });
        const second = makeEntry({ timestamp: '2026-01-02T00:00:00.000Z', displayName: 'Second' });
        await store.appendChangelog(first);
        await store.appendChangelog(second);
        const entries = await store.getChangelog();
        expect(entries[0].displayName).toBe('Second');
        expect(entries[1].displayName).toBe('First');
    });

    it('getChangelog returns a copy — mutations do not affect the store', async () => {
        const store = createLocalStore();
        await store.appendChangelog(makeEntry());
        const entries = await store.getChangelog();
        entries.push(makeEntry({ displayName: 'Injected' }));
        expect(await store.getChangelog()).toHaveLength(1);
    });

    it('stores from separate createLocalStore calls have independent changelogs', async () => {
        const storeA = createLocalStore();
        const storeB = createLocalStore();
        await storeA.appendChangelog(makeEntry());
        expect(await storeB.getChangelog()).toHaveLength(0);
    });

    it('preserves all entry fields exactly', async () => {
        const store = createLocalStore();
        const entry = makeEntry({ action: 'delete', medKey: 'abilify_maintena', displayName: 'Abilify Maintena' });
        await store.appendChangelog(entry);
        expect(await store.getChangelog()).toContainEqual(entry);
    });

    it('supports multiple entries of different actions', async () => {
        const store = createLocalStore();
        await store.appendChangelog(makeEntry({ action: 'update', medKey: 'med_a' }));
        await store.appendChangelog(makeEntry({ action: 'delete', medKey: 'med_b' }));
        const entries = await store.getChangelog();
        expect(entries).toHaveLength(2);
        expect(entries.map((e) => e.action)).toContain('update');
        expect(entries.map((e) => e.action)).toContain('delete');
    });
});
