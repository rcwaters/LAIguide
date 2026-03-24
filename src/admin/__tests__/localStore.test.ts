import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLocalStore } from '../localStore';

function makeLocalStorageMock() {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
            store[key] = value;
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
}

const localStorageMock = makeLocalStorageMock();
vi.stubGlobal('localStorage', localStorageMock);

describe('createLocalStore', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    it('listMedKeys returns an array of strings', async () => {
        const store = createLocalStore();
        const keys = await store.listMedKeys();
        expect(Array.isArray(keys)).toBe(true);
        for (const k of keys) expect(typeof k).toBe('string');
    });

    it('getMed returns null for a key that does not exist', async () => {
        const store = createLocalStore();
        expect(await store.getMed('nonexistent_xyz')).toBeNull();
    });

    it('saveMed stores a med retrievable by getMed', async () => {
        const store = createLocalStore();
        const data = { displayName: 'Test Med', optgroupLabel: 'Test' };
        await store.saveMed('test_new', data);
        expect(await store.getMed('test_new')).toEqual(data);
    });

    it('saveMed overwrites an existing entry', async () => {
        const store = createLocalStore();
        await store.saveMed('my_med', { displayName: 'Original' });
        await store.saveMed('my_med', { displayName: 'Updated' });
        const result = (await store.getMed('my_med')) as Record<string, unknown>;
        expect(result.displayName).toBe('Updated');
    });

    it('listMedKeys includes a key after saveMed', async () => {
        const store = createLocalStore();
        await store.saveMed('brand_new', { displayName: 'New' });
        expect(await store.listMedKeys()).toContain('brand_new');
    });

    it('getAllMeds returns an array', async () => {
        const store = createLocalStore();
        expect(Array.isArray(await store.getAllMeds())).toBe(true);
    });

    it('getAllMeds includes data for a saved med', async () => {
        const store = createLocalStore();
        const data = { displayName: 'AllMedsTest' };
        await store.saveMed('all_meds_test', data);
        expect(await store.getAllMeds()).toContainEqual(data);
    });

    it('deleteMed removes the med from getMed', async () => {
        const store = createLocalStore();
        await store.saveMed('to_delete', { displayName: 'DeleteMe' });
        await store.deleteMed('to_delete');
        expect(await store.getMed('to_delete')).toBeNull();
    });

    it('deleteMed removes the key from listMedKeys', async () => {
        const store = createLocalStore();
        await store.saveMed('to_remove', { displayName: 'Remove' });
        await store.deleteMed('to_remove');
        expect(await store.listMedKeys()).not.toContain('to_remove');
    });

    it('deleteMed throws for a key that does not exist', async () => {
        const store = createLocalStore();
        await expect(store.deleteMed('never_existed')).rejects.toThrow(
            '"never_existed" not found.',
        );
    });

    it('stores created at the same time have independent in-memory state', async () => {
        const storeA = createLocalStore();
        const storeB = createLocalStore();
        await storeA.saveMed('only_in_a', { displayName: 'A only' });
        expect(await storeB.getMed('only_in_a')).toBeNull();
    });

    it('med saved by one instance is visible to a new instance created afterwards', async () => {
        const storeA = createLocalStore();
        await storeA.saveMed('persisted_med', { displayName: 'Persisted' });

        const storeB = createLocalStore();
        expect(await storeB.getMed('persisted_med')).toEqual({ displayName: 'Persisted' });
    });

    it('deleted med is absent from a new instance created afterwards', async () => {
        const storeA = createLocalStore();
        await storeA.saveMed('temp_med', { displayName: 'Temp' });

        const storeB = createLocalStore();
        await storeB.deleteMed('temp_med');

        const storeC = createLocalStore();
        expect(await storeC.getMed('temp_med')).toBeNull();
    });
});
