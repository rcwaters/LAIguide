import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MED_REGISTRY } from '../index';

const EXPECTED_KEYS = [
    'abilify_maintena',
    'aristada',
    'brixadi',
    'fluphenazine_decanoate',
    'haloperidol_decanoate',
    'invega_hafyera',
    'invega_sustenna',
    'invega_trinza',
    'sublocade',
    'uzedy',
    'vivitrol',
] as const;

describe('MED_REGISTRY — index', () => {
    it('contains exactly the expected medication keys', () => {
        expect(Object.keys(MED_REGISTRY).sort()).toEqual([...EXPECTED_KEYS].sort());
    });

    it('skip guard: definitions.json (no key/guidance) is not included', () => {
        expect('definitions' in MED_REGISTRY).toBe(false);
    });

    it('every entry has a displayName string', () => {
        for (const key of EXPECTED_KEYS) {
            expect(typeof MED_REGISTRY[key].displayName).toBe('string');
            expect(MED_REGISTRY[key].displayName.length).toBeGreaterThan(0);
        }
    });

    it('every entry has a getLateGuidance function', () => {
        for (const key of EXPECTED_KEYS) {
            expect(typeof MED_REGISTRY[key].getLateGuidance).toBe('function');
        }
    });

    it('every entry has a validateLate function', () => {
        for (const key of EXPECTED_KEYS) {
            expect(typeof MED_REGISTRY[key].validateLate).toBe('function');
        }
    });

    it('every entry has a buildLateParams function', () => {
        for (const key of EXPECTED_KEYS) {
            expect(typeof MED_REGISTRY[key].buildLateParams).toBe('function');
        }
    });

    it('every entry has a non-empty earlyGuidance string', () => {
        for (const key of EXPECTED_KEYS) {
            expect(typeof MED_REGISTRY[key].earlyGuidance).toBe('string');
            expect(MED_REGISTRY[key].earlyGuidance.length).toBeGreaterThan(0);
        }
    });
});

// ─── tryBuild / localStorageOverrides (via module re-initialisation) ───────

describe('MED_REGISTRY — localStorage overrides', () => {
    function makeLocalStorageMock() {
        let store: Record<string, string> = {};
        return {
            getItem: (key: string) => store[key] ?? null,
            setItem: (key: string, value: string) => { store[key] = value; },
            removeItem: (key: string) => { delete store[key]; },
            clear: () => { store = {}; },
        };
    }

    const lsMock = makeLocalStorageMock();

    beforeEach(() => {
        lsMock.clear();
        vi.stubGlobal('localStorage', lsMock);
        vi.resetModules();
    });

    it('returns the standard registry when localStorage is empty', async () => {
        const { MED_REGISTRY: reg } = await import('../index');
        expect(Object.keys(reg).sort()).toEqual([...EXPECTED_KEYS].sort());
    });

    it('overrides displayName of an existing med from localStorage', async () => {
        // Grab the full abilify_maintena JSON from the bundled module to use as a base
        const { MED_REGISTRY: base } = await import('../index');
        vi.resetModules();

        // We just need any valid med JSON — use one already in the registry's source files
        // by reading it via import. The simplest valid override is one that keeps guidance intact.
        const raw = await import('../../meds/abilify_maintena.json', { assert: { type: 'json' } });
        const overridden = { ...raw.default, displayName: 'OVERRIDE NAME' };
        lsMock.setItem('lai_local_meds', JSON.stringify({ abilify_maintena: overridden }));

        const { MED_REGISTRY: reg } = await import('../index');
        expect(reg.abilify_maintena.displayName).toBe('OVERRIDE NAME');
        // Original should be different
        expect(base.abilify_maintena.displayName).not.toBe('OVERRIDE NAME');
    });

    it('ignores localStorage entries without a guidance field', async () => {
        lsMock.setItem('lai_local_meds', JSON.stringify({
            fake_med: { displayName: 'No Guidance Med' }, // no guidance field
        }));
        const { MED_REGISTRY: reg } = await import('../index');
        expect('fake_med' in reg).toBe(false);
    });

    it('ignores corrupted localStorage data and falls back to bundled JSON', async () => {
        lsMock.setItem('lai_local_meds', 'not valid json {{{');
        const { MED_REGISTRY: reg } = await import('../index');
        expect(Object.keys(reg).sort()).toEqual([...EXPECTED_KEYS].sort());
    });
});
