import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLocalStore } from '../localStore';
import type { ChangelogEntry } from '../types';

// localStore uses localStorage which is not available in the node test environment.
// Provide a simple in-memory shim so tests remain fast and self-contained.
function makeLocalStorageMock() {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
    };
}

const localStorageMock = makeLocalStorageMock();
vi.stubGlobal('localStorage', localStorageMock);

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
    beforeEach(() => {
        localStorageMock.clear();
    });

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

    it('changelog persists across separate createLocalStore instances', async () => {
        const storeA = createLocalStore();
        await storeA.appendChangelog(makeEntry({ displayName: 'From A' }));

        const storeB = createLocalStore();
        const entries = await storeB.getChangelog();
        expect(entries).toHaveLength(1);
        expect(entries[0].displayName).toBe('From A');
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

    it('handles corrupted localStorage data gracefully', async () => {
        localStorageMock.setItem('lai_local_changelog', 'not valid json{{{');
        const store = createLocalStore();
        expect(await store.getChangelog()).toEqual([]);
    });

    it('preserves changes array on update entries', async () => {
        const store = createLocalStore();
        const entry = makeEntry({
            action: 'update',
            changes: [
                { path: 'displayName', from: 'Old Name', to: 'New Name' },
                { path: 'guidance.late.variants', from: '["initiation"]', to: '["maintenance"]' },
            ],
        });
        await store.appendChangelog(entry);
        const [saved] = await store.getChangelog();
        expect(saved.changes).toHaveLength(2);
        expect(saved.changes![0]).toEqual({ path: 'displayName', from: 'Old Name', to: 'New Name' });
    });

    it('preserves snapshot on update entries', async () => {
        const store = createLocalStore();
        const snapshot = { displayName: 'Test Med', optgroupLabel: 'Antipsychotics', guidance: {} };
        const entry = makeEntry({ snapshot });
        await store.appendChangelog(entry);
        const [saved] = await store.getChangelog();
        expect(saved.snapshot).toEqual(snapshot);
    });

    it('stores and retrieves restore action entries', async () => {
        const store = createLocalStore();
        const entry = makeEntry({
            action: 'restore',
            medKey: '*',
            displayName: 'All medications (3 restored)',
            restoreTarget: '2026-01-10T08:00:00.000Z',
        });
        await store.appendChangelog(entry);
        const [saved] = await store.getChangelog();
        expect(saved.action).toBe('restore');
        expect(saved.restoreTarget).toBe('2026-01-10T08:00:00.000Z');
        expect(saved.displayName).toBe('All medications (3 restored)');
    });

    it('stores restore entry with __default__ restoreTarget', async () => {
        const store = createLocalStore();
        const entry = makeEntry({
            action: 'restore',
            medKey: '*',
            displayName: 'All medications (5 restored)',
            restoreTarget: '__default__',
        });
        await store.appendChangelog(entry);
        const [saved] = await store.getChangelog();
        expect(saved.restoreTarget).toBe('__default__');
    });

    it('restore entry appears before earlier update entry (newest-first)', async () => {
        const store = createLocalStore();
        await store.appendChangelog(makeEntry({ action: 'update', displayName: 'First Save' }));
        await store.appendChangelog(makeEntry({ action: 'restore', medKey: '*', displayName: 'Restore Op' }));
        const entries = await store.getChangelog();
        expect(entries[0].action).toBe('restore');
        expect(entries[1].action).toBe('update');
    });
});
